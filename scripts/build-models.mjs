// ------------------------------------------------------------------
// build-models.mjs — הורדה ועיבוד של מאגר דגמי הרכב הרשמי (משרד התחבורה,
// data.gov.il, WLTP) ל-src/data/models.json קומפקטי.
//
// לכל שילוב יצרן+דגם+סוג-דלק: סוג דלק ממופה, וצריכת דלק נגזרת מפליטת CO2
// הרשמית (בנזין ≈ CO2/23.9 ; דיזל ≈ CO2/26.4 ל/100 ק"מ). לרכב חשמלי אין CO2.
//
// מבנה הפלט (קומפקטי): { generatedAt, count, makes: { "<יצרן>": [[model, fuelCode, l100|null, regCount], ...] } }
// regCount = מספר רישומים כולל של הצירוף הזה - פרוקסי לפופולריות
// קודי דלק: g=בנזין, d=דיזל, e=חשמלי, h=היברידי, p=פלאג-אין
// ------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RID = "142afde2-6228-49f9-8a29-9b6c3a0cbe40";
const BASE = "https://data.gov.il/api/3/action/datastore_search";
const FIELDS = "tozar,kinuy_mishari,delek_nm,technologiat_hanaa_nm,CO2_WLTP,kamut_CO2";

// סינון שמות דגם שאינם רלוונטיים לצרכן פרטי (מסחרי/ציבורי/זבל)
const JUNK_WORDS = [
  "מסחרי", "ציבורי", "אחוד", "טראק", "מונית", "אוטובוס", "משאית",
  "נגרר", "אמבולנס", "זעיר", "סגור", "פתוח", "מדברת", "היסע",
  "ואן", "מיניבוס", "מונ ", "האן", "דו תאי", "קירור", "כבאית",
];
function isJunkModel(name) {
  const n = (name || "").trim();
  if (n.length < 2) return true;
  if (/^[\d\W_]+$/.test(n)) return true; // רק ספרות/סימנים
  if (/(.)\1{3,}/.test(n)) return true; // תווים חוזרים (11111)
  if (JUNK_WORDS.some((w) => n.includes(w))) return true;
  return false;
}

function mapFuel(delek, tech) {
  const t = (tech || "").trim();
  const d = (delek || "").trim();
  if (t === "PLUG IN") return "p";
  if (t === "רכב חשמלי" || d === "חשמל") return "e";
  if (t === "היברידי רגיל") return "h";
  if (d === "דיזל") return "d";
  if (d === "בנזין" || d.startsWith("גפמ")) return "g";
  if (d === "חשמל/בנזין" || d === "חשמל/דיזל") return "h"; // fallback אם אין technologiat
  return null;
}

function l100(fuel, co2) {
  if (fuel === "e" || !co2 || co2 <= 0) return null;
  const factor = fuel === "d" ? 26.4 : 23.9;
  return Math.round((co2 / factor) * 10) / 10;
}

function median(arr) {
  const a = arr.filter((n) => typeof n === "number" && n > 0).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

async function fetchAll() {
  const limit = 25000;
  let offset = 0;
  const rows = [];
  for (;;) {
    const url = `${BASE}?resource_id=${RID}&limit=${limit}&offset=${offset}&fields=${encodeURIComponent(FIELDS)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
    const json = await res.json();
    const recs = json.result.records;
    rows.push(...recs);
    process.stdout.write(`\rfetched ${rows.length} / ${json.result.total}`);
    if (recs.length < limit) break;
    offset += limit;
    if (offset > 300000) break;
  }
  process.stdout.write("\n");
  return rows;
}

function fuelCo2(fuel, rec) {
  const co2 = Number(rec.CO2_WLTP) || Number(rec.kamut_CO2) || 0;
  return co2 > 0 ? co2 : null;
}

const rows = await fetchAll();

// נירמול שם דגם להשוואה בלבד (איחוד כפילויות עיצוב: רווחים כפולים,
// מקפים מול רווחים, "MAZDA3" מול "MAZDA 3" וכו') - לא משפיע על הטקסט
// המוצג, רק על קיבוץ הרשומות של אותו רכב בפועל.
function normModel(model) {
  return model.toUpperCase().replace(/[^A-Z0-9א-ת]/g, "");
}

// צבירה לפי יצרן|דגם-מנורמל|דלק - מאחדת רשומות רישום שונות של אותו
// רכב בפועל (המאגר הרשמי מכיל הרבה כפילויות עיצוביות כאלה), כדי
// שכפילות ריקה מנתוני צריכה לא תסתיר כפילות אחות עם נתון אמיתי.
const agg = new Map();
for (const r of rows) {
  const make = (r.tozar || "").trim();
  const model = (r.kinuy_mishari || "").trim();
  if (!make || !model) continue;
  if (isJunkModel(model)) continue;
  const fuel = mapFuel(r.delek_nm, r.technologiat_hanaa_nm);
  if (!fuel) continue;
  const key = `${make}|${normModel(model)}|${fuel}`;
  let e = agg.get(key);
  if (!e) {
    e = { make, fuel, co2: [], labelCounts: new Map() };
    agg.set(key, e);
  }
  e.labelCounts.set(model, (e.labelCounts.get(model) || 0) + 1);
  const c = fuelCo2(fuel, r);
  if (c) e.co2.push(c);
}

// בניית מבנה קומפקטי מקובץ לפי יצרן
const makes = {};
let count = 0;
for (const e of agg.values()) {
  const cons = l100(e.fuel, median(e.co2));
  // התווית המוצגת: איות הדגם הנפוץ ביותר מבין הכפילויות שאוחדו
  const model = [...e.labelCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  // מספר רישומים כולל - פרוקסי לפופולריות, משמש לבחירת "הדגם הפופולרי
  // ביותר" כשמקבצים כמה גרסאות/סוגי-דלק של אותו דגם בבורר (steps.ts)
  const regCount = [...e.labelCounts.values()].reduce((a, b) => a + b, 0);
  (makes[e.make] ||= []).push([model, e.fuel, cons, regCount]);
  count++;
}
// מיון: יצרנים ודגמים לפי א-ב עברי
const sortedMakes = {};
for (const make of Object.keys(makes).sort((a, b) => a.localeCompare(b, "he"))) {
  sortedMakes[make] = makes[make].sort((a, b) => a[0].localeCompare(b[0], "he"));
}

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: "data.gov.il — משרד התחבורה (WLTP)",
  count,
  makes: sortedMakes,
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src", "data");
mkdirSync(dir, { recursive: true });
const path = join(dir, "models.json");
const jsonStr = JSON.stringify(out);
writeFileSync(path, jsonStr, "utf8");
console.log(
  `models: ${count} entries, ${Object.keys(sortedMakes).length} makes, ${(jsonStr.length / 1024).toFixed(0)} KB -> src/data/models.json`
);
