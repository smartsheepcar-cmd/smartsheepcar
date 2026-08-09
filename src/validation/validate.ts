// ------------------------------------------------------------------
// בדיקות קלט.
//   errors   - שגיאות קשות (מספרים שליליים) → מוצג ליד השדה, חוסם חישוב.
//   warnings - אזהרות רכות (ערכים לא סבירים) → מוצג אך אינו חוסם.
// חלוקה באפס נמנעת בשכבת החישוב עצמה (calc/*).
// ------------------------------------------------------------------

import type { CarInput, Warning } from "../types";
import { PLAUSIBILITY } from "../config";
import { toNumber } from "../format/format";

/** שדות מספריים שאסור שיהיו שליליים */
const NON_NEGATIVE_FIELDS: (keyof CarInput)[] = [
  "purchasePrice",
  "holdingYears",
  "downPayment",
  "loanAmount",
  "annualInterestRate",
  "loanMonths",
  "loanBalloonAmount",
  "kmPerYear",
  "kmPerLiter",
  "litersPer100",
  "fuelPricePerLiter",
  "kwhPer100",
  "homePricePerKwh",
  "publicPricePerKwh",
  "parkingMonthly",
  "tollsMonthly",
  "washingMonthly",
  "insuranceMandatory",
  "insuranceComprehensive",
  "licenseFee",
  "servicesAnnual",
  "repairsAnnual",
  "tiresSetCost",
  "tiresIntervalYears",
  "tiresIntervalKm",
  "testAnnual",
  "customExpenseAnnual",
];

export function negativeErrors(input: CarInput): Warning[] {
  const errors: Warning[] = [];
  for (const field of NON_NEGATIVE_FIELDS) {
    const value = input[field] as unknown;
    if (typeof value === "number" && value < 0) {
      errors.push({ field, message: "לא ניתן להזין מספר שלילי" });
    }
  }
  return errors;
}

export function plausibilityWarnings(input: CarInput): Warning[] {
  const warnings: Warning[] = [];

  if (
    input.consumptionUnit === "kmPerLiter" &&
    toNumber(input.kmPerLiter) > PLAUSIBILITY.maxKmPerLiter
  ) {
    warnings.push({
      field: "kmPerLiter",
      message: `צריכת דלק של יותר מ-${PLAUSIBILITY.maxKmPerLiter} ק"מ לליטר נדירה מאוד. שווה לבדוק שוב.`,
    });
  }
  if (toNumber(input.annualInterestRate) > PLAUSIBILITY.maxInterestRate) {
    warnings.push({
      field: "annualInterestRate",
      message: "הריבית שהוזנה גבוהה במיוחד. שווה לבדוק שוב.",
    });
  }
  if (toNumber(input.holdingYears) > PLAUSIBILITY.maxHoldingYears) {
    warnings.push({
      field: "holdingYears",
      message: "תקופת החזקה ארוכה במיוחד. שווה לבדוק שוב.",
    });
  }
  if (toNumber(input.kmPerYear) > PLAUSIBILITY.maxKmPerYear) {
    warnings.push({
      field: "kmPerYear",
      message: "מספר קילומטרים גבוה במיוחד לשנה. שווה לבדוק שוב.",
    });
  }
  return warnings;
}

/**
 * אזהרה רכה כשתשלום הבלון גבוה יחסית למחיר הרכב - מוצגת inline בשלב 1
 * (אזור המימון) בזמן המילוי, ולא באזהרות הכלליות במסך התוצאות.
 */
export function balloonPlausibilityWarning(input: CarInput): Warning | null {
  if (
    input.hasLoan &&
    input.loanType === "balloon" &&
    toNumber(input.loanBalloonAmount) >
      toNumber(input.purchasePrice) * PLAUSIBILITY.maxBalloonSharePct
  ) {
    return {
      field: "loanBalloonAmount",
      message: "תשלום הבלון שהזנת גבוה יחסית למחיר הרכב (מעל 30%) - יכול להיות שיהיה קשה למחזר או לכסות אותו בסוף התקופה.",
    };
  }
  return null;
}

export function validateCar(input: CarInput): {
  errors: Warning[];
  warnings: Warning[];
} {
  return {
    errors: negativeErrors(input),
    warnings: plausibilityWarnings(input),
  };
}
