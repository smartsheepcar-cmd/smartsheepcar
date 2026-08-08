// ------------------------------------------------------------------
// שכבת אירועים פנימית. כרגע אינה שולחת מידע לשום מקום -
// מוכנה לחיבור עתידי ל-Google Analytics / Meta Pixel.
// אין לאסוף מידע אישי כאן.
// ------------------------------------------------------------------

export type AnalyticsEvent =
  | "calculator_started"
  | "calculation_completed"
  | "comparison_added"
  | "savings_scenario_opened"
  | "share_clicked"
  | "consultation_clicked"
  | "otp_requested"
  | "login_completed";

type Handler = (event: AnalyticsEvent, payload?: Record<string, unknown>) => void;

const handlers: Handler[] = [];

/** רישום handler עתידי (למשל gtag / fbq). כרגע אין אף אחד. */
export function registerAnalyticsHandler(handler: Handler): void {
  handlers.push(handler);
}

export function track(
  event: AnalyticsEvent,
  payload?: Record<string, unknown>
): void {
  // ברירת מחדל: לוג עדין לקונסול בפיתוח בלבד; ללא שליחת רשת.
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, payload ?? {});
  }
  for (const h of handlers) {
    try {
      h(event, payload);
    } catch {
      /* לא מפילים את האפליקציה בגלל אנליטיקה */
    }
  }
}
