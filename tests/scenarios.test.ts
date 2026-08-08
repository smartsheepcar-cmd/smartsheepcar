import { describe, it, expect } from "vitest";
import { computeCarResult } from "../src/calc/totals";
import { compareResults, findDivergentCategory } from "../src/compare/compare";
import { validateCar } from "../src/validation/validate";
import { car, allFinite } from "./helpers";
import type { CategoryKey } from "../src/types";

// רכב "בסיס" סביר לשימוש חוזר בתרחישים
function baseGasoline(overrides = {}) {
  return car({
    fuelType: "gasoline",
    purchasePrice: 150000,
    holdingYears: 5,
    kmPerYear: 15000,
    consumptionUnit: "kmPerLiter",
    kmPerLiter: 14,
    fuelPricePerLiter: 7.4,
    insuranceMandatory: 1200,
    insuranceComprehensive: 4000,
    licenseFee: 1500,
    servicesAnnual: 1500,
    repairsAnnual: 1000,
    ...overrides,
  });
}

describe("תרחישי חישוב (ללא ירידת ערך)", () => {
  it("1. רכב בנזין ללא מימון", () => {
    const r = computeCarResult(baseGasoline());
    expect(r.financing.interestDuringHolding).toBe(0);
    expect(r.economicTotal).toBeGreaterThan(0);
    expect(allFinite(r)).toBe(true);
  });

  it("2. רכב בנזין עם הלוואה — הריבית נכללת בעלות", () => {
    const r = computeCarResult(
      baseGasoline({ hasLoan: true, downPayment: 50000, loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 60 })
    );
    expect(r.financing.monthlyPayment).toBeGreaterThan(0);
    expect(r.financing.interestDuringHolding).toBeGreaterThan(0);
    const financingCat = r.categories.find((c) => c.key === "financing")!;
    expect(financingCat.total).toBeCloseTo(r.financing.interestDuringHolding, 5);
  });

  it("3. רכב חשמלי עם טעינה ביתית וציבורית", () => {
    const r = computeCarResult(
      car({
        fuelType: "electric", purchasePrice: 180000, holdingYears: 5, kmPerYear: 18000,
        kwhPer100: 16, homeChargeShare: 0.7, homePricePerKwh: 0.55, publicPricePerKwh: 1.5,
      })
    );
    expect(r.energyKind).toBe("electric");
    expect(r.energyAnnual).toBeGreaterThan(0);
    expect(allFinite(r)).toBe(true);
  });

  it("4. מחיר הרכב הוא קטגוריה בעלות הכוללת", () => {
    const r = computeCarResult(baseGasoline({ purchasePrice: 150000 }));
    const purchaseCat = r.categories.find((c) => c.key === "purchase")!;
    expect(purchaseCat.total).toBe(150000);
  });

  it("5. השוואה: זול+בזבזני מול יקר+חסכוני", () => {
    const cheapThirsty = computeCarResult(
      car({ id: "a", name: "זול בזבזני", purchasePrice: 90000, holdingYears: 5, kmPerYear: 25000, kmPerLiter: 9, fuelPricePerLiter: 7.4 })
    );
    const pricedFrugal = computeCarResult(
      car({ id: "b", name: "יקר חסכוני", purchasePrice: 130000, holdingYears: 5, kmPerYear: 25000, kmPerLiter: 20, fuelPricePerLiter: 7.4 })
    );
    const verdict = compareResults([cheapThirsty, pricedFrugal]);
    expect(verdict.ranked.length).toBe(2);
    expect(verdict.ranked[0].economicTotal).toBeLessThanOrEqual(verdict.ranked[1].economicTotal);
  });

  it("6. הלוואה ארוכה יותר מתקופת ההחזקה", () => {
    const r = computeCarResult(
      baseGasoline({ holdingYears: 3, hasLoan: true, loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 84 })
    );
    expect(r.financing.loanLongerThanHolding).toBe(true);
    expect(r.financing.remainingBalanceAtEnd).toBeGreaterThan(0);
    expect(allFinite(r)).toBe(true);
  });

  it("7. נתונים חסרים — לא קורס, ללא NaN", () => {
    const r = computeCarResult(car({ purchasePrice: 120000, holdingYears: 4 }));
    expect(allFinite(r)).toBe(true);
    expect(r.economicTotal).toBeGreaterThanOrEqual(0);
  });

  it("8. ערכי אפס — ללא חלוקה באפס", () => {
    const r = computeCarResult(
      car({ purchasePrice: 0, holdingYears: 0, kmPerYear: 0, kmPerLiter: 0, loanMonths: 0, loanAmount: 0 })
    );
    expect(allFinite(r)).toBe(true);
    expect(r.costPerKm).toBe(0);
    expect(r.economicMonthly).toBe(0);
  });

  it("9. מספרים לא הגיוניים — אזהרות אך לא קריסה", () => {
    const input = car({
      purchasePrice: 100000, kmPerLiter: 100, annualInterestRate: 0.8,
      holdingYears: 40, loanAmount: 50000, loanMonths: 120,
    });
    const r = computeCarResult(input);
    const { warnings } = validateCar(input);
    expect(allFinite(r)).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("10. אין ספירה כפולה של קרן ההלוואה — ההפרש הוא רק הריבית", () => {
    const withoutLoan = computeCarResult(baseGasoline({ loanAmount: 0, annualInterestRate: 0, loanMonths: 0 }));
    const withLoan = computeCarResult(baseGasoline({ hasLoan: true, downPayment: 50000, loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 60 }));
    const diff = withLoan.economicTotal - withoutLoan.economicTotal;
    expect(diff).toBeCloseTo(withLoan.financing.interestDuringHolding, 4);
  });

  it("11. סכום הקטגוריות = העלות הכוללת", () => {
    const r = computeCarResult(
      baseGasoline({ hasLoan: true, downPayment: 40000, loanAmount: 110000, annualInterestRate: 0.08, loanMonths: 72, parkingMonthly: 400, tollsMonthly: 100, washingMonthly: 60 })
    );
    const sum = r.categories.reduce((s, c) => s + c.total, 0);
    expect(sum).toBeCloseTo(r.economicTotal, 4);
    const shareSum = r.categories.reduce((s, c) => s + c.share, 0);
    expect(shareSum).toBeCloseTo(1, 4);
  });
});

describe("השוואה — פער קטן לא מכריז מנצח", () => {
  it("שני רכבים כמעט זהים מסומנים כדומים", () => {
    const catList: CategoryKey[] = ["purchase", "energy", "insurance", "maintenance", "fees", "financing", "parkingTolls", "other"];
    expect(catList.length).toBe(8);
    const a = computeCarResult(baseGasoline({ id: "a", purchasePrice: 150000 }));
    const b = computeCarResult(baseGasoline({ id: "b", purchasePrice: 150500 }));
    const verdict = compareResults([a, b]);
    expect(verdict.similar).toBe(true);
  });

  it("פער דלק גדול בין רכבים מזוהה ומדווח, גם כשעלות הרכישה קרובה (תרחיש מהמשתמש)", () => {
    // תואם לתרחיש מהמשתמש: אחד צורך הרבה יותר דלק (קמ-לליטר נמוך)
    const thirsty = computeCarResult(
      baseGasoline({ id: "a", name: "רכב צורך הרבה", purchasePrice: 80000, kmPerLiter: 5.7, kmPerYear: 25000 })
    );
    const frugal = computeCarResult(
      baseGasoline({ id: "b", name: "רכב חסכוני", purchasePrice: 85000, kmPerLiter: 14, kmPerYear: 25000 })
    );
    const d = findDivergentCategory([thirsty, frugal]);
    expect(d).not.toBeNull();
    expect(d!.key).toBe("energy");
    expect(d!.highName).toBe("רכב צורך הרבה");
    expect(d!.lowName).toBe("רכב חסכוני");
    expect(d!.gapTotal).toBeGreaterThan(2000);
  });

  it("אין פער משמעותי -> לא מדווח כלום", () => {
    const a = computeCarResult(baseGasoline({ id: "a", purchasePrice: 150000 }));
    const b = computeCarResult(baseGasoline({ id: "b", purchasePrice: 150500 }));
    expect(findDivergentCategory([a, b])).toBeNull();
  });
});
