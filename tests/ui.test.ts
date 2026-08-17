// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderWizard } from "../src/ui/steps";
import { getState, setState, resetAll, addCar, patchActiveCar } from "../src/state/store";

function mountWizard(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const app = document.getElementById("app")!;
  app.appendChild(renderWizard());
  return app;
}

function activeCar() {
  const s = getState();
  return s.cars[s.activeIndex];
}

describe("בוחר הדגם (אינטגרציה, jsdom)", () => {
  beforeEach(() => {
    resetAll();
    setState({ step: 1, view: "wizard" });
  });

  it("בחירת דגם ממלאת אוטומטית סוג דלק וצריכה, ומסמנת כהערכה", () => {
    const app = mountWizard();
    const input = app.querySelector(".combo__wrap input.field__input") as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = "אאודי A1";
    input.dispatchEvent(new Event("input"));

    const items = app.querySelectorAll(".combo__item");
    expect(items.length).toBeGreaterThan(0);

    (items[0] as HTMLElement).dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );

    const car = activeCar();
    expect(car.selectedModel).toContain("אאודי");
    expect(car.fuelType).toBe("gasoline");
    expect(car.kmPerLiter).toBeGreaterThan(0);
    expect(car.consumptionUnit).toBe("kmPerLiter");
    expect(car.estimated.fuelType).toBe(true);
    expect(car.estimated.kmPerLiter).toBe(true);
  });

  it("בחירת דגם ללא נתון WLTP רשמי לא ממציאה מספר - משאירה שדה פתוח עם הסבר", () => {
    const app = mountWizard();
    const input = app.querySelector(".combo__wrap input.field__input") as HTMLInputElement;
    input.value = "מזדה lantis";
    input.dispatchEvent(new Event("input"));

    const items = app.querySelectorAll(".combo__item");
    expect(items.length).toBeGreaterThan(0);
    (items[0] as HTMLElement).dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );

    const car = activeCar();
    expect(car.consumptionIsGenericEstimate).toBe(true);
    expect(car.kmPerLiter).toBe(0);
    expect(car.estimated.kmPerLiter).toBeFalsy();

    setState({ step: 2 });
    const app2 = mountWizard();
    expect(app2.textContent).toContain(
      "לא הצלחתי להוציא את הנתון הרשמי מהמאגר"
    );
    // שדה הצריכה עצמו לא נעול (בניגוד למחיר הדלק, שנשאר נעול) - פתוח לעריכה חופשית
    const lockedBoxes = [...app2.querySelectorAll(".locked")];
    expect(lockedBoxes.some((el) => el.textContent?.includes('ק"מ לליטר'))).toBe(false);
  });

  it("בחירת רכב חשמלי (טסלה) מגדירה fuelType חשמלי", () => {
    const app = mountWizard();
    const input = app.querySelector(".combo__wrap input.field__input") as HTMLInputElement;
    input.value = "טסלה";
    input.dispatchEvent(new Event("input"));
    const items = app.querySelectorAll(".combo__item");
    expect(items.length).toBeGreaterThan(0);
    (items[0] as HTMLElement).dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(activeCar().fuelType).toBe("electric");
  });

  it("שלב 2 כולל כפתור עוזר ק\"מ ואזור סרטון", () => {
    setState({ step: 2 });
    const app = mountWizard();
    expect(app.querySelector(".km-help-btn")).toBeTruthy();
    expect(app.querySelector(".video-btn")).toBeTruthy();
  });

  it("בחירת דגם נועלת את צריכת הדלק (וגם מחיר הדלק נעול בנפרד), וכפתור עריכה פותח רק את הצריכה", () => {
    const app = mountWizard();
    const input = app.querySelector(".combo__wrap input.field__input") as HTMLInputElement;
    input.value = "אאודי A1";
    input.dispatchEvent(new Event("input"));
    (app.querySelectorAll(".combo__item")[0] as HTMLElement).dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true })
    );
    // עוברים לשלב 2: גם צריכת הדלק וגם מחיר הדלק נעולים כברירת מחדל
    setState({ step: 2 });
    let app2 = mountWizard();
    const lockedTitles = () =>
      [...app2.querySelectorAll(".field.locked .field__label")].map((l) => l.textContent);
    expect(lockedTitles()).toContain("צריכת דלק");
    expect(lockedTitles()).toContain("מחיר ליטר דלק");

    // לחיצה על "עריכה ידנית" בשדה הצריכה פותחת רק אותו, לא את מחיר הדלק
    const consumptionUnlock = [...app2.querySelectorAll(".field.locked")]
      .find((f) => f.querySelector(".field__label")?.textContent === "צריכת דלק")!
      .querySelector(".link-btn") as HTMLElement;
    consumptionUnlock.click();
    const app3 = mountWizard();
    const titlesAfter = [...app3.querySelectorAll(".field.locked .field__label")].map((l) => l.textContent);
    expect(titlesAfter).not.toContain("צריכת דלק");
    expect(titlesAfter).toContain("מחיר ליטר דלק"); // עדיין נעול בנפרד
    expect(activeCar().energyUnlocked).toBe(true);
    expect(activeCar().fuelPriceUnlocked).toBe(false);
  });

  it("שלב 1: שדות המימון מוסתרים עד שבוחרים 'כן'", () => {
    setState({ step: 1 });
    let app = mountWizard();
    // כברירת מחדל hasLoan=false — אין שדה 'סכום מימון'
    let labels = [...app.querySelectorAll(".field__label")].map((l) => l.textContent || "");
    expect(labels.some((t) => t.includes("סכום מימון"))).toBe(false);
  });

  it("רכב שני שנוסף עם שם ברירת מחדל 'רכב 2' משנה שם לדגם שנבחר", () => {
    addCar(); // הרכב הפעיל הופך לרכב השני, בשם ברירת מחדל "רכב 2"
    expect(activeCar().name).toBe("רכב 2");
    setState({ step: 1 });
    const app = mountWizard();
    const input = app.querySelector(".combo__wrap input.field__input") as HTMLInputElement;
    input.value = "אאודי A1";
    input.dispatchEvent(new Event("input"));
    (app.querySelectorAll(".combo__item")[0] as HTMLElement).dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true })
    );
    expect(activeCar().name).toBe("אאודי A1");
  });

  it("אגרת רישוי נעולה כברירת מחדל ומתעדכנת אוטומטית לפי מחיר הרכב", () => {
    setState({ step: 3 });
    let app = mountWizard();
    const locked = () =>
      [...app.querySelectorAll(".field.locked")].find(
        (f) => f.querySelector(".field__label")?.textContent === "אגרת רישוי שנתית"
      );
    expect(locked()).toBeTruthy();
    // מחיר 0 -> השכבה הזולה (1,266) + תוספת חובה 139 לתאגיד השידור = 1,405
    expect(locked()!.querySelector(".locked__val")!.textContent).toContain("1,405");

    // עדכון מחיר הרכב אמור לעדכן את ההערכה הנעולה (1,941 + 139 = 2,080)
    patchActiveCar({ purchasePrice: 150000 });
    app = mountWizard();
    const lockedAfter = [...app.querySelectorAll(".field.locked")].find(
      (f) => f.querySelector(".field__label")?.textContent === "אגרת רישוי שנתית"
    );
    expect(lockedAfter!.querySelector(".locked__val")!.textContent).toContain("2,080");
  });

  it("סכום ההלוואה מחושב אוטומטית ממחיר הרכב פחות ההון העצמי", () => {
    patchActiveCar({ purchasePrice: 150000, hasLoan: true });
    setState({ step: 1 });
    const app = mountWizard();

    const downPaymentInput = [...app.querySelectorAll(".field__label")]
      .find((l) => l.textContent === "הון עצמי")!
      .closest(".field")!
      .querySelector("input") as HTMLInputElement;
    const loanAmountInput = [...app.querySelectorAll(".field__label")]
      .find((l) => l.textContent === "סכום ההלוואה")!
      .closest(".field")!
      .querySelector("input") as HTMLInputElement;

    downPaymentInput.value = "50000";
    downPaymentInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(loanAmountInput.value).toBe("100,000");
    expect(activeCar().loanAmount).toBe(100000);
    expect(activeCar().downPayment).toBe(50000);
  });

  it("הוספת רכב מעתיקה תקופת החזקה, מימון, ק\"מ, הוצאות שוטפות וביטוח מהרכב הקודם, ומציגה הודעות בכל קבוצה", () => {
    patchActiveCar({
      holdingYears: 7,
      hasLoan: true,
      downPayment: 20000,
      annualInterestRate: 0.06,
      loanMonths: 48,
      kmPerYear: 22000,
      parkingMonthly: 150,
      tollsMonthly: 80,
      washingMonthly: 40,
      insuranceMandatory: 1800,
      insuranceComprehensive: 5000,
    });
    addCar();

    expect(activeCar().holdingYears).toBe(7);
    expect(activeCar().hasLoan).toBe(true);
    expect(activeCar().downPayment).toBe(20000);
    expect(activeCar().annualInterestRate).toBe(0.06);
    expect(activeCar().loanMonths).toBe(48);
    expect(activeCar().copiedFromPreviousCar).toBe(true);
    expect(activeCar().kmPerYear).toBe(22000);
    expect(activeCar().parkingMonthly).toBe(150);
    expect(activeCar().tollsMonthly).toBe(80);
    expect(activeCar().washingMonthly).toBe(40);
    expect(activeCar().copiedUsage).toBe(true);
    expect(activeCar().insuranceMandatory).toBe(1800);
    expect(activeCar().insuranceComprehensive).toBe(5000);
    expect(activeCar().copiedInsurance).toBe(true);

    setState({ step: 1 });
    const app = mountWizard();
    const notice = app.querySelector(".copied-notice");
    expect(notice).toBeTruthy();
    // ההודעה צריכה להופיע בתוך קבוצת "מימון", לא כבאנר נפרד מעל כל השלב
    const financeGroup = [...app.querySelectorAll(".fgroup__title")].find((h) => h.textContent === "מימון")!
      .closest(".fgroup")!;
    expect(financeGroup.contains(notice)).toBe(true);

    setState({ step: 2 });
    const app2 = mountWizard();
    expect(app2.querySelector(".copied-notice")).toBeTruthy();

    setState({ step: 3 });
    const app3 = mountWizard();
    expect(app3.querySelector(".copied-notice")).toBeTruthy();
  });
});
