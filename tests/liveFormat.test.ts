import { describe, it, expect } from "vitest";
import { liveFormatNumber, parseNumberInput } from "../src/format/format";

describe("liveFormatNumber - פסיקים חיים תוך כדי הקלדה", () => {
  it("מוסיף פסיקים לאלפים", () => {
    expect(liveFormatNumber("150000")).toBe("150,000");
    expect(liveFormatNumber("1234567")).toBe("1,234,567");
    expect(liveFormatNumber("999")).toBe("999");
  });

  it("שומר על נקודה עשרונית חלקית תוך כדי הקלדה", () => {
    expect(liveFormatNumber("150000.")).toBe("150,000.");
    expect(liveFormatNumber("150000.5")).toBe("150,000.5");
  });

  it("מסיר תווים שאינם ספרה או נקודה (כולל מינוס)", () => {
    expect(liveFormatNumber("-150000")).toBe("150,000");
    expect(liveFormatNumber("15a0b000")).toBe("150,000");
    expect(liveFormatNumber("₪150,000")).toBe("150,000"); // כבר מפורמט - נשאר תקין
  });

  it("מטפל בנקודה עשרונית כפולה - שומר רק את הראשונה", () => {
    expect(liveFormatNumber("150.5.5")).toBe("150.55");
  });

  it("התוצאה תמיד ניתנת לפענוח חזרה למספר תקין", () => {
    const formatted = liveFormatNumber("150000");
    expect(parseNumberInput(formatted)).toBe(150000);
  });

  it("מחרוזת ריקה נשארת ריקה", () => {
    expect(liveFormatNumber("")).toBe("");
  });
});
