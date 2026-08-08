// ------------------------------------------------------------------
// otp.ts - שליחת קוד אימות (OTP) אמיתי ב-SMS דרך Webhook של Make.
// ראו הוראות ההגדרה ליד MAKE_OTP_WEBHOOK_URL ב-config.ts.
//
// כל עוד ה-Webhook לא מוגדר, מחזירים false ו-login.ts נופל למצב דמו
// (מציג את הקוד על המסך במקום לשלוח אותו).
// ------------------------------------------------------------------

import { MAKE_OTP_WEBHOOK_URL } from "../config";

/** true אם ה-Webhook מוגדר, כלומר שליחת SMS אמיתית זמינה */
export function otpSmsConfigured(): boolean {
  return !!MAKE_OTP_WEBHOOK_URL;
}

/**
 * שולח את קוד האימות ב-SMS דרך ה-Webhook. "ירי וסיום" מבחינת קריאה
 * זו עצמה - אבל בניגוד ל-leads.ts, כאן חשוב לדעת אם השליחה הצליחה
 * (אחרת המשתמש מחכה לקוד שלעולם לא יגיע), אז מחזירים Promise<boolean>.
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  if (!MAKE_OTP_WEBHOOK_URL) return false;
  try {
    const res = await fetch(MAKE_OTP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, sentAt: new Date().toISOString() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
