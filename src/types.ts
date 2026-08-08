// מודלי הנתונים המרכזיים של המחשבון.
// כל השדות המספריים הם מספרים "נקיים" (ללא ₪/פסיקים) - הפענוח נעשה ב-format.ts.

export type FuelType = "gasoline" | "diesel" | "hybrid" | "plugin" | "electric";

export type ConsumptionUnit = "kmPerLiter" | "litersPer100";

export type TiresIntervalMode = "years" | "km";

/** קלט של רכב יחיד (משמש גם בהשוואה) */
export interface CarInput {
  id: string;
  name: string;
  fuelType: FuelType;
  /** תווית הדגם שנבחר מהמאגר (אם נבחר) - לתצוגה בלבד */
  selectedModel: string;
  /** שנתון הרכב (שנת עליה לכביש) - משפיע על הערכת אגרת הרישוי */
  carYear: number;

  // ---- שלב 1: רכב, מחיר ומימון ----
  purchasePrice: number;
  holdingYears: number;
  hasLoan: boolean; // האם קיימת/מתוכננת הלוואה - שולט על הצגת שדות המימון
  downPayment: number;
  loanAmount: number;
  annualInterestRate: number; // שבר, למשל 0.08
  loanMonths: number;

  // ---- שלב 2: שימוש ----
  kmPerYear: number;
  consumptionUnit: ConsumptionUnit;
  /** נפתחה עריכה ידנית של צריכת הדלק/חשמל שמולאה אוטומטית */
  energyUnlocked: boolean;
  /** נפתחה עריכה ידנית של מחיר הדלק (נעול כברירת מחדל - "נבדק הבוקר") */
  fuelPriceUnlocked: boolean;
  kmPerLiter: number;
  litersPer100: number;
  fuelPricePerLiter: number;
  // חשמלי / פלאג-אין
  kwhPer100: number;
  homeChargeShare: number; // שבר 0..1 - חלק הטעינה הביתית
  homePricePerKwh: number;
  publicPricePerKwh: number;
  pluginElectricShare: number; // שבר 0..1 - חלק הק"מ שנוסע על חשמל (פלאג-אין)
  // הוצאות חודשיות שוטפות
  parkingMonthly: number;
  tollsMonthly: number;
  washingMonthly: number;

  // ---- שלב 3: הוצאות קבועות ותחזוקה (שנתי אלא אם צוין) ----
  insuranceMandatory: number; // ביטוח חובה שנתי
  insuranceComprehensive: number; // מקיף / צד ג' שנתי
  licenseFee: number; // אגרת רישוי שנתית
  /** נפתחה עריכה ידנית של אגרת הרישוי (נעולה כברירת מחדל - הערכה לפי מחיר הרכב) */
  licenseFeeUnlocked: boolean;
  servicesAnnual: number; // טיפולים שנתיים
  repairsAnnual: number; // תיקונים ובלאי שנתי
  tiresSetCost: number;
  tiresIntervalMode: TiresIntervalMode;
  tiresIntervalYears: number;
  tiresIntervalKm: number;
  testAnnual: number; // טסט / הוצאות תקופתיות אחרות (שנתי)
  customExpenseLabel: string;
  customExpenseAnnual: number;

  /** אילו שדות סומנו ע"י המשתמש כ"לא יודע" ולכן מולאו בהערכת ברירת מחדל */
  estimated: Partial<Record<keyof CarInput, boolean>>;

  /** צריכת הדלק היא הערכה כללית לפי סוג דלק (אין נתון WLTP לדגם הספציפי הזה) */
  consumptionIsGenericEstimate: boolean;

  /** הרכב נוצר עם נתוני מימון ותקופת החזקה שהודבקו אוטומטית מהרכב הקודם */
  copiedFromPreviousCar: boolean;
  /** ק"מ בשנה והוצאות חודשיות שוטפות הודבקו אוטומטית מהרכב הקודם */
  copiedUsage: boolean;
  /** נתוני ביטוח הודבקו אוטומטית מהרכב הקודם */
  copiedInsurance: boolean;
}

export type CategoryKey =
  | "purchase"
  | "energy"
  | "insurance"
  | "maintenance"
  | "fees"
  | "financing"
  | "parkingTolls"
  | "other";

export interface CategoryBreakdown {
  key: CategoryKey;
  /** סכום לכל תקופת ההחזקה */
  total: number;
  /** ממוצע חודשי */
  monthly: number;
  /** אחוז מתוך העלות הכלכלית (0..1) */
  share: number;
}

export interface FinancingResult {
  principal: number;
  monthlyPayment: number;
  /** ריבית לכל חיי ההלוואה */
  totalInterestFull: number;
  /** ריבית שנצברה בתוך תקופת ההחזקה בלבד */
  interestDuringHolding: number;
  /** יתרת קרן בסוף תקופת ההחזקה (אם ההלוואה ארוכה מההחזקה) */
  remainingBalanceAtEnd: number;
  /** סך התשלומים ששולמו במהלך תקופת ההחזקה */
  paymentsDuringHolding: number;
  loanLongerThanHolding: boolean;
}

export interface Warning {
  field: keyof CarInput | "general";
  message: string;
}

export interface CarResult {
  input: CarInput;
  holdingMonths: number;
  totalKm: number;

  // אנרגיה
  energyAnnual: number;
  energyTotal: number;
  energyKind: "fuel" | "electric" | "mixed";

  // מימון
  financing: FinancingResult;

  // פירוט קטגוריות (מסתכם לעלות הכוללת)
  categories: CategoryBreakdown[];

  // עלות כוללת (מחיר הרכב + מימון + כל ההוצאות השוטפות לאורך ההחזקה)
  economicTotal: number;
  economicAnnual: number;
  economicMonthly: number;
  costPerKm: number;

  warnings: Warning[];
}
