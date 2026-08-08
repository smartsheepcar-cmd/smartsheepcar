import { describe, it, expect } from "vitest";
import { allModels, searchModels, FUEL_CODE_TO_TYPE } from "../src/data/models";

describe("מאגר הדגמים", () => {
  it("נטען ומכיל אלפי דגמים", () => {
    const all = allModels();
    expect(all.length).toBeGreaterThan(4000);
    // כל רשומה תקינה
    for (const m of all.slice(0, 100)) {
      expect(m.make).toBeTruthy();
      expect(m.model).toBeTruthy();
      expect(["g", "d", "e", "h", "p"]).toContain(m.fuel);
    }
  });

  it("חיפוש מוצא דגם קיים (אאודי A1) עם דלק בנזין", () => {
    const res = searchModels("אאודי A1");
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((m) => m.fuel === "g")).toBe(true);
  });

  it("טסלה — כל הדגמים חשמליים וללא צריכת דלק", () => {
    const res = searchModels("טסלה");
    expect(res.length).toBeGreaterThan(0);
    for (const m of res) {
      expect(m.fuel).toBe("e");
      expect(m.l100).toBeNull();
    }
  });

  it("צריכת דלק סבירה לרכבי בנזין (2–25 ל/100; עד ~22 לרכבי-על)", () => {
    const withCons = allModels().filter((m) => m.fuel === "g" && m.l100 != null);
    expect(withCons.length).toBeGreaterThan(100);
    for (const m of withCons) {
      expect(m.l100!).toBeGreaterThan(2);
      expect(m.l100!).toBeLessThan(25);
    }
  });

  it("מיפוי קוד-דלק לסוג רכב", () => {
    expect(FUEL_CODE_TO_TYPE.g).toBe("gasoline");
    expect(FUEL_CODE_TO_TYPE.e).toBe("electric");
    expect(FUEL_CODE_TO_TYPE.p).toBe("plugin");
  });
});
