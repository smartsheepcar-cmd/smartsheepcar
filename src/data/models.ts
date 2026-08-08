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
}

interface RawData {
  generatedAt: string;
  source: string;
  count: number;
  makes: Record<string, [string, FuelCode, number | null][]>;
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
    for (const [model, fuel, l100] of list) {
      flat.push({ make, model, fuel, l100, label: `${make} ${model}` });
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

export const MODELS_SOURCE = data.source;
export const MODELS_COUNT = data.count;
