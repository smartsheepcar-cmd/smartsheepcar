// ------------------------------------------------------------------
// totals.ts - האגרגטור הראשי. מרכיב תוצאה מלאה לרכב אחד.
//
// העלות הכוללת = מחיר הרכב + ריבית המימון + אנרגיה + ביטוח + תחזוקה +
//                אגרות + חניה/אגרה + הוצאות נוספות, לאורך תקופת ההחזקה.
//
// אין רכיב ירידת ערך (הוסר במכוון - משתנה מדי בין רכב לרכב).
// אי-ספירה-כפולה: קרן ההלוואה אינה נספרת בנפרד - היא חלק ממחיר הרכב.
// שלמות: economicTotal מוגדר כסכום הקטגוריות, ולכן תמיד שווה להן.
// ------------------------------------------------------------------

import type {
  CarInput,
  CarResult,
  CategoryBreakdown,
  CategoryKey,
} from "../types";
import { toNumber } from "../format/format";
import { computeEnergy } from "./energy";
import { computeFinancing } from "./financing";
import { plausibilityWarnings } from "../validation/validate";

/** עלות צמיגים שנתית */
function annualTireCost(input: CarInput): number {
  const setCost = toNumber(input.tiresSetCost);
  if (setCost <= 0) return 0;
  if (input.tiresIntervalMode === "years") {
    const years = toNumber(input.tiresIntervalYears);
    return years > 0 ? setCost / years : 0;
  }
  const km = toNumber(input.tiresIntervalKm);
  if (km <= 0) return 0;
  return setCost * (toNumber(input.kmPerYear) / km);
}

export function computeCarResult(input: CarInput): CarResult {
  const years = Math.max(0, toNumber(input.holdingYears));
  const holdingMonths = Math.round(years * 12);
  const kmYear = toNumber(input.kmPerYear);
  const totalKm = kmYear * years;

  const energy = computeEnergy(input);
  const financing = computeFinancing(input, holdingMonths);

  // סכומי הקטגוריות לכל תקופת ההחזקה
  const totals: Record<CategoryKey, number> = {
    purchase: toNumber(input.purchasePrice),
    energy: energy.total,
    insurance:
      (toNumber(input.insuranceMandatory) +
        toNumber(input.insuranceComprehensive)) *
      years,
    maintenance:
      (toNumber(input.servicesAnnual) +
        toNumber(input.repairsAnnual) +
        annualTireCost(input)) *
      years,
    fees: (toNumber(input.licenseFee) + toNumber(input.testAnnual)) * years,
    financing: financing.interestDuringHolding,
    parkingTolls:
      (toNumber(input.parkingMonthly) + toNumber(input.tollsMonthly)) *
      holdingMonths,
    other:
      toNumber(input.washingMonthly) * holdingMonths +
      toNumber(input.customExpenseAnnual) * years,
  };

  const economicTotal = (Object.keys(totals) as CategoryKey[]).reduce(
    (sum, key) => sum + totals[key],
    0
  );

  const categories: CategoryBreakdown[] = (Object.keys(totals) as CategoryKey[]).map(
    (key) => ({
      key,
      total: totals[key],
      monthly: holdingMonths > 0 ? totals[key] / holdingMonths : 0,
      share: economicTotal !== 0 ? totals[key] / economicTotal : 0,
    })
  );

  return {
    input,
    holdingMonths,
    totalKm,
    energyAnnual: energy.annual,
    energyTotal: energy.total,
    energyKind: energy.kind,
    financing,
    categories,
    economicTotal,
    economicAnnual: years > 0 ? economicTotal / years : 0,
    economicMonthly: holdingMonths > 0 ? economicTotal / holdingMonths : 0,
    costPerKm: totalKm > 0 ? economicTotal / totalKm : 0,
    warnings: plausibilityWarnings(input),
  };
}
