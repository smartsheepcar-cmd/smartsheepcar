// ------------------------------------------------------------------
// steps.ts - אשף הזנת הנתונים בשלושה שלבים (רכב+מחיר / שימוש / קבועות).
// שדות מספריים מעדכנים את ה-state ללא רינדור מלא (שמירת פוקוס);
// שדות מבניים (סוג רכב, יחידת צריכה וכו') מפעילים רינדור מלא.
// ------------------------------------------------------------------

import { el, clear } from "./dom";
import { STRINGS } from "../strings";
import { STEP_VIDEOS, FUEL_KM_PER_LITER_ESTIMATE, ESTIMATES } from "../config";
import { activeCar, patchActiveCar, setState, getState } from "../state/store";
import { track } from "../analytics/track";
import { numberField, segmented, infoIcon } from "./components";
import { parseNumberInput, formatNumber, toNumber } from "../format/format";
import { openModal } from "./modal";
import { showCoursePopup } from "./course";
import { searchModels, FUEL_CODE_TO_TYPE, type ModelEntry } from "../data/models";
import { searchCities, drivingKm, type City } from "../data/cities";
import { estimateInsurance, type InsuranceInput } from "../calc/insurance";
import { estimateLicenseFee } from "../calc/licenseFee";
import type { CarInput } from "../types";

// ---- עוזרי עדכון ----
function set<K extends keyof CarInput>(key: K, value: CarInput[K]): void {
  patchActiveCar({ [key]: value } as Partial<CarInput>);
}
function setStruct(changes: Partial<CarInput>): void {
  patchActiveCar(changes);
  setState({}); // רינדור מלא
}

/**
 * מעבר בין שלבים, עם חסימה: אי אפשר לצאת משלב 1 בלי לבחור דגם - כי כל
 * מילוי האנרגיה האוטומטי (ק"מ לליטר נעול) תלוי בבחירת דגם. בלי החסימה
 * הזו קל "לדלג" בטעות דרך מחוון ההתקדמות ולהגיע לשלב 2 עם שדה פתוח
 * וברירת מחדל גנרית, שנראה כאילו הנעילה "לא עובדת".
 */
let modelRequiredError = false;
function goToStep(n: number): void {
  const state = getState();
  if (state.step === 1 && n > 1 && !activeCar().selectedModel) {
    modelRequiredError = true;
    setState({});
    return;
  }
  modelRequiredError = false;
  setState({ step: n });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
/** שדה מספר רגיל */
function numField(car: CarInput, key: keyof CarInput): HTMLElement {
  return numberField({
    fieldKey: key as string,
    value: car[key] as number,
    onChange: (v) => set(key, v as CarInput[keyof CarInput]),
  });
}

/** שדה אחוזים - הערך נשמר כשבר (0.15) ומוצג כאחוז (15) */
function pctField(car: CarInput, key: keyof CarInput): HTMLElement {
  const asPct = (car[key] as number) * 100;
  return numberField({
    fieldKey: key as string,
    value: asPct,
    onChange: (v) => set(key, (v / 100) as CarInput[keyof CarInput]),
  });
}

// ---- בוחר דגם מהמאגר (עם השלמה אוטומטית) + מילוי אוטומטי ----
function applyModel(car: CarInput, m: ModelEntry): void {
  modelRequiredError = false;
  const estimated: CarInput["estimated"] = { ...car.estimated, fuelType: true };
  const fuelType = FUEL_CODE_TO_TYPE[m.fuel];
  const changes: Partial<CarInput> = {
    fuelType,
    selectedModel: m.label,
    energyUnlocked: false, // צריכה נעולה מחדש לפי הדגם החדש
    consumptionIsGenericEstimate: false,
  };
  if (m.fuel !== "e") {
    changes.consumptionUnit = "kmPerLiter";
    if (m.l100 != null && m.l100 > 0) {
      // המרה מל/100 ק"מ לק"מ-לליטר (המחשבון עובד בק"מ/ליטר בלבד)
      changes.kmPerLiter = Math.round((100 / m.l100) * 10) / 10;
    } else {
      // אין נתון WLTP רשמי לדגם הזה (קורה לכ-28% מהדגמים הלא-חשמליים) -
      // עדיין נועלים ומסמנים כהערכה, אבל לפי סוג הדלק בלבד, ולא משאירים
      // שדה פתוח עם ברירת מחדל גנרית שנראית "לא מחושבת".
      changes.kmPerLiter = FUEL_KM_PER_LITER_ESTIMATE[fuelType] ?? ESTIMATES.kmPerLiter;
      changes.consumptionIsGenericEstimate = true;
    }
    estimated.kmPerLiter = true;
  }
  // שם הרכב נגזר תמיד מהדגם שנבחר - אין שדה שם נפרד לעריכה ידנית
  changes.name = m.label;
  changes.estimated = estimated;
  patchActiveCar(changes);
  setState({}); // רינדור מלא - מעדכן סוג רכב וחושף שדות אנרגיה מתאימים
}

/** שנתון הרכב - שדה ללא פסיקי אלפים (זו שנה, לא סכום) */
function carYearField(car: CarInput): HTMLElement {
  const f = STRINGS.fields.carYear;
  const input = el("input", {
    type: "text",
    inputmode: "numeric",
    class: "field__input",
    maxlength: "4",
    value: car.carYear ? String(car.carYear) : "",
    placeholder: String(new Date().getFullYear()),
    onInput: (e: Event) => {
      const target = e.target as HTMLInputElement;
      const digits = target.value.replace(/\D/g, "").slice(0, 4);
      if (digits !== target.value) target.value = digits;
      set("carYear", digits ? parseInt(digits, 10) : 0);
    },
  });
  return el(
    "div",
    { class: "field" },
    el("div", { class: "field__labelrow" }, el("label", { class: "field__label" }, f.label), infoIcon(f.info)),
    el("div", { class: "field__control" }, input)
  );
}

function modelPicker(car: CarInput): HTMLElement {
  const input = el("input", {
    type: "text",
    class: "field__input",
    autocomplete: "off",
    placeholder: STRINGS.modelPicker.placeholder,
    value: car.selectedModel || "",
    "aria-label": STRINGS.modelPicker.label,
  }) as HTMLInputElement;

  const list = el("ul", { class: "combo__list", role: "listbox" });
  list.style.display = "none";

  const renderList = (items: ModelEntry[]) => {
    clear(list);
    if (items.length === 0) {
      list.style.display = "none";
      return;
    }
    for (const m of items) {
      list.appendChild(
        el(
          "li",
          {
            class: "combo__item",
            role: "option",
            // mousedown לפני blur כדי שהבחירה תיקלט
            onMousedown: (e: Event) => {
              e.preventDefault();
              list.style.display = "none";
              applyModel(car, m);
            },
          },
          el("span", { class: "combo__name" }, m.label),
          el("span", { class: "combo__fuel" }, STRINGS.fuelType.options[FUEL_CODE_TO_TYPE[m.fuel]])
        )
      );
    }
    list.style.display = "block";
  };

  input.addEventListener("input", () => renderList(searchModels(input.value)));
  input.addEventListener("focus", () => {
    if (input.value) renderList(searchModels(input.value));
  });
  input.addEventListener("blur", () => setTimeout(() => (list.style.display = "none"), 150));

  const clearBtn = car.selectedModel
    ? el(
        "button",
        {
          type: "button",
          class: "combo__clear",
          "aria-label": "ניקוי בחירת דגם",
          onClick: () => {
            patchActiveCar({ selectedModel: "" });
            setState({});
          },
        },
        "×"
      )
    : null;

  return el(
    "div",
    { class: "field field--segmented combo" },
    el(
      "div",
      { class: "field__labelrow" },
      el("label", { class: "field__label" }, STRINGS.modelPicker.label),
      infoIcon(STRINGS.modelPicker.info)
    ),
    el("p", { class: "combo__tip" }, STRINGS.modelPicker.searchTip),
    el("div", { class: "combo__wrap" }, input, clearBtn, list),
    el("p", { class: "hint hint--sm" }, STRINGS.modelPicker.hint)
  );
}

// ---- עוזר קילומטראז' שנתי (פופ-אפ) ----
const EXTRA_MONTHLY = { low: 50, mid: 200, high: 500 } as const;
type ExtraLevel = keyof typeof EXTRA_MONTHLY;

/** תיבת חיפוש עיר (עברית) - בוחרת City ומחזירה אותה דרך onPick */
function cityCombo(onPick: (c: City | null) => void): HTMLElement {
  const input = el("input", {
    type: "text",
    class: "field__input",
    autocomplete: "off",
    placeholder: STRINGS.kmHelper.cityPlaceholder,
  }) as HTMLInputElement;
  const list = el("ul", { class: "combo__list", role: "listbox" });
  list.style.display = "none";

  const render = (items: City[]) => {
    clear(list);
    if (!items.length) {
      list.style.display = "none";
      return;
    }
    for (const c of items) {
      list.appendChild(
        el(
          "li",
          {
            class: "combo__item",
            role: "option",
            onMousedown: (e: Event) => {
              e.preventDefault();
              input.value = c.he;
              list.style.display = "none";
              onPick(c);
            },
          },
          el("span", { class: "combo__name" }, c.he)
        )
      );
    }
    list.style.display = "block";
  };

  input.addEventListener("input", () => {
    onPick(null);
    render(searchCities(input.value));
  });
  // קליק אמיתי בלבד (לא focus תכנותי, כמו זה שקורה אוטומטית בפתיחת המודל)
  // כדי שרשימת הערים לא "תיפתח מעצמה" ברגע שהפופ-אפ נפתח.
  input.addEventListener("click", () => render(searchCities(input.value)));
  input.addEventListener("blur", () => setTimeout(() => (list.style.display = "none"), 150));

  return el("div", { class: "combo__wrap" }, input, list);
}

function openKmHelper(car: CarInput): void {
  let from: City | null = null;
  let to: City | null = null;
  let times = 5;
  let extra: ExtraLevel = "mid";

  const oneWayEl = el("div", { class: "km-result__sub" });
  const resultNum = el("strong", { class: "km-result__num" }, "0");

  const calc = () => {
    const oneWay = from && to ? drivingKm(from, to) : 0;
    const total = Math.round(oneWay * 2 * times * 52 + EXTRA_MONTHLY[extra] * 12);
    return { oneWay, total };
  };
  const refresh = () => {
    const { oneWay, total } = calc();
    oneWayEl.textContent =
      from && to ? `${STRINGS.kmHelper.oneWay}: ${formatNumber(Math.round(oneWay))} ק"מ` : "";
    resultNum.textContent = `${formatNumber(total)} ק"מ`;
  };

  const q = (label: string, info: string | undefined, control: HTMLElement) =>
    el(
      "div",
      { class: "field" },
      el(
        "div",
        { class: "field__labelrow" },
        el("label", { class: "field__label" }, label),
        info ? infoIcon(info) : null
      ),
      control
    );

  const timesInput = el("input", {
    type: "text",
    inputmode: "numeric",
    class: "field__input",
    value: "5",
    onInput: (e: Event) => {
      const p = parseNumberInput((e.target as HTMLInputElement).value);
      times = p && p > 0 ? p : 0;
      refresh();
    },
  });

  // בורר "נסיעות נוספות" עם עדכון מצב פעיל בלחיצה
  const extraBtns = new Map<ExtraLevel, HTMLElement>();
  const extraSeg = el(
    "div",
    { class: "segments" },
    ...(Object.keys(EXTRA_MONTHLY) as ExtraLevel[]).map((lvl) => {
      const b = el(
        "button",
        {
          type: "button",
          class: "segment" + (extra === lvl ? " segment--active" : ""),
          onClick: () => {
            extra = lvl;
            extraBtns.forEach((btn, v) => btn.classList.toggle("segment--active", v === lvl));
            refresh();
          },
        },
        STRINGS.kmHelper.extraOptions[lvl]
      );
      extraBtns.set(lvl, b);
      return b;
    })
  );

  let close = () => {};
  const apply = el(
    "button",
    {
      type: "button",
      class: "btn btn--primary",
      onClick: () => {
        const { total } = calc();
        close();
        patchActiveCar({ kmPerYear: total, estimated: { ...car.estimated, kmPerYear: true } });
        setState({});
      },
    },
    STRINGS.kmHelper.apply
  );

  const content = el(
    "div",
    { class: "km-helper" },
    el("h4", { class: "km-helper__lead" }, STRINGS.kmHelper.lead),
    el("p", { class: "section-sub" }, STRINGS.kmHelper.intro),
    q(STRINGS.kmHelper.fromCity, undefined, cityCombo((c) => { from = c; refresh(); })),
    q(STRINGS.kmHelper.toCity, undefined, cityCombo((c) => { to = c; refresh(); })),
    q(
      STRINGS.kmHelper.timesPerWeek,
      STRINGS.kmHelper.timesInfo,
      el("div", { class: "field__control" }, timesInput, el("span", { class: "field__unit" }, "בשבוע"))
    ),
    q(STRINGS.kmHelper.extraTrips, undefined, extraSeg),
    el(
      "div",
      { class: "km-result" },
      oneWayEl,
      el("div", { class: "km-result__main" }, el("span", {}, STRINGS.kmHelper.result + ": "), resultNum)
    ),
    el("p", { class: "hint hint--sm" }, STRINGS.kmHelper.note),
    apply
  );

  close = openModal({ title: STRINGS.kmHelper.title, content });
  refresh();
}

// ---- עוזר הערכת ביטוח (שאלון בסגנון Wobi) ----
function openInsuranceHelper(car: CarInput): void {
  const S = STRINGS.insurance;
  const s: InsuranceInput = {
    carValue: car.purchasePrice,
    ageBand: "30_50",
    experience: "gt6",
    claims: "0",
    coverage: "comprehensive",
  };
  const totalEl = el("strong", { class: "km-result__num" }, "0");
  const refresh = () => {
    totalEl.textContent = `${formatNumber(estimateInsurance(s).total)} ₪`;
  };

  function seg<T extends string>(
    label: string,
    options: Record<string, string>,
    get: () => T,
    setV: (v: T) => void
  ): HTMLElement {
    const btns = new Map<string, HTMLElement>();
    const wrap = el(
      "div",
      { class: "segments" },
      ...Object.entries(options).map(([val, lbl]) => {
        const b = el(
          "button",
          {
            type: "button",
            class: "segment" + (get() === val ? " segment--active" : ""),
            onClick: () => {
              setV(val as T);
              btns.forEach((bb, v) => bb.classList.toggle("segment--active", v === val));
              refresh();
            },
          },
          lbl
        );
        btns.set(val, b);
        return b;
      })
    );
    return el(
      "div",
      { class: "field" },
      el("div", { class: "field__labelrow" }, el("label", { class: "field__label" }, label)),
      wrap
    );
  }

  let close = () => {};
  const apply = el(
    "button",
    {
      type: "button",
      class: "btn btn--primary",
      onClick: () => {
        const e = estimateInsurance(s);
        close();
        patchActiveCar({ insuranceMandatory: e.mandatory, insuranceComprehensive: e.comprehensive });
        setState({});
      },
    },
    S.apply
  );

  const content = el(
    "div",
    { class: "km-helper" },
    el("p", { class: "section-sub" }, S.intro),
    seg(S.age, S.ageOptions, () => s.ageBand, (v) => (s.ageBand = v as InsuranceInput["ageBand"])),
    seg(S.experience, S.expOptions, () => s.experience, (v) => (s.experience = v as InsuranceInput["experience"])),
    seg(S.claims, S.claimsOptions, () => s.claims, (v) => (s.claims = v as InsuranceInput["claims"])),
    seg(S.coverage, S.coverageOptions, () => s.coverage, (v) => (s.coverage = v as InsuranceInput["coverage"])),
    el(
      "div",
      { class: "km-result" },
      el("div", { class: "km-result__main" }, el("span", {}, S.resultTotal + ": "), totalEl)
    ),
    el("p", { class: "hint hint--sm" }, S.note),
    apply
  );

  close = openModal({ title: S.title, content });
  refresh();
}

// ---- סרטון הסבר לשלב ----
function toEmbed(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return url;
}

function openVideoModal(rawUrl: string): void {
  const embed = toEmbed(rawUrl);
  const content = el(
    "div",
    { class: "video-modal" },
    embed
      ? el(
          "div",
          { class: "video__frame" },
          el("iframe", {
            class: "video__iframe",
            src: embed,
            title: STRINGS.video.title,
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowfullscreen: "",
            loading: "lazy",
          })
        )
      : el("p", { class: "video__placeholder" }, STRINGS.video.placeholder),
    el("p", { class: "video__catnote" }, STRINGS.video.catNote),
    el(
      "a",
      { class: "video__direct", href: rawUrl, target: "_blank", rel: "noopener" },
      STRINGS.video.watchDirect
    )
  );
  openModal({ title: STRINGS.video.title, content });
}

function videoButton(step: number): HTMLElement | null {
  const url = STEP_VIDEOS[step] || "";
  if (!url) return null;
  return el(
    "button",
    { type: "button", class: "video-btn no-print", onClick: () => openVideoModal(url) },
    "▶ " + STRINGS.video.title
  );
}

/** באנר "עשינו לך את החיים קלים" - ניתן לפיטור, למקומות שבהם נתונים הודבקו אוטומטית מהרכב הקודם */
function copiedNoticeEl(
  show: boolean,
  strings: { text: string; dismiss: string },
  onDismiss: () => void
): HTMLElement | null {
  if (!show) return null;
  return el(
    "div",
    { class: "copied-notice" },
    el("p", {}, strings.text),
    el("button", { type: "button", class: "link-btn", onClick: onDismiss }, strings.dismiss)
  );
}

/** קבוצת שדות עם כותרת, מופרדת ויזואלית משאר השלב */
function group(title: string, fields: (HTMLElement | null | false)[]): HTMLElement {
  return el(
    "section",
    { class: "fgroup" },
    el("h3", { class: "fgroup__title" }, title),
    el("div", { class: "grid" }, ...(fields.filter(Boolean) as HTMLElement[]))
  );
}

// ---- שלב 1 ----
function renderStep1(car: CarInput): HTMLElement {
  // סכום ההלוואה מחושב אוטומטית (מחיר הרכב פחות ההון העצמי) בכל שינוי
  // של מחיר הרכב או ההון העצמי, אך נשאר ניתן לעריכה ידנית בכל רגע.
  let loanAmountInput: HTMLInputElement | null = null;
  function syncLoanAmount(purchasePrice: number, downPayment: number): void {
    const computed = Math.max(0, toNumber(purchasePrice) - toNumber(downPayment));
    patchActiveCar({ loanAmount: computed });
    if (loanAmountInput) {
      loanAmountInput.value = computed ? formatNumber(computed, 2).replace(/\.00$/, "") : "";
    }
  }

  const purchasePriceField = numberField({
    fieldKey: "purchasePrice",
    value: car.purchasePrice,
    onChange: (v) => {
      set("purchasePrice", v);
      if (car.hasLoan) syncLoanAmount(v, activeCar().downPayment);
    },
  });

  const copiedNotice = copiedNoticeEl(car.copiedFromPreviousCar, STRINGS.copiedNotice, () =>
    setStruct({ copiedFromPreviousCar: false })
  );

  // מימון - נשאלים תחילה אם קיימת הלוואה; רק אז נפתחים שדות המימון
  const loanFields: (HTMLElement | null | false)[] = [
    copiedNotice,
    segmented<"yes" | "no">({
      legend: STRINGS.loan.question,
      name: "hasLoan",
      value: car.hasLoan ? "yes" : "no",
      options: [
        { value: "yes", label: STRINGS.loan.yes },
        { value: "no", label: STRINGS.loan.no },
      ],
      onChange: (v) =>
        v === "yes"
          ? setStruct({ hasLoan: true })
          : setStruct({ hasLoan: false, loanAmount: 0, loanMonths: 0 }),
    }),
  ];
  if (car.hasLoan) {
    const loanAmountField = numField(car, "loanAmount");
    loanAmountInput = loanAmountField.querySelector("input");

    const downPaymentField = numberField({
      fieldKey: "downPayment",
      value: car.downPayment,
      onChange: (v) => {
        set("downPayment", v);
        syncLoanAmount(activeCar().purchasePrice, v);
      },
    });
    loanFields.push(
      downPaymentField,
      loanAmountField,
      pctField(car, "annualInterestRate"),
      numField(car, "loanMonths")
    );
  }

  const modelError =
    modelRequiredError && !car.selectedModel
      ? el("p", { class: "field__error field__error--standalone", role: "alert" }, STRINGS.modelPicker.required)
      : null;

  return el(
    "div",
    { class: "groups" },
    group(STRINGS.groups.vehicle, [modelPicker(car), carYearField(car), modelError]),
    group(STRINGS.groups.price, [purchasePriceField, numField(car, "holdingYears")]),
    group(STRINGS.groups.finance, loanFields)
  );
}

// ---- שלב 2 ----

/** תבנית כללית לשדה נעול (ידוע אוטומטית) עם כפתור "לא מדויק? עריכה ידנית" */
function lockedField(opts: {
  title: string;
  valueText: string;
  note: string;
  onUnlock: () => void;
}): HTMLElement {
  return el(
    "div",
    { class: "field locked" },
    el(
      "div",
      { class: "field__labelrow" },
      el("label", { class: "field__label" }, opts.title)
    ),
    el(
      "div",
      { class: "locked__box" },
      el("span", { class: "locked__lock", "aria-hidden": "true" }, "🔒"),
      el(
        "div",
        {},
        el("div", { class: "locked__val" }, opts.valueText),
        el("div", { class: "locked__note" }, opts.note)
      )
    ),
    el("button", { type: "button", class: "link-btn", onClick: opts.onUnlock }, STRINGS.energy.editAnyway)
  );
}

const CURRENT_MONTH_YEAR_HE = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(
  new Date()
);

/** צריכת דלק - נעולה כשידועה מהדגם, עם כפתור לפתיחת עריכה ידנית */
function consumptionField(car: CarInput): HTMLElement {
  const knownFromModel =
    !!car.selectedModel && !!car.estimated.kmPerLiter && !car.energyUnlocked;

  if (knownFromModel) {
    return lockedField({
      title: STRINGS.energy.knownTitle,
      valueText: `${formatNumber(car.kmPerLiter, 1)} ${STRINGS.energy.knownValue}`,
      note: car.consumptionIsGenericEstimate
        ? STRINGS.energy.knownNoteGeneric(car.selectedModel)
        : STRINGS.energy.knownNote(car.selectedModel),
      onUnlock: () => setStruct({ energyUnlocked: true }),
    });
  }
  // עריכה חופשית (ק"מ/ליטר בלבד)
  return numField(car, "kmPerLiter");
}

/** מחיר דלק - נעול כברירת מחדל ("בדקנו הבוקר"), עם אפשרות לעריכה ידנית */
function fuelPriceField(car: CarInput): HTMLElement {
  const locked = !!car.estimated.fuelPricePerLiter && !car.fuelPriceUnlocked;
  if (locked) {
    return lockedField({
      title: STRINGS.energy.fuelPriceTitle,
      valueText: `${formatNumber(car.fuelPricePerLiter, 2)} ₪`,
      note: STRINGS.energy.fuelPriceNote(CURRENT_MONTH_YEAR_HE),
      onUnlock: () => setStruct({ fuelPriceUnlocked: true }),
    });
  }
  return numField(car, "fuelPricePerLiter");
}

/** צריכת חשמל - הערכה קבועה נעולה (אין נתון רשמי לפי דגם), עם אפשרות לעריכה ידנית */
function kwhField(car: CarInput): HTMLElement {
  const locked = !!car.estimated.kwhPer100 && !car.energyUnlocked;
  if (locked) {
    return lockedField({
      title: STRINGS.energy.kwhTitle,
      valueText: `${formatNumber(car.kwhPer100, 1)} קוט"ש/100 ק"מ`,
      note: STRINGS.energy.kwhNote,
      onUnlock: () => setStruct({ energyUnlocked: true }),
    });
  }
  return numField(car, "kwhPer100");
}

/** אגרת רישוי - הערכה נעולה לפי מחיר הרכב (טבלת משרד התחבורה), מתעדכנת כל עוד לא נערכה ידנית */
function licenseFeeField(car: CarInput): HTMLElement {
  const locked = !!car.estimated.licenseFee && !car.licenseFeeUnlocked;
  if (locked) {
    // מחיר הרכב או השנתון עשויים להשתנות בשלב 1 אחרי שהאגרה כבר חושבה - מסנכרנים בכל רינדור
    const fresh = estimateLicenseFee(car.purchasePrice, car.carYear);
    if (fresh !== car.licenseFee) patchActiveCar({ licenseFee: fresh });
    return lockedField({
      title: STRINGS.energy.licenseFeeTitle,
      valueText: `${formatNumber(fresh)} ₪`,
      note: STRINGS.energy.licenseFeeNote,
      onUnlock: () => setStruct({ licenseFeeUnlocked: true }),
    });
  }
  return numField(car, "licenseFee");
}

/** מחיר קוט"ש בבית - הערכת ממוצע נעולה, עם אפשרות לעריכה ידנית */
function homePriceField(car: CarInput): HTMLElement {
  const locked = !!car.estimated.homePricePerKwh && !car.energyUnlocked;
  if (locked) {
    return lockedField({
      title: STRINGS.energy.homePriceTitle,
      valueText: `${formatNumber(car.homePricePerKwh, 2)} ₪`,
      note: STRINGS.energy.kwhPriceNote,
      onUnlock: () => setStruct({ energyUnlocked: true }),
    });
  }
  return numField(car, "homePricePerKwh");
}

/** מחיר קוט"ש בעמדה ציבורית - הערכת ממוצע נעולה, עם אפשרות לעריכה ידנית */
function publicPriceField(car: CarInput): HTMLElement {
  const locked = !!car.estimated.publicPricePerKwh && !car.energyUnlocked;
  if (locked) {
    return lockedField({
      title: STRINGS.energy.publicPriceTitle,
      valueText: `${formatNumber(car.publicPricePerKwh, 2)} ₪`,
      note: STRINGS.energy.kwhPriceNote,
      onUnlock: () => setStruct({ energyUnlocked: true }),
    });
  }
  return numField(car, "publicPricePerKwh");
}

/** קיפול "נתוני אנרגיה ממוצעים" - מכיל שדות חשמל שבד"כ אין צורך לגעת בהם (סגור כברירת מחדל) */
function energyAveragesFold(car: CarInput): HTMLElement {
  return el(
    "details",
    { class: "energy-fold" },
    el("summary", { class: "energy-fold__summary" }, STRINGS.energy.averagesFoldTitle),
    el(
      "div",
      { class: "energy-fold__body" },
      el("p", { class: "energy-fold__hint" }, STRINGS.energy.averagesFoldHint),
      el("div", { class: "grid" }, kwhField(car), homePriceField(car), publicPriceField(car))
    )
  );
}

function renderEnergyFields(car: CarInput): HTMLElement[] {
  const fields: HTMLElement[] = [];
  const isElectric = car.fuelType === "electric";
  const isPlugin = car.fuelType === "plugin";

  if (isPlugin) fields.push(pctField(car, "pluginElectricShare"));

  if (!isElectric) {
    fields.push(consumptionField(car));
    fields.push(fuelPriceField(car));
  }

  if (isElectric || isPlugin) {
    fields.push(pctField(car, "homeChargeShare"));
    fields.push(energyAveragesFold(car));
  }
  return fields;
}

function renderStep2(car: CarInput): HTMLElement {
  const usageNotice = copiedNoticeEl(car.copiedUsage, STRINGS.copiedUsageNotice, () =>
    setStruct({ copiedUsage: false })
  );
  return el(
    "div",
    { class: "groups" },
    group(STRINGS.groups.mileage, [
      usageNotice,
      el(
        "button",
        { type: "button", class: "km-help-btn", onClick: () => openKmHelper(car) },
        "🧮 " + STRINGS.kmHelper.open
      ),
      numField(car, "kmPerYear"),
    ]),
    group(STRINGS.groups.energy, renderEnergyFields(car)),
    group(STRINGS.groups.running, [
      numField(car, "parkingMonthly"),
      numField(car, "tollsMonthly"),
      numField(car, "washingMonthly"),
    ])
  );
}

// ---- שלב 3 ----
function renderStep3(car: CarInput): HTMLElement {
  const insuranceNotice = copiedNoticeEl(car.copiedInsurance, STRINGS.copiedInsuranceNotice, () =>
    setStruct({ copiedInsurance: false })
  );
  return el(
    "div",
    { class: "groups" },
    group(STRINGS.groups.insurance, [
      insuranceNotice,
      el(
        "button",
        { type: "button", class: "km-help-btn", onClick: () => openInsuranceHelper(car) },
        "🧮 " + STRINGS.insurance.open
      ),
      numField(car, "insuranceMandatory"),
      numField(car, "insuranceComprehensive"),
      licenseFeeField(car),
    ]),
    group(STRINGS.groups.maintenance, [
      numField(car, "servicesAnnual"),
      numField(car, "repairsAnnual"),
    ])
  );
}

// ---- מעטפת האשף ----
export function renderWizard(): HTMLElement {
  const state = getState();
  const car = activeCar();
  const step = state.step;

  const content =
    step === 1 ? renderStep1(car) : step === 2 ? renderStep2(car) : renderStep3(car);

  const stepMeta = STRINGS.steps[step as 1 | 2 | 3];

  // מחוון התקדמות
  const progress = el(
    "ol",
    { class: "progress", "aria-label": "התקדמות" },
    ...[1, 2, 3].map((n) =>
      el(
        "li",
        {
          class:
            "progress__item" +
            (n === step ? " progress__item--active" : "") +
            (n < step ? " progress__item--done" : ""),
        },
        el(
          "button",
          {
            type: "button",
            class: "progress__btn",
            "aria-current": n === step ? "step" : "false",
            onClick: () => goToStep(n),
          },
          el("span", { class: "progress__num" }, String(n)),
          el("span", { class: "progress__txt" }, STRINGS.steps[n as 1 | 2 | 3].title)
        )
      )
    )
  );

  const nav = el(
    "div",
    { class: "wizard__nav" },
    step > 1
      ? el(
          "button",
          {
            type: "button",
            class: "btn btn--ghost",
            onClick: () => {
              setState({ step: step - 1 });
              window.scrollTo({ top: 0, behavior: "smooth" });
            },
          },
          STRINGS.nav.back
        )
      : el("span", {}),
    step < 3
      ? el(
          "button",
          { type: "button", class: "btn btn--primary", onClick: () => goToStep(step + 1) },
          STRINGS.nav.next
        )
      : el(
          "button",
          {
            type: "button",
            class: "btn btn--primary",
            onClick: () => {
              track("calculation_completed");
              setState({ view: "results" });
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => showCoursePopup(), 700);
            },
          },
          STRINGS.nav.calculate
        )
  );

  return el(
    "section",
    { class: "card wizard" },
    progress,
    el(
      "header",
      { class: "wizard__head" },
      el("h2", { class: "wizard__title" }, stepMeta.title),
      el("p", { class: "wizard__subtitle" }, stepMeta.subtitle),
      videoButton(step)
    ),
    content,
    nav
  );
}
