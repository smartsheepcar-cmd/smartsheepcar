// ------------------------------------------------------------------
// resultsEmail.ts - שליחת סיכום התוצאות למייל, ביוזמת המשתמש (כפתור
// "שלח לי את התוצאות למייל"). בניגוד ל-leads.ts (ירי-וסיום שקט), כאן
// כן מדווחים הצלחה/כישלון למשתמש - זו פעולה יזומה, לא רקע.
// ------------------------------------------------------------------

import { MAKE_RESULTS_EMAIL_WEBHOOK_URL } from "../config";

export interface ResultsEmailCar {
  name: string;
  purchasePrice: number;
  economicTotal: number;
  economicMonthly: number;
  holdingYears: number;
  categories: { label: string; total: number; monthly: number }[];
}

export interface ResultsEmailPayload {
  email: string;
  name: string;
  cars: ResultsEmailCar[];
}

export function resultsEmailConfigured(): boolean {
  return !!MAKE_RESULTS_EMAIL_WEBHOOK_URL;
}

export async function sendResultsEmail(payload: ResultsEmailPayload): Promise<boolean> {
  if (!MAKE_RESULTS_EMAIL_WEBHOOK_URL) return false;
  try {
    const res = await fetch(MAKE_RESULTS_EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source: "car-cost-calculator", sentAt: new Date().toISOString() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
