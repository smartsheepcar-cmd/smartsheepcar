// ------------------------------------------------------------------
// store.ts - ניהול מצב האפליקציה, שמירה ב-localStorage, וקידוד/פענוח
// מצב לכתובת URL לשיתוף (ללא שרת). מופרד מה-UI ומהנוסחאות.
// ------------------------------------------------------------------

import type { CarInput } from "../types";
import { createDefaultCar, newId } from "./defaults";
import { STORAGE_KEY, MAX_CARS } from "../config";

export interface AppState {
  cars: CarInput[];
  activeIndex: number;
  step: number; // 1..3 באשף
  view: "login" | "wizard" | "results";
  loggedIn: boolean;
}

const AUTH_KEY = STORAGE_KEY + "_auth";

type Listener = (s: AppState) => void;
const listeners: Listener[] = [];

function isLoggedIn(): boolean {
  try {
    return localStorage.getItem(AUTH_KEY) != null;
  } catch {
    return false;
  }
}

/**
 * ממזג רכב חלקי עם ברירת המחדל - הגנת סכימה מפני נתונים חסרים/ישנים.
 * חשוב: estimated ממוזג שדה-שדה (לא מוחלף כמקשה אחת), אחרת רכבים
 * שנשמרו בגרסה קודמת של האפליקציה "מאבדים" דגלי הערכה/נעילה חדשים
 * שנוספו מאז (למשל licenseFee) ותמיד ייראו כלא-נעולים למשתמשים חוזרים.
 */
export function mergeCar(partial: Partial<CarInput>): CarInput {
  const base = createDefaultCar(partial.name ?? "הרכב שלי", partial.id ?? newId());
  return {
    ...base,
    ...partial,
    estimated: { ...base.estimated, ...(partial.estimated ?? {}) },
  };
}

// ---- קידוד/פענוח UTF-8-safe ל-base64 (לשמות בעברית) ----
function encodeCars(cars: CarInput[]): string {
  const json = JSON.stringify(cars);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function decodeCars(encoded: string): CarInput[] | null {
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.slice(0, MAX_CARS).map(mergeCar);
  } catch {
    return null;
  }
}

function fromUrl(): CarInput[] | null {
  const hash = location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const d = params.get("d");
  return d ? decodeCars(d) : null;
}

function fromStorage(): CarInput[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.slice(0, MAX_CARS).map(mergeCar);
  } catch {
    return null;
  }
}

function initialCars(): CarInput[] {
  return [createDefaultCar()];
}

const loggedIn = isLoggedIn();
let state: AppState = {
  cars: fromUrl() ?? fromStorage() ?? initialCars(),
  activeIndex: 0,
  step: 1,
  view: loggedIn ? "wizard" : "login",
  loggedIn,
};

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cars));
  } catch {
    /* localStorage לא זמין - ממשיכים בלי לשמור */
  }
}

// שמירה ראשונית - כך שגם פתיחה מקישור שיתוף מזרימה את הנתונים ל-localStorage
persist();

function notify(): void {
  for (const l of listeners) l(state);
}

export function getState(): AppState {
  return state;
}

export function subscribe(l: Listener): void {
  listeners.push(l);
}

export function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  persist();
  notify();
}

/** סימון שהמשתמש התחבר (שומר את הליד ומעביר לאשף) */
export function markLoggedIn(lead: {
  name: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
}): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...lead, at: Date.now() }));
  } catch {
    /* ממשיכים גם בלי שמירה */
  }
  setState({ loggedIn: true, view: "wizard" });
}

/** עדכון שדה ברכב הפעיל ללא רינדור מלא (מחזיר את הרכב המעודכן) */
export function patchActiveCar(changes: Partial<CarInput>): CarInput {
  const cars = state.cars.slice();
  cars[state.activeIndex] = { ...cars[state.activeIndex], ...changes };
  state = { ...state, cars };
  persist();
  return cars[state.activeIndex];
}

export function activeCar(): CarInput {
  return state.cars[state.activeIndex];
}

/**
 * הוספת רכב חדש להשוואה. תקופת ההחזקה, נתוני המימון, ק"מ בשנה, הוצאות
 * חודשיות שוטפות ונתוני ביטוח מודבקים אוטומטית מהרכב הפעיל - כי אלה
 * נתונים אישיים של הקונה (לא של הרכב עצמו) שלא אמורים להשתנות בין רכב
 * לרכב באותה השוואה. סכום ההלוואה עצמו מחושב מחדש לפי מחיר הרכב החדש
 * (ר' syncLoanAmount ב-steps.ts).
 */
export function addCar(): void {
  if (state.cars.length >= MAX_CARS) return;
  const source = state.cars[state.activeIndex];
  const fresh = createDefaultCar(`רכב ${state.cars.length + 1}`);
  const copied: CarInput = {
    ...fresh,
    holdingYears: source.holdingYears,
    hasLoan: source.hasLoan,
    downPayment: source.downPayment,
    annualInterestRate: source.annualInterestRate,
    loanMonths: source.loanMonths,
    loanType: source.loanType,
    loanBalloonAmount: source.loanBalloonAmount,
    loanBalloonWarningDismissed: source.loanBalloonWarningDismissed,
    loanAmount: Math.max(0, fresh.purchasePrice - source.downPayment),
    copiedFromPreviousCar: source.holdingYears > 0 || source.hasLoan,
    kmPerYear: source.kmPerYear,
    parkingMonthly: source.parkingMonthly,
    tollsMonthly: source.tollsMonthly,
    washingMonthly: source.washingMonthly,
    copiedUsage: true,
    insuranceMandatory: source.insuranceMandatory,
    insuranceComprehensive: source.insuranceComprehensive,
    copiedInsurance: true,
  };
  const cars = [...state.cars, copied];
  setState({ cars, activeIndex: cars.length - 1, view: "wizard", step: 1 });
}

export function duplicateCar(index = state.activeIndex): void {
  if (state.cars.length >= MAX_CARS) return;
  const src = state.cars[index];
  const copy = mergeCar({ ...src, id: newId(), name: `${src.name} (עותק)` });
  const cars = [...state.cars, copy];
  setState({ cars, activeIndex: cars.length - 1, view: "wizard", step: 1 });
}

export function removeCar(index: number): void {
  if (state.cars.length <= 1) return;
  const cars = state.cars.filter((_, i) => i !== index);
  const activeIndex = Math.min(state.activeIndex, cars.length - 1);
  setState({ cars, activeIndex });
}

export function resetAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  try {
    history.replaceState(null, "", location.pathname + location.search);
  } catch {
    /* בתוך iframe מוגבל - מתעלמים */
  }
  state = {
    cars: initialCars(),
    activeIndex: 0,
    step: 1,
    view: state.loggedIn ? "wizard" : "login",
    loggedIn: state.loggedIn,
  };
  notify();
}

/** איפוס מלא: גם נתוני הרכבים וגם ההתחברות - מחזיר להתחלה המוחלטת (מסך הכניסה) */
export function fullReset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* noop */
  }
  try {
    history.replaceState(null, "", location.pathname + location.search);
  } catch {
    /* בתוך iframe מוגבל - מתעלמים */
  }
  state = {
    cars: initialCars(),
    activeIndex: 0,
    step: 1,
    view: "login",
    loggedIn: false,
  };
  notify();
}

/** בונה קישור שיתוף המכיל את הנתונים ב-URL */
export function buildShareUrl(): string {
  const encoded = encodeCars(state.cars);
  return `${location.origin}${location.pathname}#d=${encoded}`;
}
