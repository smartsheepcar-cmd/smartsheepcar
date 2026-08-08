import { createDefaultCar } from "../src/state/defaults";
import type { CarInput } from "../src/types";

/** בונה רכב מברירת המחדל עם דריסות נקודתיות */
export function car(overrides: Partial<CarInput> = {}): CarInput {
  return { ...createDefaultCar("test", "test"), ...overrides };
}

/** בדיקה שכל המספרים בתוצאה סופיים (לא NaN / Infinity) */
export function allFinite(obj: unknown): boolean {
  if (typeof obj === "number") return isFinite(obj);
  if (Array.isArray(obj)) return obj.every(allFinite);
  if (obj && typeof obj === "object") {
    return Object.values(obj).every(allFinite);
  }
  return true;
}
