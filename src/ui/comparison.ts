// ------------------------------------------------------------------
// comparison.ts - השוואת עד שלושה רכבים. מסקנה מאוזנת; לא מכריזים
// "מנצח" כאשר הפער קטן מהספים ב-config.
// ------------------------------------------------------------------

import { el } from "./dom";
import { STRINGS } from "../strings";
import { CAR_COLORS } from "../config";
import { getState, setState, addCar } from "../state/store";
import { computeCarResult } from "../calc/totals";
import { compareResults, findDivergentCategory } from "../compare/compare";
import { formatCurrency, formatCurrencyPrecise } from "../format/format";
import { carDisplayName } from "../state/defaults";
import type { CarResult, CategoryKey } from "../types";

type Metric = { label: string; get: (r: CarResult) => number; precise?: boolean };

const METRICS: Metric[] = [
  { label: STRINGS.comparison.rows.purchase, get: (r) => r.input.purchasePrice },
  { label: STRINGS.comparison.rows.total, get: (r) => r.economicTotal },
  { label: STRINGS.comparison.rows.monthly, get: (r) => r.economicMonthly },
  { label: STRINGS.comparison.rows.perKm, get: (r) => r.costPerKm, precise: true },
  { label: STRINGS.comparison.rows.energy, get: (r) => r.energyTotal },
  { label: STRINGS.comparison.rows.financing, get: (r) => r.financing.interestDuringHolding },
];

function divergenceNote(results: CarResult[]): HTMLElement | null {
  const d = findDivergentCategory(results);
  if (!d) return null;
  const msg = STRINGS.comparison.divergence(
    STRINGS.categories[d.key],
    d.highName,
    d.lowName,
    formatCurrency(d.gapTotal),
    formatCurrency(d.gapMonthly)
  );
  return el("p", { class: "verdict__note" }, msg);
}

/**
 * טבלת פירוט קטגוריות מלאה, רכב לצד רכב - נעשה בה שימוש חוזר גם ב-results.ts
 * (בתוך "אני רוצה לראות פירוט", כשיש 2+ רכבים בהשוואה, במקום פירוט של רכב יחיד).
 * מסמן באדום את הרכב היקר יותר בכל שורה/קטגוריה.
 */
export function categoryBreakdownTable(results: CarResult[]): HTMLElement {
  const categoryKeys = results[0].categories.map((c) => c.key).filter((k) => k !== "purchase") as CategoryKey[];

  const headerRow = el(
    "tr",
    {},
    el("th", { scope: "col" }, ""),
    ...results.map((r, i) =>
      el(
        "th",
        { scope: "col" },
        el("span", { class: "compare__dot", style: { background: CAR_COLORS[i % CAR_COLORS.length] }, "aria-hidden": "true" }),
        carDisplayName(r.input, `רכב ${i + 1}`)
      )
    )
  );

  const bodyRows = categoryKeys.map((key) => {
    const values = results.map((r) => r.categories.find((c) => c.key === key)?.total ?? 0);
    const maxVal = Math.max(...values);
    return el(
      "tr",
      {},
      el("th", { scope: "row" }, STRINGS.categories[key]),
      ...values.map((val) =>
        el(
          "td",
          { class: val === maxVal && val > 0 && new Set(values).size > 1 ? "compare__expensive" : "" },
          formatCurrency(val)
        )
      )
    );
  });

  return el(
    "div",
    { class: "table-scroll" },
    el("table", { class: "compare-table" }, el("thead", {}, headerRow), el("tbody", {}, ...bodyRows))
  );
}

function verdictBox(results: CarResult[]): HTMLElement {
  const v = compareResults(results);
  const divergence = divergenceNote(results);
  if (v.similar) {
    return el(
      "div",
      { class: "verdict verdict--similar" },
      el("h3", {}, STRINGS.comparison.similarTitle),
      el("p", {}, STRINGS.comparison.similarBody),
      divergence
    );
  }
  const cheapest = v.ranked[0];
  const msg = `${cheapest.name} הוא ${STRINGS.comparison.cheapest}. הפער מהרכב הבא הוא כ-${formatCurrency(v.gapToNextTotal)} לכל התקופה - כ-${formatCurrency(v.gapToNextMonthly)} בחודש. כדאי לשקול גם נוחות, בטיחות ואמינות.`;
  return el("div", { class: "verdict" }, el("p", {}, msg), divergence);
}

export function renderComparison(): HTMLElement {
  const state = getState();

  if (state.cars.length < 2) {
    return el(
      "section",
      { class: "card" },
      el("h2", { class: "section-title" }, STRINGS.comparison.title),
      el("p", { class: "section-sub" }, "הוסף/י רכב שני כדי להשוות ביניהם באותם חישובים."),
      el(
        "button",
        { type: "button", class: "btn btn--primary", onClick: () => addCar() },
        STRINGS.nav.addCar
      )
    );
  }

  const results = state.cars.map(computeCarResult);
  const cheapestId = compareResults(results).cheapestId;

  const headerRow = el(
    "tr",
    {},
    el("th", { scope: "col" }, ""),
    ...results.map((r, i) =>
      el(
        "th",
        {
          scope: "col",
          class: r.input.id === cheapestId ? "compare__winner" : "",
          style: { borderTopColor: CAR_COLORS[i % CAR_COLORS.length], borderTopWidth: "4px", borderTopStyle: "solid" },
        },
        el("span", { class: "compare__dot", style: { background: CAR_COLORS[i % CAR_COLORS.length] }, "aria-hidden": "true" }),
        carDisplayName(r.input, `רכב ${i + 1}`)
      )
    )
  );

  const bodyRows = METRICS.map((m) =>
    el(
      "tr",
      {},
      el("th", { scope: "row" }, m.label),
      ...results.map((r) => {
        const val = m.get(r);
        return el(
          "td",
          { class: r.input.id === cheapestId ? "compare__winner" : "" },
          m.precise ? formatCurrencyPrecise(val) : formatCurrency(val)
        );
      })
    )
  );

  const table = el(
    "div",
    { class: "table-scroll" },
    el(
      "table",
      { class: "compare-table" },
      el("thead", {}, headerRow),
      el("tbody", {}, ...bodyRows)
    )
  );

  return el(
    "section",
    { class: "card" },
    el("h2", { class: "section-title" }, STRINGS.comparison.title),
    el("p", { class: "section-sub" }, STRINGS.comparison.subtitle),
    verdictBox(results),
    table,
    el(
      "div",
      { class: "compare__actions no-print" },
      el(
        "button",
        { type: "button", class: "btn btn--ghost", onClick: () => setState({ view: "wizard", step: 1 }) },
        STRINGS.nav.editInputs
      )
    )
  );
}
