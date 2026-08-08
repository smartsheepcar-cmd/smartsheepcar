import { describe, it, expect } from "vitest";
import { computeEnergy } from "../src/calc/energy";
import { computeFinancing, monthlyPayment } from "../src/calc/financing";
import { car } from "./helpers";

describe("עלות אנרגיה", () => {
  it("דלק לפי ק\"מ לליטר", () => {
    const e = computeEnergy(
      car({ fuelType: "gasoline", kmPerYear: 15000, consumptionUnit: "kmPerLiter", kmPerLiter: 15, fuelPricePerLiter: 7, holdingYears: 1 })
    );
    expect(e.annual).toBeCloseTo(7000, 5);
    expect(e.kind).toBe("fuel");
  });

  it("דלק לפי ליטר ל-100 ק\"מ", () => {
    const e = computeEnergy(
      car({ fuelType: "gasoline", kmPerYear: 15000, consumptionUnit: "litersPer100", litersPer100: 8, fuelPricePerLiter: 7, holdingYears: 2 })
    );
    expect(e.annual).toBeCloseTo(8400, 5);
    expect(e.total).toBeCloseTo(16800, 5);
  });

  it("חשמל עם פיצול טעינה בית/ציבור", () => {
    const e = computeEnergy(
      car({ fuelType: "electric", kmPerYear: 15000, kwhPer100: 16, homeChargeShare: 0.8, homePricePerKwh: 0.6, publicPricePerKwh: 1.4, holdingYears: 1 })
    );
    // מחיר אפקטיבי = 0.8*0.6 + 0.2*1.4 = 0.76 ; 150*16*0.76 = 1824
    expect(e.annual).toBeCloseTo(1824, 5);
    expect(e.kind).toBe("electric");
  });

  it("פלאג-אין = חלק חשמלי + חלק דלק", () => {
    const e = computeEnergy(
      car({
        fuelType: "plugin", kmPerYear: 15000, pluginElectricShare: 0.6,
        kwhPer100: 16, homeChargeShare: 1, homePricePerKwh: 0.6,
        consumptionUnit: "kmPerLiter", kmPerLiter: 15, fuelPricePerLiter: 7, holdingYears: 1,
      })
    );
    // חשמל: 9000 ק"מ → 90*16*0.6 = 864 ; דלק: 6000 ק"מ → 6000/15*7 = 2800
    expect(e.annual).toBeCloseTo(864 + 2800, 5);
    expect(e.kind).toBe("mixed");
  });
});

describe("מימון", () => {
  it("החזר חודשי ללא ריבית = קרן / חודשים", () => {
    expect(monthlyPayment(12000, 0, 12)).toBeCloseTo(1000, 5);
  });

  it("החזר חודשי בנוסחת שפיצר", () => {
    const M = monthlyPayment(100000, 0.1, 60);
    expect(M).toBeCloseTo(2124.7, 1);
  });

  it("כשההלוואה קצרה מההחזקה — כל הריבית נצברת בתקופה", () => {
    const f = computeFinancing(
      car({ loanAmount: 100000, annualInterestRate: 0.1, loanMonths: 60 }),
      60
    );
    expect(f.interestDuringHolding).toBeCloseTo(f.totalInterestFull, 2);
    expect(f.remainingBalanceAtEnd).toBeCloseTo(0, 2);
    expect(f.loanLongerThanHolding).toBe(false);
  });

  it("כשההלוואה ארוכה מההחזקה — יש יתרה וריבית חלקית", () => {
    const f = computeFinancing(
      car({ loanAmount: 100000, annualInterestRate: 0.1, loanMonths: 84 }),
      36
    );
    expect(f.loanLongerThanHolding).toBe(true);
    expect(f.remainingBalanceAtEnd).toBeGreaterThan(0);
    expect(f.interestDuringHolding).toBeLessThan(f.totalInterestFull);
    expect(f.interestDuringHolding).toBeGreaterThan(0);
  });
});
