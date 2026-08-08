// ------------------------------------------------------------------
// course.ts - פופ-אפ הרשמה לשיעור, שקופץ פעם אחת אחרי חישוב העלות.
// ------------------------------------------------------------------

import { el } from "./dom";
import { openModal } from "./modal";
import { STRINGS } from "../strings";
import { COURSE_URL } from "../config";
import { track } from "../analytics/track";

let shown = false;

export function showCoursePopup(): void {
  if (shown) return;
  shown = true;

  let close = () => {};
  const photo = el("img", {
    class: "course__banner-img",
    // חשוב: שם הקובץ מוטמע ישירות בתבנית (לא דרך קבוע מיובא) כדי שיישאר
    // מחרוזת ליטרלית "./founder.jpg" בקובץ המכווץ - כך ה-assembler מוצא
    // ומטמיע אותה כ-data URI (בדיוק כמו mascot.png).
    src: `${import.meta.env.BASE_URL}founder.jpg`,
    alt: STRINGS.brand,
    // עד שתתווסף תמונה אמיתית ב-public/founder.jpg, נופלים לדמות המסקוט
    onerror: (e: Event) => {
      const img = e.target as HTMLImageElement;
      img.onerror = null;
      img.classList.add("course__banner-img--fallback");
      img.src = `${import.meta.env.BASE_URL}mascot.png`;
    },
  });
  const content = el(
    "div",
    { class: "course" },
    el(
      "div",
      { class: "course__body-wrap" },
      el("div", { class: "course__banner" }, photo),
      el("h3", { class: "course__title" }, STRINGS.course.title),
      el("p", { class: "course__body" }, STRINGS.course.body),
      el("div", { class: "course__arrow", "aria-hidden": "true" }, "👇"),
      el(
        "a",
        {
          class: "btn btn--cta course__cta",
          href: COURSE_URL,
          target: "_blank",
          rel: "noopener",
          onClick: () => track("consultation_clicked"),
        },
        STRINGS.course.cta
      ),
      el("button", { type: "button", class: "course__later", onClick: () => close() }, STRINGS.course.later)
    )
  );

  close = openModal({ title: "", content, className: "modal--course", ariaLabel: STRINGS.course.title });
}
