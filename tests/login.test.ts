// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderLogin } from "../src/ui/login";
import { getState } from "../src/state/store";

function setVal(input: Element, value: string): void {
  (input as HTMLInputElement).value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function mountLogin(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const app = document.getElementById("app")!;
  app.appendChild(renderLogin());
  return app;
}

function anyErrorText(app: HTMLElement): string {
  return [...app.querySelectorAll(".field__error")].map((e) => e.textContent).join("");
}

function fillDetails(app: HTMLElement, opts: { name?: string; phone?: string; email?: string; consent?: boolean }): void {
  const inputs = app.querySelectorAll("input.field__input");
  if (opts.name != null) setVal(inputs[0], opts.name);
  if (opts.phone != null) setVal(inputs[1], opts.phone);
  if (opts.email != null) setVal(inputs[2], opts.email);
  if (opts.consent != null) {
    const cb = app.querySelector('input[type="checkbox"]') as HTMLInputElement;
    cb.checked = opts.consent;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

describe("התחברות (jsdom) - ללא שלב אימות SMS", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* noop */
    }
  });

  it("מסך פתיחה מבקש שם, טלפון, מייל, ואישור דיוור", () => {
    const app = mountLogin();
    const inputs = app.querySelectorAll("input.field__input");
    expect(inputs.length).toBe(3);
    expect(app.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(app.querySelector(".btn--primary")?.textContent).toContain("כניסה למחשבון");
  });

  it("טלפון לא תקין (קצר מדי) מציג שגיאה ולא נכנסים", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "123", email: "a@b.com", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(anyErrorText(app)).toBeTruthy();
    expect(getState().loggedIn).toBe(false);
  });

  it("טלפון עם יותר מדי ספרות (11) נדחה - הבאג המקורי", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "05012345678", email: "a@b.com", consent: true }); // 11 digits
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(anyErrorText(app)).toBeTruthy();
    expect(getState().loggedIn).toBe(false);
  });

  it("מייל לא תקין נדחה", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "0501234567", email: "not-an-email", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(anyErrorText(app)).toBeTruthy();
    expect(getState().loggedIn).toBe(false);
  });

  it("בלי אישור דיוור לא נכנסים", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "0501234567", email: "a@b.com", consent: false });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(anyErrorText(app)).toBeTruthy();
    expect(getState().loggedIn).toBe(false);
  });

  it("שגיאת טלפון מוצגת בדיוק מתחת לשדה הטלפון, עם הניסוח החדש", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "123", email: "a@b.com", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();

    const fields = [...app.querySelectorAll(".field, .field__error")];
    const phoneFieldIndex = fields.findIndex((f) => f.querySelector('input[type="tel"]'));
    const errorIndex = fields.findIndex((f) => f.textContent?.includes("אופס"));
    expect(errorIndex).toBe(phoneFieldIndex + 1);
    expect(fields[errorIndex].textContent).toBe("אופס, הזנת נייד לא תקין");
  });

  it("פרטים תקינים -> כניסה מיידית למחשבון, בלי שלב אימות", () => {
    const app = mountLogin();
    fillDetails(app, { name: "ישראל ישראלי", phone: "050-1234567", email: "israel@test.com", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();

    expect(getState().loggedIn).toBe(true);
    expect(getState().view).toBe("wizard");
  });
});
