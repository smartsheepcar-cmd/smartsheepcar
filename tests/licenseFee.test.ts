import { describe, it, expect } from "vitest";
import { estimateLicenseFee, yearBand, BROADCAST_FEE } from "../src/calc/licenseFee";

describe("הערכת אגרת רישוי - רכב חדש (2024-2026)", () => {
  it("קבוצת מחיר נמוכה (עד 117,000) + תוספת שידור", () => {
    expect(estimateLicenseFee(90000, 2025)).toBe(1266 + BROADCAST_FEE);
    expect(estimateLicenseFee(117000, 2025)).toBe(1266 + BROADCAST_FEE);
  });
  it("קבוצת מחיר גבוהה (מעל 347,000)", () => {
    expect(estimateLicenseFee(400000, 2025)).toBe(5364 + BROADCAST_FEE);
  });
  it("קבוצת ביניים (141,001-167,000)", () => {
    expect(estimateLicenseFee(150000, 2025)).toBe(1941 + BROADCAST_FEE);
  });
  it("מחיר 0 או שלילי לא קורס - מחזיר את השכבה הזולה ביותר", () => {
    expect(estimateLicenseFee(0, 2025)).toBe(1266 + BROADCAST_FEE);
    expect(estimateLicenseFee(-500, 2025)).toBe(1266 + BROADCAST_FEE);
  });
  it("עולה מונוטונית עם המחיר", () => {
    const prices = [50000, 130000, 160000, 180000, 220000, 300000, 500000];
    const fees = prices.map((p) => estimateLicenseFee(p, 2025));
    for (let i = 1; i < fees.length; i++) {
      expect(fees[i]).toBeGreaterThanOrEqual(fees[i - 1]);
    }
  });
});

describe("הערכת אגרת רישוי - תלות בשנתון הרכב", () => {
  it("ממפה שנה לעמודה הנכונה בטבלה", () => {
    expect(yearBand(2026)).toBe("2024_2026");
    expect(yearBand(2024)).toBe("2024_2026");
    expect(yearBand(2023)).toBe("2021_2023");
    expect(yearBand(2021)).toBe("2021_2023");
    expect(yearBand(2020)).toBe("2017_2020");
    expect(yearBand(2017)).toBe("2017_2020");
    expect(yearBand(2016)).toBe("2016_or_earlier");
    expect(yearBand(2005)).toBe("2016_or_earlier");
  });

  it("רכב ישן משלם פחות מרכב חדש באותה קבוצת מחיר (עד 117,000)", () => {
    const newCar = estimateLicenseFee(100000, 2025);
    const car2019 = estimateLicenseFee(100000, 2019);
    const car2010 = estimateLicenseFee(100000, 2010);
    expect(newCar).toBe(1266 + BROADCAST_FEE);
    expect(car2019).toBe(972 + BROADCAST_FEE);
    expect(car2010).toBe(849 + BROADCAST_FEE);
    expect(car2010).toBeLessThan(car2019);
    expect(car2019).toBeLessThan(newCar);
  });

  it("בודק את כל העמודות בקבוצת המחיר הגבוהה ביותר (מעל 347,000)", () => {
    expect(estimateLicenseFee(400000, 2025)).toBe(5364 + BROADCAST_FEE);
    expect(estimateLicenseFee(400000, 2022)).toBe(3753 + BROADCAST_FEE);
    expect(estimateLicenseFee(400000, 2018)).toBe(2627 + BROADCAST_FEE);
    expect(estimateLicenseFee(400000, 2012)).toBe(1840 + BROADCAST_FEE);
  });

  it("שנה לא ידועה (undefined) נופלת לברירת המחדל - רכב חדש", () => {
    expect(estimateLicenseFee(90000)).toBe(estimateLicenseFee(90000, new Date().getFullYear()));
  });
});
