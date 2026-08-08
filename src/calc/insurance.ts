// ------------------------------------------------------------------
// insurance.ts - מעריך עלות ביטוח רכב לפי מספר שאלות (בסגנון Wobi).
//
// זו הערכה גסה בלבד המבוססת על טווחי שוק ממוצעים בישראל - לא הצעת מחיר.
// המחיר בפועל נקבע ע"י חברת הביטוח ותלוי בגורמים רבים נוספים.
// כל המקדמים מרוכזים כאן וניתנים לכיוונון.
// ------------------------------------------------------------------

export type AgeBand = "u24" | "24_30" | "30_50" | "50_70" | "o70";
export type Experience = "lt3" | "3_6" | "gt6";
export type Claims = "0" | "1" | "2plus";
export type Coverage = "mandatory" | "third" | "comprehensive";

export interface InsuranceInput {
  carValue: number;
  ageBand: AgeBand;
  experience: Experience;
  claims: Claims;
  coverage: Coverage;
}

export interface InsuranceEstimate {
  mandatory: number; // ביטוח חובה שנתי
  comprehensive: number; // מקיף / צד ג' שנתי (0 אם חובה בלבד)
  total: number;
}

const AGE_FACTOR: Record<AgeBand, number> = {
  u24: 1.8,
  "24_30": 1.35,
  "30_50": 1.0,
  "50_70": 1.05,
  o70: 1.2,
};
const EXP_FACTOR: Record<Experience, number> = { lt3: 1.3, "3_6": 1.1, gt6: 1.0 };
const CLAIMS_FACTOR: Record<Claims, number> = { "0": 1.0, "1": 1.2, "2plus": 1.5 };

const MANDATORY_BASE = 1300; // ₪ לשנה
const COMPREHENSIVE_RATE = 0.032; // אחוז משווי הרכב לשנה
const COMPREHENSIVE_MIN = 1800; // רצפה למקיף
const THIRD_PARTY_BASE = 2800; // ₪ לשנה (צד ג', לא תלוי בשווי)

const round50 = (n: number) => Math.round(n / 50) * 50;

export function estimateInsurance(inp: InsuranceInput): InsuranceEstimate {
  const age = AGE_FACTOR[inp.ageBand];
  const exp = EXP_FACTOR[inp.experience];
  const claims = CLAIMS_FACTOR[inp.claims];

  const mandatory = round50(MANDATORY_BASE * age);

  let comprehensive = 0;
  if (inp.coverage === "comprehensive") {
    const raw = Math.max(inp.carValue, 0) * COMPREHENSIVE_RATE * age * exp * claims;
    comprehensive = round50(Math.max(raw, COMPREHENSIVE_MIN));
  } else if (inp.coverage === "third") {
    comprehensive = round50(THIRD_PARTY_BASE * age * exp * claims);
  }

  return { mandatory, comprehensive, total: mandatory + comprehensive };
}
