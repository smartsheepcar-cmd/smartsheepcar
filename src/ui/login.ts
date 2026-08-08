// ------------------------------------------------------------------
// login.ts - שלב התחברות בכניסה: פרטים (שם, טלפון, מייל, אישור דיוור)
// ואז קוד OTP.
//
// שליחת ה-SMS: אם MAKE_OTP_WEBHOOK_URL מוגדר (config.ts) נשלח קוד אמיתי
// דרך Make; אחרת נופלים למצב דמו (הקוד מוצג על המסך). אימות הקוד עצמו
// תמיד נשאר בצד לקוח בלבד (משווים למה שנוצר כאן) - זה שער רך ללידים,
// לא מערכת אבטחה, אז זה מספיק.
// ------------------------------------------------------------------

import { el, mount } from "./dom";
import { STRINGS } from "../strings";
import { markLoggedIn } from "../state/store";
import { track } from "../analytics/track";
import { isValidIsraeliMobile, isValidEmail, suggestEmailDomain } from "../format/format";
import { sendLeadToWebhook } from "../integrations/leads";
import { sendOtpSms, otpSmsConfigured } from "../integrations/otp";

const L = STRINGS.login;

export function renderLogin(): HTMLElement {
  const root = el("div", { class: "login-wrap" });
  const data = { name: "", phone: "", email: "", consent: false, code: "", gen: "" };

  const labeled = (labelText: string, control: HTMLElement): HTMLElement =>
    el(
      "div",
      { class: "field" },
      labelText
        ? el("div", { class: "field__labelrow" }, el("label", { class: "field__label" }, labelText))
        : null,
      el("div", { class: "field__control" }, control)
    );

  function detailsCard(): HTMLElement {
    const err = el("div", { class: "field__error", role: "alert" });
    const nameInput = el("input", {
      class: "field__input",
      type: "text",
      value: data.name,
      placeholder: L.namePlaceholder,
      onInput: (e: Event) => (data.name = (e.target as HTMLInputElement).value),
    });
    const phoneInput = el("input", {
      class: "field__input",
      type: "tel",
      inputmode: "tel",
      value: data.phone,
      placeholder: L.phonePlaceholder,
      onInput: (e: Event) => (data.phone = (e.target as HTMLInputElement).value),
    });
    const emailHint = el("button", { type: "button", class: "field__hint-btn" });
    emailHint.style.display = "none";
    const emailInput = el("input", {
      class: "field__input",
      type: "email",
      inputmode: "email",
      value: data.email,
      placeholder: L.emailPlaceholder,
      onInput: (e: Event) => {
        data.email = (e.target as HTMLInputElement).value;
        const suggestion = suggestEmailDomain(data.email);
        if (suggestion) {
          emailHint.textContent = L.emailTypoSuggestion(suggestion);
          emailHint.style.display = "inline-flex";
          emailHint.onclick = () => {
            data.email = suggestion;
            (emailInput as HTMLInputElement).value = suggestion;
            emailHint.style.display = "none";
          };
        } else {
          emailHint.style.display = "none";
        }
      },
    });
    const consentId = "login-consent";
    const consentBox = el(
      "label",
      { class: "consent", for: consentId },
      el("input", {
        id: consentId,
        type: "checkbox",
        checked: data.consent,
        onChange: (e: Event) => (data.consent = (e.target as HTMLInputElement).checked),
      }),
      el("span", {}, L.consent)
    );
    const send = el(
      "button",
      {
        type: "button",
        class: "btn btn--primary",
        onClick: async () => {
          if (!isValidIsraeliMobile(data.phone)) {
            err.textContent = L.errPhone;
            return;
          }
          if (!isValidEmail(data.email)) {
            err.textContent = L.errEmail;
            return;
          }
          if (!data.consent) {
            err.textContent = L.errConsent;
            return;
          }
          err.textContent = "";
          data.gen = String(Math.floor(1000 + Math.random() * 9000));

          if (!otpSmsConfigured()) {
            // מצב דמו: אין Webhook מוגדר - עוברים ישר, הקוד יוצג על המסך
            track("otp_requested");
            mount(root, otpCard());
            return;
          }

          (send as HTMLButtonElement).disabled = true;
          const originalText = send.textContent;
          send.textContent = "שולח קוד...";
          const ok = await sendOtpSms(data.phone, data.gen);
          (send as HTMLButtonElement).disabled = false;
          send.textContent = originalText;

          if (!ok) {
            err.textContent = L.errSendFailed;
            return;
          }
          track("otp_requested");
          mount(root, otpCard());
        },
      },
      L.sendCode
    );
    return el(
      "section",
      { class: "card login-card" },
      el("h2", { class: "login-card__title" }, L.title),
      el("p", { class: "login-card__subtitle" }, L.subtitle),
      labeled(L.name, nameInput),
      labeled(L.phone, phoneInput),
      el(
        "div",
        { class: "field" },
        el("div", { class: "field__labelrow" }, el("label", { class: "field__label" }, L.email)),
        el("div", { class: "field__control" }, emailInput),
        emailHint
      ),
      consentBox,
      err,
      send
    );
  }

  function otpCard(): HTMLElement {
    const err = el("div", { class: "field__error", role: "alert" });
    const codeInput = el("input", {
      class: "field__input",
      type: "text",
      inputmode: "numeric",
      maxlength: "6",
      placeholder: L.otpPlaceholder,
      onInput: (e: Event) => (data.code = (e.target as HTMLInputElement).value),
    });
    const verify = el(
      "button",
      {
        type: "button",
        class: "btn btn--primary",
        onClick: () => {
          if (data.code.replace(/\D/g, "").length < 4) {
            err.textContent = L.errCode;
            return;
          }
          track("login_completed");
          const lead = {
            name: data.name,
            phone: data.phone,
            email: data.email,
            marketingConsent: data.consent,
          };
          sendLeadToWebhook(lead); // ירי-וסיום: לא חוסם את הכניסה למחשבון
          markLoggedIn(lead);
        },
      },
      L.verify
    );
    const back = el(
      "button",
      { type: "button", class: "login__back", onClick: () => mount(root, detailsCard()) },
      L.back
    );
    const demoBlock = !otpSmsConfigured()
      ? el(
          "p",
          { class: "login__demo" },
          `${L.demoCode} `,
          el("strong", {}, data.gen),
          el("br"),
          L.demoNote
        )
      : null;
    return el(
      "section",
      { class: "card login-card" },
      el("h2", { class: "login-card__title" }, L.otpTitle),
      el("p", { class: "login-card__subtitle" }, L.otpSubtitle),
      demoBlock,
      labeled("", codeInput),
      err,
      verify,
      back
    );
  }

  mount(root, detailsCard());
  return root;
}
