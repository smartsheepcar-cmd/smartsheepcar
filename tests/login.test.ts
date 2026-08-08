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

describe("התחברות עם OTP (jsdom)", () => {
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
    expect(app.querySelector(".btn--primary")?.textContent).toContain("שליחת קוד");
  });

  it("טלפון לא תקין (קצר מדי) מציג שגיאה ולא ממשיך", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "123", email: "a@b.com", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(app.querySelector(".field__error")?.textContent).toBeTruthy();
    expect(app.querySelector(".login__demo")).toBeFalsy();
  });

  it("טלפון עם יותר מדי ספרות (11) נדחה - הבאג המקורי", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "05012345678", email: "a@b.com", consent: true }); // 11 digits
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(app.querySelector(".field__error")?.textContent).toBeTruthy();
    expect(app.querySelector(".login__demo")).toBeFalsy();
  });

  it("מייל לא תקין נדחה", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "0501234567", email: "not-an-email", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(app.querySelector(".field__error")?.textContent).toBeTruthy();
    expect(app.querySelector(".login__demo")).toBeFalsy();
  });

  it("בלי אישור דיוור לא ממשיכים", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "0501234567", email: "a@b.com", consent: false });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(app.querySelector(".field__error")?.textContent).toBeTruthy();
    expect(app.querySelector(".login__demo")).toBeFalsy();
  });

  it("זרימה מלאה: פרטים -> קוד -> כניסה למחשבון", () => {
    const app = mountLogin();
    fillDetails(app, { name: "ישראל ישראלי", phone: "050-1234567", email: "israel@test.com", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();

    const demo = app.querySelector(".login__demo strong");
    expect(demo).toBeTruthy();
    const code = demo!.textContent!;
    expect(code).toMatch(/^\d{4}$/);

    setVal(app.querySelector("input.field__input")!, code);
    (app.querySelector(".btn--primary") as HTMLElement).click();

    expect(getState().loggedIn).toBe(true);
    expect(getState().view).toBe("wizard");
  });

  it("קוד קצר מדי לא מאפשר כניסה", () => {
    const app = mountLogin();
    fillDetails(app, { name: "א", phone: "0501234567", email: "a@b.com", consent: true });
    (app.querySelector(".btn--primary") as HTMLElement).click();
    setVal(app.querySelector("input.field__input")!, "12");
    (app.querySelector(".btn--primary") as HTMLElement).click();
    expect(app.querySelector(".field__error")?.textContent).toBeTruthy();
  });
});
