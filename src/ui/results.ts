// ------------------------------------------------------------------
// results.ts - מסך תוצאות פשוט: העלות הכוללת לתקופה, ופילוח פשוט של
// כמה מזה מחיר הרכב וכמה עלויות נוספות.
// ------------------------------------------------------------------

import { el } from "./dom";
import { STRINGS } from "../strings";
import { activeCar, getState, addCar, getLoggedInLead } from "../state/store";
import { computeCarResult } from "../calc/totals";
import { formatCurrency, formatPercent } from "../format/format";
import { SOCIAL_LINKS } from "../config";
import { track } from "../analytics/track";
import { categoryBreakdownTable } from "./comparison";
import { carDisplayName } from "../state/defaults";
import { sendResultsEmail, resultsEmailConfigured } from "../integrations/resultsEmail";
import type { CarResult, CategoryKey } from "../types";

function heroCard(r: CarResult): HTMLElement {
  const years = Math.max(1, Math.round(r.input.holdingYears));
  return el(
    "section",
    { class: "card result-main" },
    el("h2", { class: "result-main__title" }, STRINGS.results.mainCardTitle),
    el(
      "div",
      { class: "result-hero" },
      el("div", { class: "result-hero__total" }, formatCurrency(r.economicTotal)),
      el(
        "div",
        { class: "result-hero__caption" },
        `${STRINGS.results.forPeriod} ${years} ${STRINGS.results.years}`
      )
    ),
    el(
      "div",
      { class: "result-hero__monthly" },
      `${STRINGS.results.approx} ${formatCurrency(r.economicMonthly)} ${STRINGS.results.perMonth}`
    )
  );
}

/** קריאה בולטת להוסיף רכב שני - מוצגת רק כשעדיין יש רכב יחיד, כדי שלא יפספסו את ההשוואה */
function compareNudge(): HTMLElement {
  const N = STRINGS.compareNudge;
  return el(
    "section",
    { class: "card compare-nudge" },
    el("h2", { class: "compare-nudge__title" }, N.title),
    el(
      "img",
      {
        class: "compare-nudge__sheep",
        src: `${import.meta.env.BASE_URL}sheep.png`,
        alt: "",
        "aria-hidden": "true",
      }
    ),
    el(
      "div",
      { class: "compare-nudge__body" },
      el("p", { class: "compare-nudge__subtitle" }, N.subtitle),
      el(
        "button",
        {
          type: "button",
          class: "btn btn--cta",
          onClick: () => {
            addCar();
            track("comparison_added");
          },
        },
        N.cta
      )
    )
  );
}

/** פירוט העלויות הנוספות (כל קטגוריה חוץ ממחיר הרכב) - נפתח בלחיצה */
function additionalBreakdown(r: CarResult): HTMLElement {
  const years = Math.max(1, Math.round(r.input.holdingYears));
  const rows = r.categories
    .filter((c) => c.key !== "purchase" && c.total > 0)
    .map((c) =>
      el(
        "div",
        { class: "breakdown-row" },
        el("span", { class: "breakdown-row__label" }, STRINGS.categories[c.key as CategoryKey]),
        el("span", { class: "breakdown-row__leader", "aria-hidden": "true" }),
        el(
          "span",
          { class: "breakdown-row__amounts" },
          el("span", { class: "breakdown-row__total" }, formatCurrency(c.total)),
          el("span", { class: "breakdown-row__monthly" }, `${formatCurrency(c.monthly)} / חודש`)
        )
      )
    );
  return el(
    "div",
    { class: "breakdown" },
    el("p", { class: "breakdown__note" }, `הסכומים לכל התקופה - ${years} שנות החזקה.`),
    el("div", { class: "breakdown__rows" }, ...rows)
  );
}

/** פילוח פשוט: כמה מהעלות זה מחיר הרכב וכמה עלויות נוספות */
function splitCard(r: CarResult): HTMLElement {
  const purchase = r.categories.find((c) => c.key === "purchase")?.total ?? 0;
  const additional = Math.max(0, r.economicTotal - purchase);
  const total = r.economicTotal || 1;
  const pPurchase = purchase / total;
  const pAdditional = additional / total;

  const bar = el(
    "div",
    {
      class: "split-bar",
      role: "img",
      "aria-label": `מחיר הרכב ${formatPercent(pPurchase)}, עלויות נוספות ${formatPercent(pAdditional)}`,
    },
    el("div", {
      class: "split-bar__seg split-bar__seg--purchase",
      style: { width: `${pPurchase * 100}%` },
    }),
    el("div", {
      class: "split-bar__seg split-bar__seg--additional",
      style: { width: `${pAdditional * 100}%` },
    })
  );

  const row = (dotCls: string, label: string, amount: number, share: number) =>
    el(
      "div",
      { class: "split-row" },
      el("span", { class: "split-row__dot " + dotCls, "aria-hidden": "true" }),
      el("span", { class: "split-row__label" }, label),
      el("span", { class: "split-row__pct" }, formatPercent(share)),
      el("span", { class: "split-row__amount" }, formatCurrency(amount))
    );

  const allCars = getState().cars;
  const allResults = allCars.length >= 2 ? allCars.map(computeCarResult) : [r];
  const breakdownContent =
    allCars.length >= 2 ? categoryBreakdownTable(allResults) : additionalBreakdown(r);
  const usedFinancing = allResults.some((car) => car.financing.interestDuringHolding > 0);
  const breakdownWrap = el(
    "div",
    { class: "breakdown-wrap" },
    el(
      "div",
      { class: "breakdown-wrap__inner" },
      breakdownContent,
      usedFinancing ? el("p", { class: "breakdown__finance-note" }, STRINGS.results.financingMethodNote) : null
    )
  );
  let open = false;
  const toggleBtn = el(
    "button",
    {
      type: "button",
      class: "link-btn breakdown-toggle",
      onClick: () => {
        open = !open;
        breakdownWrap.classList.toggle("breakdown-wrap--open", open);
        toggleBtn.textContent = open ? STRINGS.results.hideBreakdown : STRINGS.results.showBreakdown;
      },
    },
    STRINGS.results.showBreakdown
  );

  return el(
    "section",
    { class: "card" },
    el("h2", { class: "section-title" }, STRINGS.results.splitTitle),
    bar,
    el(
      "div",
      { class: "split-rows" },
      row("split-row__dot--purchase", STRINGS.results.purchaseShare, purchase, pPurchase),
      row("split-row__dot--additional", STRINGS.results.additionalShare, additional, pAdditional)
    ),
    el("p", { class: "split-note" }, STRINGS.results.additionalNote),
    toggleBtn,
    breakdownWrap
  );
}

/**
 * אייקוני רשתות - שחזור נאמן של הלוגואים הרשמיים (נתיבי SVG מ-Simple Icons,
 * רישיון CC0), מוטמעים כ-SVG פנימי כדי שלא תהיה תלות ברשת חיצונית.
 */
const SOCIAL_PATHS = {
  instagram:
    "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
} as const;

function socialIcon(kind: "instagram" | "tiktok" | "facebook"): HTMLElement {
  const inner: Record<typeof kind, string> = {
    instagram: `
      <defs><linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0">
        <stop offset="0%" stop-color="#FEDA75"/><stop offset="28%" stop-color="#FA7E1E"/>
        <stop offset="55%" stop-color="#D62976"/><stop offset="78%" stop-color="#962FBF"/>
        <stop offset="100%" stop-color="#4F5BD5"/>
      </linearGradient></defs>
      <rect width="24" height="24" rx="7" fill="url(#ig-grad)"/>
      <path d="${SOCIAL_PATHS.instagram}" fill="#fff" transform="translate(3.6,3.6) scale(0.7)"/>`,
    tiktok: `
      <rect width="24" height="24" rx="7" fill="#000"/>
      <g transform="translate(3.6,3.6) scale(0.7)">
        <path d="${SOCIAL_PATHS.tiktok}" fill="#25F4EE" transform="translate(-0.9,0.9)"/>
        <path d="${SOCIAL_PATHS.tiktok}" fill="#FE2C55" transform="translate(0.9,-0.9)"/>
        <path d="${SOCIAL_PATHS.tiktok}" fill="#fff"/>
      </g>`,
    facebook: `
      <circle cx="12" cy="12" r="12" fill="#1877F2"/>
      <path d="${SOCIAL_PATHS.facebook}" fill="#fff" transform="translate(3.6,3.6) scale(0.7)"/>`,
  };
  return el("span", {
    class: "social-icon",
    "aria-hidden": "true",
    html: `<svg viewBox="0 0 24 24" width="30" height="30">${inner[kind]}</svg>`,
  });
}

export function socialCard(): HTMLElement {
  const S = STRINGS.social;
  const link = (kind: "instagram" | "tiktok" | "facebook", url: string, label: string) =>
    el(
      "a",
      { class: "social-link", href: url, target: "_blank", rel: "noopener", "aria-label": label },
      socialIcon(kind)
    );

  return el(
    "section",
    { class: "card social-card" },
    el("h2", { class: "section-title" }, S.title),
    el("p", { class: "section-sub" }, S.subtitle),
    el(
      "div",
      { class: "social-row" },
      link("instagram", SOCIAL_LINKS.instagram, S.instagram),
      link("tiktok", SOCIAL_LINKS.tiktok, S.tiktok),
      link("facebook", SOCIAL_LINKS.facebook, S.facebook)
    )
  );
}

/**
 * כפתור "שלח לי את התוצאות למייל" - עובד גם על רכב יחיד וגם על השוואה
 * (שולח את כל הרכבים הפעילים כרגע). מציג משוב הצלחה/כישלון, כי זו
 * פעולה יזומה של המשתמש - לא ירי-וסיום שקט כמו הליד בכניסה.
 */
export function emailResultsSection(): HTMLElement {
  const E = STRINGS.results;
  const status = el("p", { class: "email-results__status", role: "status" });
  const btn = el(
    "button",
    {
      type: "button",
      class: "btn btn--ghost no-print",
      onClick: async () => {
        const lead = getLoggedInLead();
        if (!lead || !resultsEmailConfigured()) {
          status.textContent = E.emailFailed;
          return;
        }
        (btn as HTMLButtonElement).disabled = true;
        const original = btn.textContent;
        btn.textContent = E.emailSending;
        status.textContent = "";

        const cars = getState().cars.map((car) => {
          const r = computeCarResult(car);
          return {
            name: carDisplayName(car, E.title),
            purchasePrice: r.input.purchasePrice,
            economicTotal: r.economicTotal,
            economicMonthly: r.economicMonthly,
            holdingYears: r.input.holdingYears,
            categories: r.categories
              .filter((c) => c.total > 0)
              .map((c) => ({
                label: STRINGS.categories[c.key as CategoryKey],
                total: c.total,
                monthly: c.monthly,
              })),
          };
        });

        const ok = await sendResultsEmail({ email: lead.email, name: lead.name, cars });
        (btn as HTMLButtonElement).disabled = false;
        btn.textContent = original;
        status.textContent = ok ? E.emailSent : E.emailFailed;
      },
    },
    E.emailButton
  );
  return el("div", { class: "email-results no-print" }, btn, status);
}

export function renderResults(): HTMLElement {
  const r = computeCarResult(activeCar());

  const warnings =
    r.warnings.length > 0
      ? el(
          "div",
          { class: "warnings no-print", role: "status" },
          ...r.warnings.map((w) => el("p", { class: "warning" }, "⚠️ " + w.message))
        )
      : null;

  const nudge = getState().cars.length === 1 ? compareNudge() : null;

  return el("div", { class: "results" }, warnings, heroCard(r), nudge, splitCard(r));
}
