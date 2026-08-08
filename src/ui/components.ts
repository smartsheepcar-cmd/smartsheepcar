// ------------------------------------------------------------------
// components.ts - רכיבי טופס נגישים לשימוש חוזר: שדה מספר, טקסט,
// בחירה, "מגירת" בחירה (segmented), אייקון מידע, ותג הערכה.
// כל שדה כולל label מקושר, aria, ומצב שגיאה/הערכה.
// ------------------------------------------------------------------

import { el } from "./dom";
import { STRINGS } from "../strings";
import { parseNumberInput, formatNumber, liveFormatNumber } from "../format/format";

let uid = 0;
const nextId = () => `f${++uid}`;

/** אייקון מידע קטן עם הסבר (טולטיפ נגיש) */
export function infoIcon(text?: string): HTMLElement | null {
  if (!text) return null;
  const tipId = nextId();
  return el(
    "span",
    { class: "info" },
    el(
      "button",
      {
        type: "button",
        class: "info__btn",
        "aria-label": text,
        "aria-describedby": tipId,
      },
      "i"
    ),
    el("span", { class: "info__tip", role: "tooltip", id: tipId }, text)
  );
}


interface FieldMeta {
  label: string;
  info?: string;
  unit?: string;
}

function meta(fieldKey: string): FieldMeta {
  return STRINGS.fields[fieldKey] ?? { label: fieldKey };
}

interface NumberFieldOpts {
  fieldKey: string;
  value: number;
  placeholder?: string;
  /** נקרא בכל שינוי ערך (ללא רינדור מלא) */
  onChange: (value: number) => void;
  labelOverride?: string;
}

export function numberField(opts: NumberFieldOpts): HTMLElement {
  const m = meta(opts.fieldKey);
  const id = nextId();
  const errId = nextId();

  const error = el("div", { class: "field__error", id: errId, role: "alert" });

  const input = el("input", {
    id,
    type: "text",
    inputmode: "decimal",
    class: "field__input",
    value: opts.value ? formatNumber(opts.value, 2).replace(/\.00$/, "") : "",
    placeholder: opts.placeholder ?? "0",
    "aria-describedby": errId,
    onInput: (e: Event) => {
      const target = e.target as HTMLInputElement;
      const rawBefore = target.value;
      const cursorBefore = target.selectionStart ?? rawBefore.length;
      // סופרים ספרות לפני הסמן כדי לשחזר את מיקומו אחרי הוספת/הסרת פסיקים
      const digitsBeforeCursor = rawBefore.slice(0, cursorBefore).replace(/[^\d]/g, "").length;

      const formatted = liveFormatNumber(rawBefore);
      if (formatted !== rawBefore) {
        target.value = formatted;
        let digitsSeen = 0;
        let newCursor = formatted.length;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) digitsSeen++;
          if (digitsSeen >= digitsBeforeCursor) {
            newCursor = i + 1;
            break;
          }
        }
        if (digitsBeforeCursor === 0) newCursor = 0;
        target.setSelectionRange(newCursor, newCursor);
      }

      const parsed = parseNumberInput(formatted);
      if (parsed != null && parsed < 0) {
        input.classList.add("field__input--error");
        error.textContent = "לא ניתן להזין מספר שלילי";
        return;
      }
      input.classList.remove("field__input--error");
      error.textContent = "";
      opts.onChange(parsed ?? 0);
    },
  });

  const unit = m.unit ? el("span", { class: "field__unit" }, m.unit) : null;

  const labelRow = el(
    "div",
    { class: "field__labelrow" },
    el("label", { class: "field__label", for: id }, opts.labelOverride ?? m.label),
    m.info ? infoIcon(m.info) : null
  );

  const controlRow = el("div", { class: "field__control" }, input, unit);

  return el("div", { class: "field" }, labelRow, controlRow, error);
}

interface TextFieldOpts {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  labelOverride?: string;
  placeholder?: string;
}

export function textField(opts: TextFieldOpts): HTMLElement {
  const m = meta(opts.fieldKey);
  const id = nextId();
  const input = el("input", {
    id,
    type: "text",
    class: "field__input",
    value: opts.value ?? "",
    placeholder: opts.placeholder ?? "",
    onInput: (e: Event) => opts.onChange((e.target as HTMLInputElement).value),
  });
  return el(
    "div",
    { class: "field" },
    el(
      "div",
      { class: "field__labelrow" },
      el("label", { class: "field__label", for: id }, opts.labelOverride ?? m.label),
      m.info ? infoIcon(m.info) : null
    ),
    el("div", { class: "field__control" }, input)
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedOpts<T extends string> {
  legend: string;
  info?: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/** בורר מסוג radio בעיצוב "מגירות" - נגיש (fieldset/legend + radio) */
export function segmented<T extends string>(opts: SegmentedOpts<T>): HTMLElement {
  const items = opts.options.map((o) => {
    const id = nextId();
    return el(
      "label",
      { class: opts.value === o.value ? "segment segment--active" : "segment", for: id },
      el("input", {
        id,
        type: "radio",
        name: opts.name,
        class: "segment__input",
        value: o.value,
        checked: opts.value === o.value ? true : false,
        onChange: () => opts.onChange(o.value),
      }),
      el("span", {}, o.label)
    );
  });
  return el(
    "fieldset",
    { class: "field field--segmented" },
    el(
      "legend",
      { class: "field__label" },
      opts.legend,
      opts.info ? infoIcon(opts.info) : null
    ),
    el("div", { class: "segments" }, ...items)
  );
}
