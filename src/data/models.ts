// ------------------------------------------------------------------
// models.ts - גישה למאגר דגמי הרכב (נטען מ-models.json, נבנה מ-data.gov.il).
// מספק חיפוש קל-משקל ומיפוי קוד-דלק לסוג רכב.
// ------------------------------------------------------------------

import raw from "./models.json";
import type { FuelType } from "../types";

export type FuelCode = "g" | "d" | "e" | "h" | "p";

export interface ModelEntry {
  make: string;
  model: string;
  fuel: FuelCode;
  l100: number | null;
  label: string;
  /** מספר רישומים כולל - פרוקסי לפופולריות, ראו groupModelResults */
  count: number;
}

interface RawData {
  generatedAt: string;
  source: string;
  count: number;
  makes: Record<string, [string, FuelCode, number | null, number][]>;
}

const data = raw as unknown as RawData;

export const FUEL_CODE_TO_TYPE: Record<FuelCode, FuelType> = {
  g: "gasoline",
  d: "diesel",
  e: "electric",
  h: "hybrid",
  p: "plugin",
};

let flat: ModelEntry[] | null = null;

export function allModels(): ModelEntry[] {
  if (flat) return flat;
  flat = [];
  for (const [make, list] of Object.entries(data.makes)) {
    for (const [model, fuel, l100, count] of list) {
      flat.push({ make, model, fuel, l100, label: `${make} ${model}`, count: count ?? 1 });
    }
  }
  return flat;
}

/** חיפוש: כל מילות החיפוש חייבות להופיע ב"יצרן דגם" (לא תלוי רישיות) */
export function searchModels(query: string, limit = 40): ModelEntry[] {
  const s = query.trim().toLowerCase();
  if (s.length < 1) return [];
  const terms = s.split(/\s+/).filter(Boolean);
  const res: ModelEntry[] = [];
  for (const m of allModels()) {
    const hay = m.label.toLowerCase();
    if (terms.every((t) => hay.includes(t))) {
      res.push(m);
      if (res.length >= limit) break;
    }
  }
  return res;
}

export interface ModelGroup {
  primary: ModelEntry;
  /** גרסאות/סוגי-דלק/תת-דגמים נוספים של אותו דגם - מוצג מקופל תחת "תת-דגמים נוספים" */
  extras: ModelEntry[];
}

function normForGrouping(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9א-ת]/g, "");
}

/**
 * בודק אם baseNorm הוא "בסיס" תקין של longerNorm (כלומר longerNorm הוא
 * גרסה/תת-דגם של אותו דגם בסיסי). חוסם את המקרה הבעייתי שבו baseNorm
 * מסתיים בספרה וההמשך ב-longerNorm הוא עוד ספרה - זה כמעט תמיד סימן
 * לדגם שונה לגמרי (למשל "CX3" הוא תחילית מחרוזתית של "CX30", אבל אלה
 * שני דגמים נפרדים - מזדה CX-3 מול CX-30 - לא גרסאות של אותו דגם).
 */
function isValidBase(baseNorm: string, longerNorm: string): boolean {
  if (!longerNorm.startsWith(baseNorm)) return false;
  if (baseNorm === longerNorm) return true;
  if (!/[0-9]$/.test(baseNorm)) return true;
  return !/[0-9]/.test(longerNorm[baseNorm.length]);
}

/**
 * מקבץ תוצאות חיפוש: מאחד גרסאות/סוגי-דלק/תת-דגמים שונים של אותו דגם
 * (לפי יצרן + תחילית מנורמלת משותפת - ראו isValidBase) לשורה אחת עם
 * "primary" (הגרסה עם הכי הרבה רישומים - פרוקסי לפופולריות) ו-"extras"
 * (שאר הגרסאות, מוצגות רק בלחיצה על "תת-דגמים נוספים של רכב זה").
 */
export function groupModelResults(entries: ModelEntry[]): ModelGroup[] {
  const byMake = new Map<string, ModelEntry[]>();
  for (const e of entries) {
    const list = byMake.get(e.make);
    if (list) list.push(e);
    else byMake.set(e.make, [e]);
  }

  const groups: ModelGroup[] = [];
  for (const list of byMake.values()) {
    const withNorm = list
      .map((e) => ({ e, norm: normForGrouping(e.model) }))
      .sort((a, b) => a.norm.length - b.norm.length);
    const bases: { norm: string; members: ModelEntry[] }[] = [];
    for (const { e, norm } of withNorm) {
      const base = bases.find((b) => isValidBase(b.norm, norm));
      if (base) base.members.push(e);
      else bases.push({ norm, members: [e] });
    }
    for (const b of bases) {
      const sorted = [...b.members].sort((x, y) => y.count - x.count);
      groups.push({ primary: sorted[0], extras: sorted.slice(1) });
    }
  }
  return groups;
}

/** כמו searchModels, אבל מקובץ - שורה אחת פר "דגם בסיסי", עם תת-דגמים מקופלים */
export function searchModelGroups(query: string, limit = 12): ModelGroup[] {
  const raw = searchModels(query, 200);
  return groupModelResults(raw).slice(0, limit);
}

export const MODELS_SOURCE = data.source;
export const MODELS_COUNT = data.count;
