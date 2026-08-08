import { describe, it, expect } from "vitest";
import { estimateInsurance, type InsuranceInput } from "../src/calc/insurance";

const base: InsuranceInput = {
  carValue: 150000,
  ageBand: "30_50",
  experience: "gt6",
  claims: "0",
  coverage: "comprehensive",
};

describe("הערכת ביטוח", () => {
  it("סה\"כ = חובה + מקיף/צד ג'", () => {
    const e = estimateInsurance(base);
    expect(e.total).toBe(e.mandatory + e.comprehensive);
    expect(e.mandatory).toBeGreaterThan(0);
    expect(e.comprehensive).toBeGreaterThan(0);
  });

  it("חובה בלבד -> אין מקיף", () => {
    const e = estimateInsurance({ ...base, coverage: "mandatory" });
    expect(e.comprehensive).toBe(0);
    expect(e.total).toBe(e.mandatory);
  });

  it("נהג צעיר יקר יותר מנהג מבוגר", () => {
    const young = estimateInsurance({ ...base, ageBand: "u24" });
    const older = estimateInsurance({ ...base, ageBand: "30_50" });
    expect(young.total).toBeGreaterThan(older.total);
  });

  it("תביעות מייקרות את המקיף", () => {
    const clean = estimateInsurance({ ...base, claims: "0" });
    const claimed = estimateInsurance({ ...base, claims: "2plus" });
    expect(claimed.comprehensive).toBeGreaterThan(clean.comprehensive);
  });

  it("צד ג' זול ממקיף (לרכב בשווי סביר)", () => {
    const third = estimateInsurance({ ...base, coverage: "third" });
    const comp = estimateInsurance({ ...base, coverage: "comprehensive" });
    expect(third.comprehensive).toBeLessThan(comp.comprehensive);
  });
});
