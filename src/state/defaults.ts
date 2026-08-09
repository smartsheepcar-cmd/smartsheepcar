// ------------------------------------------------------------------
// מפעל ליצירת רכב חדש עם ערכי התחלה סבירים (ריקים ברובם).
// משמש גם את ה-UI וגם את הבדיקות.
// ------------------------------------------------------------------

import type { CarInput } from "../types";
import { DEFAULT_HOME_CHARGE_SHARE, DEFAULT_PLUGIN_ELECTRIC_SHARE, ESTIMATES } from "../config";
import { estimateLicenseFee } from "../calc/licenseFee";

let counter = 0;

export function newId(): string {
  counter += 1;
  return `car_${Date.now().toString(36)}_${counter}`;
}

/**
 * שם התצוגה של הרכב: מעדיף תמיד את הדגם שנבחר (selectedModel), ורק אם
 * מעולם לא נבחר דגם נופל לשם השמור (או ל-fallback). זה גם מתקן רכבים
 * "תקועים" משיחות קודמות - selectedModel תמיד נשמר נכון גם אם name נתקע.
 */
export function carDisplayName(car: CarInput, fallback: string): string {
  return car.selectedModel || car.name || fallback;
}

export function createDefaultCar(name = "הרכב שלי", id = newId()): CarInput {
  return {
    id,
    name,
    fuelType: "gasoline",
    selectedModel: "",
    carYear: new Date().getFullYear(),

    purchasePrice: 0,
    holdingYears: 5,
    hasLoan: false,
    downPayment: 0,
    loanAmount: 0,
    annualInterestRate: 0,
    loanMonths: 0,
    loanType: "spitzer",
    loanBalloonAmount: 0,

    kmPerYear: 15000,
    consumptionUnit: "kmPerLiter",
    energyUnlocked: false,
    fuelPriceUnlocked: false,
    kmPerLiter: 14,
    litersPer100: 7,
    fuelPricePerLiter: ESTIMATES.fuelPricePerLiter,
    kwhPer100: ESTIMATES.kwhPer100,
    homeChargeShare: DEFAULT_HOME_CHARGE_SHARE,
    homePricePerKwh: 0.6,
    publicPricePerKwh: 1.4,
    pluginElectricShare: DEFAULT_PLUGIN_ELECTRIC_SHARE,
    parkingMonthly: 0,
    tollsMonthly: 0,
    washingMonthly: 0,

    insuranceMandatory: ESTIMATES.insuranceMandatory,
    insuranceComprehensive: ESTIMATES.insuranceComprehensive,
    licenseFee: estimateLicenseFee(0),
    licenseFeeUnlocked: false,
    servicesAnnual: ESTIMATES.servicesAnnual,
    repairsAnnual: ESTIMATES.repairsAnnual,
    tiresSetCost: 0,
    tiresIntervalMode: "years",
    tiresIntervalYears: 4,
    tiresIntervalKm: 60000,
    testAnnual: 0,
    customExpenseLabel: "",
    customExpenseAnnual: 0,

    // מסומן כהערכה כברירת מחדל -> נעילת מחיר הדלק, צריכת החשמל, מחירי הטעינה ואגרת הרישוי בפתיחה
    estimated: {
      fuelPricePerLiter: true,
      kwhPer100: true,
      licenseFee: true,
      homePricePerKwh: true,
      publicPricePerKwh: true,
    },
    consumptionIsGenericEstimate: false,
    copiedFromPreviousCar: false,
    copiedUsage: false,
    copiedInsurance: false,
  };
}
