import { describe, it, expect } from "vitest";
import { monthlyPayment, computeFinancing } from "../src/calc/financing";
import { validateCar } from "../src/validation/validate";
import { car } from "./helpers";

describe("monthlyPayment - הלוואת בלון", () => {
  it("בלון=0 שקול בדיוק להלוואה רגילה (ריבית>0)", () => {
    const withBalloon = monthlyPayment(100000, 0.09, 60, 0);
    const regular = monthlyPayment(100000, 0.09, 60);
    expect(withBalloon).toBeCloseTo(regular, 6);
  });

  it("בלון=0 שקול בדיוק להלוואה רגילה (ריבית=0)", () => {
    expect(monthlyPayment(120000, 0, 24, 0)).toBeCloseTo(monthlyPayment(120000, 0, 24), 6);
  });

  it("בלון מקטין את ההחזר החודשי ביחס להלוואה רגילה על אותה קרן", () => {
    const regular = monthlyPayment(100000, 0.09, 60, 0);
    const withBalloon = monthlyPayment(100000, 0.09, 60, 30000);
    expect(withBalloon).toBeLessThan(regular);
    expect(withBalloon).toBeGreaterThan(0);
  });

  it("סימולציית לוח סילוקין מלא מתכנסת בדיוק לגובה הבלון בתום ההלוואה (לא לאפס)", () => {
    const principal = 100000;
    const annualRate = 0.08;
    const n = 48;
    const balloon = 25000;
    const M = monthlyPayment(principal, annualRate, n, balloon);
    const r = annualRate / 12;
    let balance = principal;
    for (let i = 0; i < n; i++) {
      const interest = balance * r;
      balance -= M - interest;
    }
    expect(balance).toBeCloseTo(balloon, 4);
  });
});

describe("computeFinancing - הלוואת בלון", () => {
  it("ללא בלון: התנהגות זהה למצב הקודם (regression)", () => {
    const input = car({ loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 60, loanBalloonAmount: 0 });
    const f = computeFinancing(input, 60);
    expect(f.balloonAmount).toBe(0);
    expect(f.remainingBalanceAtEnd).toBeCloseTo(0, 4);
    expect(f.totalInterestFull).toBeCloseTo(f.monthlyPayment * 60 - f.principal, 6);
  });

  it("עם בלון: הריבית שנצברה גבוהה מ-0, והיתרה בסוף ההלוואה שווה לבלון", () => {
    const input = car({ loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 60, loanBalloonAmount: 20000 });
    const f = computeFinancing(input, 60);
    expect(f.interestDuringHolding).toBeGreaterThan(0);
    expect(f.remainingBalanceAtEnd).toBeCloseTo(20000, 3);
    expect(f.balloonAmount).toBe(20000);
  });

  it("totalInterestFull כולל את תשלום הבלון (M*n + בלון - קרן)", () => {
    const input = car({ loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 60, loanBalloonAmount: 20000 });
    const f = computeFinancing(input, 60);
    expect(f.totalInterestFull).toBeCloseTo(f.monthlyPayment * 60 + 20000 - 100000, 6);
  });

  it("בלון גדול מהקרן נחתך לגובה הקרן (הגנה מפני קלט לא הגיוני)", () => {
    const input = car({ loanAmount: 50000, annualInterestRate: 0.08, loanMonths: 36, loanBalloonAmount: 999999 });
    const f = computeFinancing(input, 36);
    expect(f.balloonAmount).toBe(50000);
    expect(f.monthlyPayment).toBeGreaterThanOrEqual(0);
  });

  it("החזקה קצרה מההלוואה: הריבית שנצברה נמדדת רק עד סוף ההחזקה, לא עד הבלון", () => {
    const input = car({ loanAmount: 100000, annualInterestRate: 0.09, loanMonths: 60, loanBalloonAmount: 20000 });
    const fullTerm = computeFinancing(input, 60);
    const partialTerm = computeFinancing(input, 24);
    expect(partialTerm.interestDuringHolding).toBeLessThan(fullTerm.interestDuringHolding);
    expect(partialTerm.remainingBalanceAtEnd).toBeGreaterThan(fullTerm.remainingBalanceAtEnd);
  });
});

describe("אזהרת סבירות - בלון גבוה יחסית למחיר הרכב", () => {
  it("מזהיר כשהבלון עולה על 30% ממחיר הרכב", () => {
    const input = car({
      purchasePrice: 100000,
      hasLoan: true,
      loanAmount: 80000,
      annualInterestRate: 0.08,
      loanMonths: 48,
      loanBalloonAmount: 35000,
    });
    const { warnings } = validateCar(input);
    expect(warnings.some((w) => w.field === "loanBalloonAmount")).toBe(true);
  });

  it("לא מזהיר כשהבלון סביר (מתחת ל-30%)", () => {
    const input = car({
      purchasePrice: 100000,
      hasLoan: true,
      loanAmount: 80000,
      annualInterestRate: 0.08,
      loanMonths: 48,
      loanBalloonAmount: 15000,
    });
    const { warnings } = validateCar(input);
    expect(warnings.some((w) => w.field === "loanBalloonAmount")).toBe(false);
  });
});
