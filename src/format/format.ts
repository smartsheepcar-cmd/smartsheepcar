// ------------------------------------------------------------------
// format.ts - פורמט תצוגה ופענוח קלט. מופרד לחלוטין מהנוסחאות ומה-UI.
// ------------------------------------------------------------------

const currencyFmt = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const currencyFmt2 = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat("he-IL", {
  maximumFractionDigits: 0,
});

/** ₪12,345 - לסכומים גדולים (ללא אגורות) */
export function formatCurrency(n: number): string {
  if (!isFinite(n)) return "-";
  return currencyFmt.format(Math.round(n));
}

/** ₪1.23 - לעלות לק"מ (עם אגורות) */
export function formatCurrencyPrecise(n: number): string {
  if (!isFinite(n)) return "-";
  return currencyFmt2.format(n);
}

/** 12,345 - מספר עם מפרידי אלפים, ללא סימן מטבע */
export function formatNumber(n: number, digits = 0): string {
  if (!isFinite(n)) return "-";
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: digits,
  }).format(n);
}

/** 15% - מקבל שבר (0.15) ומחזיר אחוז */
export function formatPercent(fraction: number, digits = 0): string {
  if (!isFinite(fraction)) return "-";
  return `${new Intl.NumberFormat("he-IL", { maximumFractionDigits: digits }).format(fraction * 100)}%`;
}

/**
 * פענוח קלט חופשי של המשתמש: מסיר ₪, פסיקים, רווחים ותווי RTL.
 * מחזיר null לשדה ריק או לא-תקין (כדי שהוולידציה תוכל להבחין).
 */
export function parseNumberInput(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  // הסרת סימן שקל, פסיקים, רווחים (כולל רווחים לא-שוברים) ותווי כיווניות
  const cleaned = raw
    .replace(/[₪,\s‎‏ ]/g, "")
    .trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!isFinite(value)) return null;
  return value;
}

/**
 * מעצב מחרוזת קלט "חיה" תוך כדי הקלדה: מוסיף פסיקים למפרידי אלפים
 * ושומר על נקודה עשרונית חלקית (כדי לא להפריע להקלדת "150." לפני
 * שהמשתמש סיים להקליד את הספרות אחרי הנקודה). מסיר כל תו שאינו ספרה
 * או נקודה - כולל מינוס, כך שלא ניתן להקליד מספר שלילי מלכתחילה.
 */
export function liveFormatNumber(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  const [intPart, decPart] = cleaned.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

/** המרה בטוחה למספר לצורכי חישוב: ערכים לא-תקינים הופכים ל-0 */
export function toNumber(n: number | null | undefined): number {
  return typeof n === "number" && isFinite(n) ? n : 0;
}

/** בדיקת מספר טלפון נייד ישראלי תקין: 05X-XXXXXXX (10 ספרות, מתחיל ב-05) */
export function isValidIsraeliMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return /^05\d{8}$/.test(digits);
}

/** בדיקת כתובת מייל בסיסית */
export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/** ספקי מייל נפוצים - משמשים לזיהוי טעויות הקלדה בדומיין (gmail.con וכו') */
const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "walla.co.il",
  "walla.com",
  "icloud.com",
  "msn.com",
  "live.com",
  "aol.com",
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * מציע תיקון לדומיין מייל שנראה כמו טעות הקלדה בספק נפוץ (gmail.con,
 * gmial.com, yahoo.cmo וכו') - עד מרחק עריכה 2, ורק אם הדומיין לא זהה
 * כבר לאחד הספקים הידועים. מחזיר null אם אין הצעה סבירה.
 */
export function suggestEmailDomain(raw: string): string | null {
  const trimmed = raw.trim();
  const at = trimmed.lastIndexOf("@");
  if (at === -1 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (domain.length < 5 || COMMON_EMAIL_DOMAINS.includes(domain)) return null;

  let best: string | null = null;
  let bestDist = Infinity;
  for (const known of COMMON_EMAIL_DOMAINS) {
    const d = levenshtein(domain, known);
    if (d < bestDist) {
      bestDist = d;
      best = known;
    }
  }
  if (best && bestDist > 0 && bestDist <= 2) {
    return trimmed.slice(0, at + 1) + best;
  }
  return null;
}

export { numberFmt };
