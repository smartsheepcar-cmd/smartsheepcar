// ------------------------------------------------------------------
// app.ts - הרכבת המסך: כותרת המותג, לשוניות רכבים, סרגל פעולות,
// והחלפה בין האשף לתוצאות. מנוי ל-store מפעיל רינדור מחדש.
// ------------------------------------------------------------------

import { el, mount } from "./dom";
import { STRINGS } from "../strings";
import { CAR_COLORS, MAX_CARS } from "../config";
import {
  getState,
  setState,
  subscribe,
  addCar,
  duplicateCar,
  removeCar,
  resetAll,
  fullReset,
} from "../state/store";
import { track } from "../analytics/track";
import { renderWizard } from "./steps";
import { renderResults, socialCard } from "./results";
import { renderComparison } from "./comparison";
import { renderLogin } from "./login";
import { openModal } from "./modal";
import { carDisplayName } from "../state/defaults";

/** לוגו המותג - דמות הכבשה ברכב האדום, ברקע שקוף (ללא מסגרת) */
function brandMark(): HTMLElement {
  return el("img", {
    src: `${import.meta.env.BASE_URL}logo.png`,
    class: "brandmark",
    width: 150,
    height: 150,
    alt: STRINGS.brand,
    decoding: "async",
  });
}

function header(): HTMLElement {
  return el(
    "header",
    { class: "app-header" },
    el(
      "div",
      { class: "app-header__brand" },
      brandMark(),
      el("h1", { class: "app-header__brandname" }, STRINGS.brand),
      el("div", { class: "app-header__caption" }, STRINGS.appCaption)
    )
  );
}

function tabs(): HTMLElement {
  const state = getState();
  const tabEls = state.cars.map((car, i) => {
    const displayName = carDisplayName(car, `רכב ${i + 1}`);
    return el(
      "div",
      { class: "tab" + (i === state.activeIndex ? " tab--active" : "") },
      el(
        "button",
        {
          type: "button",
          class: "tab__btn",
          onClick: () => setState({ activeIndex: i }),
        },
        el("span", { class: "tab__dot", style: { background: CAR_COLORS[i % CAR_COLORS.length] }, "aria-hidden": "true" }),
        displayName
      ),
      state.cars.length > 1
        ? el(
            "button",
            {
              type: "button",
              class: "tab__close",
              "aria-label": `הסרת ${displayName}`,
              onClick: () => removeCar(i),
            },
            "×"
          )
        : null
    );
  });

  const addBtn =
    state.cars.length < MAX_CARS
      ? el(
          "button",
          {
            type: "button",
            class: "tab tab--add",
            onClick: () => {
              addCar();
              track("comparison_added");
            },
          },
          "+ " + STRINGS.nav.addCar
        )
      : null;

  return el("div", { class: "tabs no-print", role: "tablist" }, ...tabEls, addBtn);
}

/** אישור איפוס בחלונית מותאמת - window.confirm() נחסם בתוך iframe ממוסגר */
function confirmReset(): void {
  const R = STRINGS.resetConfirm;
  let close = () => {};
  const content = el(
    "div",
    { class: "reset-confirm" },
    el("p", { class: "reset-confirm__body" }, R.body),
    el(
      "div",
      { class: "reset-confirm__actions" },
      el(
        "button",
        {
          type: "button",
          class: "btn btn--ghost btn--sm",
          onClick: () => close(),
        },
        R.cancel
      ),
      el(
        "button",
        {
          type: "button",
          class: "btn btn--sm btn--danger",
          onClick: () => {
            close();
            resetAll();
          },
        },
        R.confirm
      )
    )
  );
  close = openModal({ title: R.title, content });
}

/**
 * איפוס מלא (כולל התחברות) - חלונית אישור נפרדת מ-confirmReset, כי הפעולה
 * הזו גם מנתקת. קישור ה-URL עם #restart לא עובד בתוך ה-iframe הממוסגר של
 * Artifact (ה-hash של הדף החיצוני לא מגיע לתוכן הפנימי), אז זו הדרך
 * האמינה היחידה - כפתור בתוך האפליקציה עצמה, לא תלוי בניווט חיצוני.
 */
function confirmFullReset(): void {
  const R = STRINGS.fullResetConfirm;
  let close = () => {};
  const content = el(
    "div",
    { class: "reset-confirm" },
    el("p", { class: "reset-confirm__body" }, R.body),
    el(
      "div",
      { class: "reset-confirm__actions" },
      el("button", { type: "button", class: "btn btn--ghost btn--sm", onClick: () => close() }, R.cancel),
      el(
        "button",
        {
          type: "button",
          class: "btn btn--sm btn--danger",
          onClick: () => {
            close();
            fullReset();
          },
        },
        R.confirm
      )
    )
  );
  close = openModal({ title: R.title, content });
}

function toolbar(): HTMLElement {
  const state = getState();
  const inResults = state.view === "results";

  return el(
    "div",
    { class: "toolbar no-print" },
    inResults
      ? el(
          "button",
          { type: "button", class: "btn btn--sm", onClick: () => setState({ view: "wizard" }) },
          "✎ " + STRINGS.nav.editInputs
        )
      : null,
    el(
      "button",
      { type: "button", class: "btn btn--sm", onClick: () => duplicateCar() },
      "⧉ " + STRINGS.nav.duplicate
    ),
    el("span", { class: "toolbar__spacer" }),
    el(
      "button",
      { type: "button", class: "btn btn--sm btn--danger", onClick: confirmReset },
      "↺ " + STRINGS.nav.reset
    )
  );
}

function body(): HTMLElement {
  const state = getState();
  if (state.view === "wizard") {
    return el("main", { class: "app-main" }, renderWizard());
  }
  // תוצאות + השוואה (אם יש יותר מרכב אחד)
  return el(
    "main",
    { class: "app-main" },
    renderResults(),
    state.cars.length >= 2 ? renderComparison() : null
  );
}

function footer(): HTMLElement {
  return el(
    "footer",
    { class: "app-footer" },
    el("p", {}, STRINGS.disclaimer),
    el("p", { class: "app-footer__brand" }, `© ${STRINGS.brand}`),
    el(
      "button",
      { type: "button", class: "app-footer__fullreset", onClick: confirmFullReset },
      STRINGS.fullResetConfirm.link
    )
  );
}

export function renderApp(): void {
  const root = document.getElementById("app");
  if (!root) return;
  if (getState().view === "login") {
    mount(root, header(), el("main", { class: "app-main" }, renderLogin()), footer());
    return;
  }
  mount(
    root,
    header(),
    el("div", { class: "control-bar no-print" }, tabs(), toolbar()),
    body(),
    socialCard(),
    footer()
  );
}

export function startApp(): void {
  subscribe(renderApp);
  renderApp();
  track("calculator_started");
}
