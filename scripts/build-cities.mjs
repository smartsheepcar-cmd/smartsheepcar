// ------------------------------------------------------------------
// build-cities.mjs — בונה רשימת ערים מלאה ורשמית (שם עברי + קואורדינטות)
// עבור עוזר חישוב הק"מ, משתי מקורות פתוחים:
//
// 1. רשימת היישובים הרשמית של רשות האוכלוסין וההגירה (data.gov.il,
//    dataset "citiesandsettelments") - כ-1,310 יישובים, שם עברי מדויק.
// 2. GeoNames (download.geonames.org/export/dump/IL.zip) - קואורדינטות,
//    כולל שמות חלופיים בעברית שמאפשרים התאמה בין שני המקורות.
//
// כל יישוב רשמי שיש לו התאמת שם עברי ב-GeoNames מקבל קואורדינטות משם
// (כ-1,000 מתוך 1,310 - השאר בעיקר שבטים בדואים קטנים ללא רישום נפרד
// ב-GeoNames, מדולגים בשקט).
//
// דורש את הפקודה `unzip` ב-PATH (זמינה כברירת מחדל ב-macOS/Linux/git-bash).
//
// פלט: src/data/cities.json -> [{ he, lat, lon }, ...]
// ------------------------------------------------------------------

import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = join(tmpdir(), "hhbs-cities-build");
mkdirSync(workDir, { recursive: true });

const HEBREW_RE = /[֐-׿]/;
const norm = (s) =>
  (s || "")
    .replace(/["'`׳״]/g, "")
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function fetchOfficialList() {
  const url =
    "https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&limit=1500";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gov.il HTTP ${res.status}`);
  const json = await res.json();
  return json.result.records;
}

async function fetchGeonames() {
  const zipPath = join(workDir, "IL.zip");
  const res = await fetch("https://download.geonames.org/export/dump/IL.zip");
  if (!res.ok) throw new Error(`geonames HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(zipPath, buf);
  execSync(`unzip -o "${zipPath}" -d "${workDir}"`, { stdio: "pipe" });
  return readFileSync(join(workDir, "IL.txt"), "utf8");
}

function buildHebrewMap(geonamesTxt) {
  const map = new Map();
  for (const line of geonamesTxt.split("\n")) {
    if (!line) continue;
    const cols = line.split("\t");
    const lat = parseFloat(cols[4]);
    const lon = parseFloat(cols[5]);
    const population = parseInt(cols[14] || "0", 10);
    for (const alt of (cols[3] || "").split(",")) {
      if (HEBREW_RE.test(alt)) {
        const key = norm(alt);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ lat, lon, population });
      }
    }
  }
  return map;
}

const official = await fetchOfficialList();
console.log(`official localities: ${official.length}`);
const geonamesTxt = await fetchGeonames();
const hebrewMap = buildHebrewMap(geonamesTxt);

const out = [];
let missed = 0;
for (const rec of official) {
  const he = (rec["שם_ישוב"] || "").trim();
  if (!he) continue;
  const candidates = hebrewMap.get(norm(he));
  if (!candidates || !candidates.length) {
    missed++;
    continue;
  }
  candidates.sort((a, b) => b.population - a.population);
  const best = candidates[0];
  out.push({ he, lat: Math.round(best.lat * 1e4) / 1e4, lon: Math.round(best.lon * 1e4) / 1e4 });
}
out.sort((a, b) => a.he.localeCompare(b.he, "he"));

const dir = join(root, "src", "data");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "cities.json"), JSON.stringify(out), "utf8");
rmSync(workDir, { recursive: true, force: true });
console.log(`cities: ${out.length} matched, ${missed} skipped (no coordinate match) -> src/data/cities.json`);
