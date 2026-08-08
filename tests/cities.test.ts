import { describe, it, expect } from "vitest";
import { CITIES, searchCities, drivingKm } from "../src/data/cities";

describe("ערים ומרחקים", () => {
  it("נטענו מאות יישובים עם קואורדינטות (רשימה רשמית מלאה, לא רק ערים מרכזיות)", () => {
    expect(CITIES.length).toBeGreaterThan(900);
    for (const c of CITIES) {
      expect(c.lat).toBeGreaterThan(29);
      expect(c.lat).toBeLessThan(34);
      expect(c.lon).toBeGreaterThan(34);
      expect(c.lon).toBeLessThan(36);
    }
  });

  it("חיפוש מוצא חולון ותל אביב", () => {
    expect(searchCities("חולון").length).toBeGreaterThan(0);
    expect(searchCities("תל אב").some((c) => c.he.includes("תל אביב"))).toBe(true);
  });

  it("חיפוש מוצא גם יישובים קטנים שלא ברשימת הערים המרכזיות (תל מונד)", () => {
    expect(searchCities("תל מונד").some((c) => c.he === "תל מונד")).toBe(true);
  });

  it("מרחק נהיגה חולון↔תל אביב סביר (5–20 ק\"מ)", () => {
    const holon = CITIES.find((c) => c.he === "חולון")!;
    const ta = CITIES.find((c) => c.he.includes("תל אביב"))!;
    const km = drivingKm(holon, ta);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(20);
  });
});
