// ------------------------------------------------------------------
// עלות אנרגיה (דלק / חשמל).
//   דלק (ק"מ/ליטר):   ק"מ בשנה ÷ ק"מ-לליטר × מחיר ליטר
//   דלק (ל/100 ק"מ):  ק"מ בשנה ÷ 100 × ליטר-ל-100 × מחיר ליטר
//   חשמל:             ק"מ בשנה ÷ 100 × קוט"ש-ל-100 × מחיר אפקטיבי לקוט"ש
//   פלאג-אין:         שילוב - חלק מהק"מ על חשמל וחלק על דלק (הנחה מ-config)
// ------------------------------------------------------------------

import type { CarInput } from "../types";
import { toNumber } from "../format/format";

export interface EnergyResult {
  annual: number;
  total: number;
  kind: "fuel" | "electric" | "mixed";
}

/** עלות דלק שנתית עבור מספר ק"מ נתון */
function fuelAnnualCost(input: CarInput, km: number): number {
  const price = toNumber(input.fuelPricePerLiter);
  if (input.consumptionUnit === "kmPerLiter") {
    const kmPerLiter = toNumber(input.kmPerLiter);
    if (kmPerLiter <= 0) return 0; // מניעת חלוקה באפס
    return (km / kmPerLiter) * price;
  }
  const litersPer100 = toNumber(input.litersPer100);
  return (km / 100) * litersPer100 * price;
}

/** מחיר אפקטיבי לקוט"ש לפי פיצול טעינה בית/ציבור */
function effectiveKwhPrice(input: CarInput): number {
  const homeShare = clamp01(toNumber(input.homeChargeShare));
  const home = toNumber(input.homePricePerKwh);
  const pub = toNumber(input.publicPricePerKwh);
  return homeShare * home + (1 - homeShare) * pub;
}

/** עלות חשמל שנתית עבור מספר ק"מ נתון */
function electricAnnualCost(input: CarInput, km: number): number {
  const kwhPer100 = toNumber(input.kwhPer100);
  return (km / 100) * kwhPer100 * effectiveKwhPrice(input);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computeEnergy(input: CarInput): EnergyResult {
  const kmYear = toNumber(input.kmPerYear);
  const years = Math.max(0, toNumber(input.holdingYears));

  let annual: number;
  let kind: EnergyResult["kind"];

  switch (input.fuelType) {
    case "electric":
      annual = electricAnnualCost(input, kmYear);
      kind = "electric";
      break;
    case "plugin": {
      const elShare = clamp01(toNumber(input.pluginElectricShare));
      annual =
        electricAnnualCost(input, kmYear * elShare) +
        fuelAnnualCost(input, kmYear * (1 - elShare));
      kind = "mixed";
      break;
    }
    // בנזין / דיזל / היברידי - כולם מטופלים כרכב דלק
    // (צריכת הדלק שהוזנה כבר משקפת את יעילות ההיברידי).
    default:
      annual = fuelAnnualCost(input, kmYear);
      kind = "fuel";
      break;
  }

  return { annual, total: annual * years, kind };
}
