// ------------------------------------------------------------------
// app.ts - הרכבת המסך: כותרת המותג, לשוניות רכבים, סרגל פעולות,
// והחלפה בין האשף לתוצאות. מנוי ל-store מפעיל רינדור מחדש.
// ------------------------------------------------------------------

import { el, mount } from "./dom";
import { STRINGS } from "../strings";
import { CAR_COLORS, MAX_CARS, CTA_URL } from "../config";
import {
  getState,
  setState,
  subscribe,
  addCar,
  duplicateCar,
  removeCar,
  resetAll,
} from "../state/store";
import { track } from "../analytics/track";
import { renderWizard } from "./steps";
import { renderResults, socialCard, emailResultsSection } from "./results";
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

/** תמונת נתנאל - פני המותג - תגית פינתית מלבנית בכותרת, נפרדת מהלוגו המרכזי */
function founderPhoto(): HTMLElement {
  return el("img", {
    // שם הקובץ מוטמע ישירות כמחרוזת ליטרלית (לא דרך קבוע מיובא) כדי
    // שה-assembler של הקובץ המכווץ ימצא ויטמיע אותה כ-data URI - ראו
    // אותו דפוס ב-course.ts.
    src: `${import.meta.env.BASE_URL}founder.jpg`,
    class: "founder-photo",
    alt: "נתנאל",
    decoding: "async",
    onerror: (e: Event) => {
      const img = e.target as HTMLImageElement;
      img.onerror = null;
      img.style.display = "none";
    },
  });
}

function header(): HTMLElement {
  return el(
    "header",
    { class: "app-header" },
    founderPhoto(),
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
    state.cars.length >= 2 ? renderComparison() : null,
    emailResultsSection()
  );
}

function footer(): HTMLElement {
  return el(
    "footer",
    { class: "app-footer" },
    el("p", {}, STRINGS.disclaimer),
    el("p", { class: "app-footer__brand" }, `© ${STRINGS.brand}`)
  );
}

/**
 * כפתור מרחף קבוע (בכל המסכים - כניסה, אשף, תוצאות) שמוביל לדף ההרשמה
 * לשיעור. ממוקם למעלה-שמאל כדי לא להפריע לפלואו של המחשבון עצמו, עם
 * פעימה קטנה כדי שלא יהיה סיכוי לפספס אותו.
 */
function floatingCta(): HTMLElement {
  return el(
    "a",
    {
      class: "floating-cta no-print",
      href: CTA_URL,
      target: "_blank",
      rel: "noopener",
      onClick: () => track("consultation_clicked"),
    },
    STRINGS.floatingCta.label
  );
}

export function renderApp(): void {
  const root = document.getElementById("app");
  if (!root) return;
  if (getState().view === "login") {
    mount(root, header(), el("main", { class: "app-main" }, renderLogin()), footer(), floatingCta());
    return;
  }
  mount(
    root,
    header(),
    el("div", { class: "control-bar no-print" }, tabs(), toolbar()),
    body(),
    socialCard(),
    footer(),
    floatingCta()
  );
}

export function startApp(): void {
  subscribe(renderApp);
  renderApp();
  track("calculator_started");
}
