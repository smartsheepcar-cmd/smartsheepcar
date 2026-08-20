// ------------------------------------------------------------------
// config.ts - מקור אמת יחיד לכל ההנחות, ברירות המחדל, הצבעים והספים.
// אין להשאיר ערכים חשובים מפוזרים בקוד - הכל כאן.
// כל הערכים ניתנים לעריכה, וכל מה שמסומן "הערכה" מוצג ככזה בממשק.
// ------------------------------------------------------------------

/** צבעי המותג "ההגה בידיים שלי" */
export const BRAND = {
  navy: "#314a6f",
  turquoise: "#2ee6e3",
  yellow: "#fece02",
} as const;

/** כתובת ה-CTA - מוחלף בעתיד לדף נחיתה / וואטסאפ */
export const CTA_URL = "https://smartsheep.co.il/";

/** כתובת ההרשמה לשיעור (פופ-אפ בסוף החישוב) */
export const COURSE_URL = "https://smartsheep.co.il/";

/** קישורי הרשתות החברתיות - מוצגים בתחתית מסך התוצאות */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/smartsheep.cars/",
  tiktok: "https://www.tiktok.com/@smartsheep0",
  facebook: "https://www.facebook.com/groups/1443182706875221/",
} as const;

/**
 * כתובת ה-Webhook של Make (Integromat) לקליטת לידים לרב מסר.
 *
 * הגדרה חד-פעמית ב-Make.com:
 *   1. New Scenario -> טריגר ראשון: "Webhooks" -> "Custom webhook" -> Add
 *      (Make ייתן כתובת URL - זו הכתובת שיש להדביק כאן למטה).
 *   2. מודול שני: מחפשים את האפליקציה "Rav Message" (רב מסר) ומתחברים
 *      לחשבון (connect account) לפי ההוראות של רב מסר.
 *   3. בוחרים בפעולה "Add/Update Contact" (או שם דומה) ומחברים את
 *      השדות שמגיעים מה-Webhook (name / phone / email) לשדות המתאימים
 *      ברשימת התפוצה של רב מסר.
 *   4. שומרים את התרחיש (Scenario) ומפעילים אותו (Activate).
 *
 * כל עוד השדה ריק, שליחת הליד מדולגת בשקט (login.ts) - לא שוברת את
 * תהליך הכניסה למחשבון.
 */
export const MAKE_LEAD_WEBHOOK_URL = "https://hook.eu1.make.com/3xtzxg3jiq6svdqij8k2gjhyhsd83j6l";

/**
 * תמונת האיש בפופ-אפ הקורס ובכותרת: קובץ public/founder.jpg (ראו ui/course.ts,
 * ui/app.ts). כל עוד הקובץ לא קיים, נופלים אוטומטית לדמות המסקוט (onerror).
 */

/**
 * כתובת ה-Webhook של Make לשליחת סיכום התוצאות במייל, כשמשתמש לוחץ
 * "שלח לי את התוצאות למייל" (ראו integrations/resultsEmail.ts).
 *
 * הגדרה חד-פעמית ב-Make.com (דומה להגדרת MAKE_LEAD_WEBHOOK_URL למעלה):
 *   1. New Scenario -> טריגר ראשון: "Webhooks" -> "Custom webhook" -> Add.
 *   2. מודול שני: "Email" -> "Send an Email" (או Gmail/Outlook, לפי החשבון
 *      שמחובר ל-Make) - שולחים לכתובת email שמגיעה מה-Webhook, עם תוכן
 *      שמרכיבים מהשדות carName / economicTotal / economicMonthly /
 *      holdingYears / categories שמגיעים בגוף הבקשה.
 *   3. שומרים את התרחיש ומפעילים אותו (Activate).
 *
 * כל עוד השדה ריק, הכפתור עדיין מוצג אך מציג הודעת שגיאה בלחיצה (לא
 * נכשל בשקט - זו פעולה יזומה של המשתמש, בניגוד ללידים ברקע).
 */
export const MAKE_RESULTS_EMAIL_WEBHOOK_URL = "https://hook.eu1.make.com/43afbhnw0bkuksc5n4xknwubgwir0ibm";

/** מפתח האחסון ב-localStorage */
export const STORAGE_KEY = "hhbs_car_calc_v1";

/**
 * הנחת פיצול ק"מ ברכב פלאג-אין בין נסיעה חשמלית לדלק (הערכה, ניתן לעריכה).
 * 0.6 = 60% מהק"מ נוסעים על חשמל.
 */
export const DEFAULT_PLUGIN_ELECTRIC_SHARE = 0.6;

/** הנחת פיצול טעינה ברכב חשמלי בין בית לציבור (הערכה) */
export const DEFAULT_HOME_CHARGE_SHARE = 0.8;

/**
 * ערכי ברירת מחדל שמשמשים כאשר המשתמש מסמן "אני לא יודע".
 * כולם הערכות סבירות לישראל ומסומנים בבירור כהערכה בממשק.
 */

/**
 * מקדם תיקון בין צריכת דלק רשמית (WLTP, מבדיקת מעבדה) לצריכה בפועל בכביש.
 * לפי מחקר ICCT (יוני 2026, "On the way to 'real-world' CO2 values?"),
 * המבוסס על נתוני OBFCM רשמיים מ-8 מיליון רכבים באירופה (2021-2023):
 * צריכת הדלק בפועל גבוהה ב-19% בממוצע מהערך הרשמי לרכבי בנזין/דיזל/
 * היברידי (2023, עלייה מ-18% ב-2021). מוחל רק על ק"מ/ליטר שמחושב
 * מנתון WLTP רשמי במאגר הדגמים - לא על ההערכות הגנריות לפי סוג דלק.
 */
export const WLTP_REAL_WORLD_FACTOR = 1.19;

/**
 * טווח תצוגה סביב הערכת הצריכה (±) - כדי לא להציג דיוק מזויף (הפער
 * האמיתי משתנה מאוד בין דגמים ספציפיים, ראו WLTP_REAL_WORLD_FACTOR).
 * הערך שמוצג הוא טווח; הערך שמשמש בפועל בחישוב הוא האמצע שלו.
 */
export const CONSUMPTION_DISPLAY_SPREAD = 0.1;

/**
 * מחיר בנזין 95 נטול עופרת (שירות עצמי) - המחיר המרבי הרשמי שקבע משרד
 * האנרגיה, בתוקף מ-2 באוגוסט 2026 (8.09 ₪/ליטר, עלייה של 61 אגורות
 * מהחודש הקודם). המחיר מתעדכן ע"י משרד האנרגיה כמעט כל חודש - יש
 * לרענן את הערך הזה בכל פעם שהוא מתעדכן (ראו משימת הרענון האוטומטי).
 */
export const ESTIMATES = {
  fuelPricePerLiter: 8.09,
  homePricePerKwh: 0.6,
  publicPricePerKwh: 1.4,
  kwhPer100: 16,
  kmPerYear: 15000,
  kmPerLiter: 14,
  litersPer100: 7,
  annualInterestRate: 0.08,
  insuranceMandatory: 1500,
  insuranceComprehensive: 4000,
  licenseFee: 1500,
  servicesAnnual: 1500,
  repairsAnnual: 1000,
  tiresSetCost: 2000,
  tiresIntervalYears: 4,
  tiresIntervalKm: 60000,
  testAnnual: 0,
  parkingMonthly: 0,
  tollsMonthly: 0,
  washingMonthly: 0,
} as const;

/**
 * סף "רכבים דומים" בהשוואה - אם הפער קטן משני התנאים, לא מכריזים על מנצח.
 */
export const SIMILARITY = {
  maxRelativeGap: 0.03, // 3% מהעלות הכוללת
  maxMonthlyGap: 120, // ₪ לחודש
} as const;

/**
 * ספי סבירות לאזהרות רכות (לא חוסמות את המשתמש).
 */
export const PLAUSIBILITY = {
  maxKmPerLiter: 40,
  maxInterestRate: 0.25,
  maxHoldingYears: 25,
  maxKmPerYear: 100000,
  /**
   * תשלום בלון "בטוח" לא אמור לעלות על כ-30% משווי הרכב הצפוי בסוף
   * ההלוואה, לפי המלצת גורמי מימון רכב בישראל (למשל carpilot.co.il) -
   * מעבר לזה, גדל הסיכון שלא יהיה אפשר למחזר/לכסות את הבלון בסוף.
   */
  maxBalloonSharePct: 0.3,
} as const;

/** מגבלת מספר הרכבים בהשוואה */
export const MAX_CARS = 3;

/** צבעי סימון לרכבים בהשוואה */
export const CAR_COLORS = [BRAND.navy, BRAND.turquoise, BRAND.yellow] as const;

/** פרמטרים לסימולטור החיסכון (גדלי השינוי בכל תרחיש) */
export const SIMULATOR = {
  cheaperCarAmount: 10000, // רכב זול ב-₪
  fewerKm: 2000, // ק"מ פחות בשנה
  betterConsumptionPct: 0.1, // צריכה טובה ב-10%
  cheaperInsurancePct: 0.15, // ביטוח זול ב-15%
  extraHoldingYears: 1, // החזקה שנה נוספת
  moreEquity: 10000, // הגדלת הון עצמי ב-₪
  lowerInterest: 0.01, // ריבית נמוכה ב-1 נקודת אחוז
} as const;
