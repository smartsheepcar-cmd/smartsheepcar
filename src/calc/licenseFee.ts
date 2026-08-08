// ------------------------------------------------------------------
// licenseFee.ts - הערכת אגרת רישוי שנתית (טסט) לרכב פרטי, לפי מחיר הרכב
// ולפי שנת עליית הרכב לכביש.
//
// מקור: משרד התחבורה, אגף הרישוי - "אגרות רכב", בתוקף מ-01.04.2026,
// טבלה א' (רכב פרטי ומסחרי שמשקלו הכולל עד 3,500 ק"ג):
// https://www.gov.il/he/pages/drivers-car-license-fee-boards?chapterIndex=2
//
// לכל קבוצת מחיר יש 4 עמודות אגרה, לפי שנת עליית הרכב לכביש - רכב ישן
// יותר משלם פחות. בנוסף, לכל סכום יש להוסיף 139 ₪ עבור תאגיד השידור
// הישראלי (חובה על כל רכב, ללא תלות בקבוצה).
// ------------------------------------------------------------------

export type LicenseFeeYearBand = "2024_2026" | "2021_2023" | "2017_2020" | "2016_or_earlier";

/** תוספת חובה עבור תאגיד השידור הישראלי - זהה לכל קבוצת מחיר */
export const BROADCAST_FEE = 139;

/** גבולות עליונים של קבוצות מחיר (₪) והאגרה השנתית התואמת לכל שנתון (לפני תוספת השידור) */
const BRACKETS: { maxPrice: number; fees: Record<LicenseFeeYearBand, number> }[] = [
  { maxPrice: 117_000, fees: { "2024_2026": 1266, "2021_2023": 1109, "2017_2020": 972, "2016_or_earlier": 849 } },
  { maxPrice: 141_000, fees: { "2024_2026": 1610, "2021_2023": 1404, "2017_2020": 1230, "2016_or_earlier": 1076 } },
  { maxPrice: 167_000, fees: { "2024_2026": 1941, "2021_2023": 1698, "2017_2020": 1487, "2016_or_earlier": 1297 } },
  { maxPrice: 188_000, fees: { "2024_2026": 2315, "2021_2023": 1968, "2017_2020": 1674, "2016_or_earlier": 1422 } },
  { maxPrice: 244_000, fees: { "2024_2026": 2651, "2021_2023": 2184, "2017_2020": 1802, "2016_or_earlier": 1490 } },
  { maxPrice: 347_000, fees: { "2024_2026": 3764, "2021_2023": 2823, "2017_2020": 2117, "2016_or_earlier": 1585 } },
  { maxPrice: Infinity, fees: { "2024_2026": 5364, "2021_2023": 3753, "2017_2020": 2627, "2016_or_earlier": 1840 } },
];

/** ממפה שנת רכב לעמודת השנתון המתאימה בטבלה */
export function yearBand(carYear: number | null | undefined): LicenseFeeYearBand {
  const y = carYear ?? new Date().getFullYear();
  if (y >= 2024) return "2024_2026";
  if (y >= 2021) return "2021_2023";
  if (y >= 2017) return "2017_2020";
  return "2016_or_earlier";
}

/**
 * הערכת אגרת רישוי שנתית: קבוצת המחיר לפי מחיר הרכב, העמודה לפי שנת
 * עליית הרכב לכביש (ברירת מחדל: השנה הנוכחית, כלומר רכב חדש), ותמיד
 * בתוספת 139 ₪ עבור תאגיד השידור הישראלי.
 */
export function estimateLicenseFee(purchasePrice: number, carYear?: number | null): number {
  const price = Math.max(0, purchasePrice || 0);
  const band = yearBand(carYear);
  const bracket = BRACKETS.find((b) => price <= b.maxPrice) ?? BRACKETS[BRACKETS.length - 1];
  return bracket.fees[band] + BROADCAST_FEE;
}
