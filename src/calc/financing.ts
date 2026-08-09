// ------------------------------------------------------------------
// מימון - נוסחת תשלום הלוואה תקנית (אמורטיזציה / שפיצר), עם תמיכה
// אופציונלית בהלוואת בלון (תשלום גדול בסוף התקופה, נפוץ מאוד במימון
// רכב בישראל - מוצע ישירות ע"י סוכנויות/יבואנים, ראו pama.co.il,
// carpilot.co.il). ההחזר החודשי מחושב כך שהוא מפחית את הקרן רק עד
// לגובה הבלון (ולא עד אפס):
//   M = [P − FV·(1+r)^-n] · r / [1 − (1+r)^-n]   ;  r = ריבית שנתית ÷ 12
//   כאשר r = 0:  M = (P − FV) / n
// FV=0 (ברירת המחדל) מצמצם בדיוק לנוסחת האמורטיזציה הרגילה.
// מפיק גם: סך ריבית מלא, ריבית בתקופת ההחזקה בלבד, ויתרת קרן בסופה
// (שתתכנס לגובה הבלון בתום ההלוואה, לא לאפס).
// חשוב: העלות הכלכלית תשתמש רק ב-interestDuringHolding (לא בקרן/בלון) -
//        מניעת ספירה כפולה מול מחיר הרכב.
// ------------------------------------------------------------------

import type { CarInput, FinancingResult } from "../types";
import { toNumber } from "../format/format";

export function monthlyPayment(
  principal: number,
  annualRate: number,
  months: number,
  balloon = 0
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.max(0, principal - balloon) / months;
  const factor = Math.pow(1 + r, months);
  return ((principal - balloon / factor) * r * factor) / (factor - 1);
}

/**
 * @param holdingMonths מספר חודשי ההחזקה המתוכננים (לחישוב הריבית עד סופם)
 */
export function computeFinancing(
  input: CarInput,
  holdingMonths: number
): FinancingResult {
  const principal = Math.max(0, toNumber(input.loanAmount));
  const annualRate = toNumber(input.annualInterestRate);
  const n = Math.max(0, Math.round(toNumber(input.loanMonths)));
  // בלון לא יכול לעלות על הקרן עצמה - הגנה מפני קלט שגוי (לא מציאותי)
  const balloon = Math.min(Math.max(0, toNumber(input.loanBalloonAmount)), principal);

  const empty: FinancingResult = {
    principal,
    monthlyPayment: 0,
    totalInterestFull: 0,
    interestDuringHolding: 0,
    remainingBalanceAtEnd: 0,
    paymentsDuringHolding: 0,
    loanLongerThanHolding: false,
    balloonAmount: balloon,
  };
  if (principal <= 0 || n <= 0) return empty;

  const M = monthlyPayment(principal, annualRate, n, balloon);
  const r = annualRate / 12;
  const totalInterestFull = M * n + balloon - principal;

  // סימולציית לוח סילוקין עד סוף תקופת ההחזקה (או עד סוף ההלוואה) -
  // היתרה מתכנסת לגובה הבלון בתום ההלוואה, לא לאפס
  const monthsElapsed = Math.min(n, Math.max(0, Math.round(holdingMonths)));
  let balance = principal;
  let interestDuringHolding = 0;
  for (let i = 0; i < monthsElapsed; i++) {
    const interest = balance * r;
    const principalPortion = M - interest;
    balance -= principalPortion;
    interestDuringHolding += interest;
  }
  const remainingBalanceAtEnd = Math.max(0, balance);

  return {
    principal,
    monthlyPayment: M,
    totalInterestFull,
    interestDuringHolding,
    remainingBalanceAtEnd,
    paymentsDuringHolding: M * monthsElapsed,
    loanLongerThanHolding: n > monthsElapsed,
    balloonAmount: balloon,
  };
}
