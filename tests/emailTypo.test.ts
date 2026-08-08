import { describe, it, expect } from "vitest";
import { suggestEmailDomain, isValidEmail } from "../src/format/format";

describe("suggestEmailDomain - זיהוי טעויות הקלדה נפוצות בדומיין המייל", () => {
  it("מזהה .con במקום .com", () => {
    expect(suggestEmailDomain("israel@gmail.con")).toBe("israel@gmail.com");
  });

  it("מזהה gmial במקום gmail (אותיות מוחלפות)", () => {
    expect(suggestEmailDomain("israel@gmial.com")).toBe("israel@gmail.com");
  });

  it("מזהה cmo במקום com", () => {
    expect(suggestEmailDomain("israel@yahoo.cmo")).toBe("israel@yahoo.com");
  });

  it("מזהה hotmial במקום hotmail", () => {
    expect(suggestEmailDomain("israel@hotmial.com")).toBe("israel@hotmail.com");
  });

  it("לא מציע תיקון כשהדומיין כבר תקין (ספק נפוץ)", () => {
    expect(suggestEmailDomain("israel@gmail.com")).toBeNull();
    expect(suggestEmailDomain("israel@walla.co.il")).toBeNull();
  });

  it("לא מציע תיקון לדומיין תקין שאינו ברשימת הספקים הנפוצים", () => {
    expect(suggestEmailDomain("israel@mycompany.io")).toBeNull();
    expect(suggestEmailDomain("israel@somestartup.dev")).toBeNull();
  });

  it("לא נשבר על קלט חסר @ או ריק", () => {
    expect(suggestEmailDomain("")).toBeNull();
    expect(suggestEmailDomain("israel")).toBeNull();
    expect(suggestEmailDomain("israel@")).toBeNull();
  });

  it("ההצעה עצמה היא תמיד כתובת מייל תקינה", () => {
    const suggestion = suggestEmailDomain("israel@gmail.con");
    expect(suggestion).not.toBeNull();
    expect(isValidEmail(suggestion as string)).toBe(true);
  });
});
