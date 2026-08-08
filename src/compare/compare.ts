// ------------------------------------------------------------------
// compare.ts - לוגיקת השוואה טהורה (ללא UI), כדי שתהיה ניתנת לבדיקה.
// לא מכריזים "מנצח" כאשר הפער קטן מהספים ב-config - אז מציינים
// שהעלויות דומות ויש לשקול גם נוחות/בטיחות/אמינות.
// ------------------------------------------------------------------

import type { CarResult, CategoryKey } from "../types";
import { SIMILARITY } from "../config";
import { carDisplayName } from "../state/defaults";

export interface RankedCar {
  id: string;
  name: string;
  economicTotal: number;
  economicMonthly: number;
}

export interface ComparisonVerdict {
  ranked: RankedCar[];
  cheapestId: string | null;
  /** האם הפער בין הזול לשני קטן מספי הדמיון */
  similar: boolean;
  gapToNextTotal: number;
  gapToNextMonthly: number;
  relativeGap: number;
}

export function compareResults(results: CarResult[]): ComparisonVerdict {
  const ranked: RankedCar[] = results
    .map((r, i) => ({
      id: r.input.id,
      name: carDisplayName(r.input, `רכב ${i + 1}`),
      economicTotal: r.economicTotal,
      economicMonthly: r.economicMonthly,
    }))
    .sort((a, b) => a.economicTotal - b.economicTotal);

  if (ranked.length < 2) {
    return {
      ranked,
      cheapestId: ranked[0]?.id ?? null,
      similar: false,
      gapToNextTotal: 0,
      gapToNextMonthly: 0,
      relativeGap: 0,
    };
  }

  const cheapest = ranked[0];
  const next = ranked[1];
  const gapToNextTotal = next.economicTotal - cheapest.economicTotal;
  const gapToNextMonthly = next.economicMonthly - cheapest.economicMonthly;
  const relativeGap =
    cheapest.economicTotal !== 0
      ? gapToNextTotal / Math.abs(cheapest.economicTotal)
      : 0;
  const similar =
    relativeGap < SIMILARITY.maxRelativeGap &&
    gapToNextMonthly < SIMILARITY.maxMonthlyGap;

  return {
    ranked,
    cheapestId: cheapest.id,
    similar,
    gapToNextTotal,
    gapToNextMonthly,
    relativeGap,
  };
}

const COMPARE_CATEGORIES: CategoryKey[] = [
  "purchase",
  "energy",
  "insurance",
  "maintenance",
  "fees",
  "financing",
  "parkingTolls",
  "other",
];

/** ספי "פער משמעותי" בקטגוריה בודדת - גם אם העלות הכוללת דומה */
const DIVERGENCE = {
  minAbsoluteGap: 2000, // ₪ לכל התקופה
  minRelativeGap: 0.4, // הזול חייב להיות זול ב-40%+ מהיקר בקטגוריה
} as const;

export interface DivergentCategory {
  key: CategoryKey;
  highName: string;
  lowName: string;
  highTotal: number;
  lowTotal: number;
  gapTotal: number;
  gapMonthly: number;
}

/**
 * מוצא את הקטגוריה עם הפער הכספי הגדול ביותר בין הרכבים המושווים,
 * גם כאשר העלות הכוללת דומה. מיועד לחשוף מקרים כמו "הדלק בדגם אחד
 * יקר משמעותית מהשני" שמוסתרים כשמסתכלים רק על הסכום הכולל.
 */
export function findDivergentCategory(results: CarResult[]): DivergentCategory | null {
  if (results.length < 2) return null;
  const months = results[0]?.holdingMonths || 1;

  let best: DivergentCategory | null = null;
  for (const key of COMPARE_CATEGORIES) {
    const vals = results.map((r, i) => ({
      name: carDisplayName(r.input, `רכב ${i + 1}`),
      total: r.categories.find((c) => c.key === key)?.total ?? 0,
    }));
    const sorted = [...vals].sort((a, b) => b.total - a.total);
    const high = sorted[0];
    const low = sorted[sorted.length - 1];
    const gapTotal = high.total - low.total;
    if (gapTotal < DIVERGENCE.minAbsoluteGap) continue;
    const relGap = low.total > 0 ? gapTotal / low.total : 1;
    if (relGap < DIVERGENCE.minRelativeGap) continue;
    if (!best || gapTotal > best.gapTotal) {
      best = {
        key,
        highName: high.name,
        lowName: low.name,
        highTotal: high.total,
        lowTotal: low.total,
        gapTotal,
        gapMonthly: gapTotal / months,
      };
    }
  }
  return best;
}
