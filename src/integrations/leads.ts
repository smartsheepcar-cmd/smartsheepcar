// ------------------------------------------------------------------
// leads.ts - שליחת ליד חדש (שם/טלפון/מייל) ל-Webhook של Make, שמעביר
// אותו הלאה לרב מסר. ראו הוראות ההגדרה ליד MAKE_LEAD_WEBHOOK_URL
// ב-config.ts.
//
// "ירי וסיום" (fire-and-forget) במכוון: כשל בשליחה לא אמור אף פעם
// לחסום או לעכב את כניסת המשתמש למחשבון עצמו.
// ------------------------------------------------------------------

import { MAKE_LEAD_WEBHOOK_URL } from "../config";

export interface LeadPayload {
  name: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
}

export function sendLeadToWebhook(lead: LeadPayload): void {
  if (!MAKE_LEAD_WEBHOOK_URL) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[leads] MAKE_LEAD_WEBHOOK_URL not configured - skipping send", lead);
    }
    return;
  }

  fetch(MAKE_LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...lead,
      source: "car-cost-calculator",
      sentAt: new Date().toISOString(),
    }),
  }).catch(() => {
    // לא חוסמים את המשתמש אם השליחה נכשלה (למשל אין אינטרנט זמנית)
  });
}
