// ------------------------------------------------------------------
// מימון - נוסחת תשלום הלוואה תקנית (אמורטיזציה / שפיצר).
//   החזר חודשי:  M = P·r·(1+r)^n / ((1+r)^n − 1)   ;  r = ריבית שנתית ÷ 12
//   כאשר r = 0:  M = P / n
// מפיק גם: סך ריבית מלא, ריבית בתקופת ההחזקה בלבד, ויתרת קרן בסופה.
// חשוב: העלות הכלכלית תשתמש רק ב-interestDuringHolding (לא בקרן) -
//        מניעת ספירה כפולה מול ירידת הערך.
// ------------------------------------------------------------------

import type { CarInput, FinancingResult } from "../types";
import { toNumber } from "../format/format";

export function monthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
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

  const empty: FinancingResult = {
    principal,
    monthlyPayment: 0,
    totalInterestFull: 0,
    interestDuringHolding: 0,
    remainingBalanceAtEnd: 0,
    paymentsDuringHolding: 0,
    loanLongerThanHolding: false,
  };
  if (principal <= 0 || n <= 0) return empty;

  const M = monthlyPayment(principal, annualRate, n);
  const r = annualRate / 12;
  const totalInterestFull = M * n - principal;

  // סימולציית לוח סילוקין עד סוף תקופת ההחזקה (או עד סוף ההלוואה)
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
  };
}
