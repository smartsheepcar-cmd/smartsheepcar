// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mergeCar } from "../src/state/store";
import { carDisplayName } from "../src/state/defaults";

describe("תאימות לאחור לנתונים שמורים מגרסה קודמת (mergeCar)", () => {
  it("רכב שנשמר לפני שנוסף licenseFee מקבל את הדגל החדש נעול, ולא מאבד דגלים ישנים שכבר נקבעו", () => {
    // מדמים רכב שנשמר ב-localStorage מגרסה קודמת - יש לו רק שני דגלי הערכה,
    // וגם מסומן שהמשתמש כבר ערך ידנית את מחיר הדלק (fuelPriceUnlocked)
    const legacyStored: Partial<import("../src/types").CarInput> = {
      id: "old1",
      name: "רכב 2",
      purchasePrice: 150000,
      fuelPriceUnlocked: true,
      estimated: { fuelPricePerLiter: true, kwhPer100: true }, // בלי licenseFee!
    };
    const merged = mergeCar(legacyStored);
    // הדגל החדש (licenseFee) מתווסף אוטומטית מברירת המחדל
    expect(merged.estimated.licenseFee).toBe(true);
    // דגלים ישנים שכבר היו נשמרים
    expect(merged.estimated.fuelPricePerLiter).toBe(true);
    // בחירת עריכה ידנית שהמשתמש כבר עשה לא אובדת
    expect(merged.fuelPriceUnlocked).toBe(true);
    // ושדות שלא היו קיימים בכלל בגרסה הישנה (licenseFeeUnlocked) מקבלים ברירת מחדל תקינה
    expect(merged.licenseFeeUnlocked).toBe(false);
  });

  it("מיזוג רכב ריק לגמרי עדיין מייצר את כל דגלי ההערכה של ברירת המחדל", () => {
    const merged = mergeCar({});
    expect(merged.estimated.fuelPricePerLiter).toBe(true);
    expect(merged.estimated.kwhPer100).toBe(true);
    expect(merged.estimated.licenseFee).toBe(true);
  });
});

describe("carDisplayName - מציג תמיד את הדגם שנבחר, גם אם name נתקע", () => {
  it("מעדיף selectedModel על פני name (מתקן רכבים 'תקועים' משיחות קודמות)", () => {
    const car = {
      name: "רכב 2", // נתקע משגיאה ישנה
      selectedModel: "טויוטה COROLLA", // תמיד היה נשמר נכון
    } as import("../src/types").CarInput;
    expect(carDisplayName(car, "fallback")).toBe("טויוטה COROLLA");
  });

  it("נופל ל-name כשאין דגם נבחר, ול-fallback כשגם name ריק", () => {
    const withName = { name: "שם מותאם", selectedModel: "" } as import("../src/types").CarInput;
    expect(carDisplayName(withName, "fallback")).toBe("שם מותאם");
    const empty = { name: "", selectedModel: "" } as import("../src/types").CarInput;
    expect(carDisplayName(empty, "רכב 3")).toBe("רכב 3");
  });
});
