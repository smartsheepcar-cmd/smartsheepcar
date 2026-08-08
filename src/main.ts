// נקודת הכניסה של האפליקציה.
import "./ui/styles.css";
import { startApp } from "./ui/app";
import { resetAll, fullReset } from "./state/store";

// כפיית עברית ו-RTL על כל המסמך - עובד גם כשהעמוד מוטמע בעוטף חיצוני
// (Artifact / iframe ב-Canva) שאינו מגדיר dir="rtl" בעצמו.
document.documentElement.setAttribute("dir", "rtl");
document.documentElement.setAttribute("lang", "he");
document.body?.setAttribute("dir", "rtl");

// קישור עם #reset בסוף הכתובת מנקה את נתוני הרכבים ומתחיל מאפס, בלי
// לנתק את ההתחברות. קישור עם #restart מנקה גם את ההתחברות - חוזר ממש
// להתחלה המוחלטת (מסך הכניסה), שימושי לדמו/בדיקה של החוויה השלמה.
// גם מאזינים ל-hashchange: אם הכרטיסייה כבר פתוחה באותו מקור, דפדפנים
// רבים לא טוענים מחדש את העמוד כשההבדל היחיד בכתובת הוא ה-hash - בלי
// המאזין הזה, הדבקת קישור כזה בכרטיסייה פתוחה לא הייתה עושה כלום.
function checkResetHash(): void {
  if (location.hash === "#restart") {
    fullReset();
  } else if (location.hash === "#reset") {
    resetAll();
  }
}
window.addEventListener("hashchange", checkResetHash);
checkResetHash();

startApp();
