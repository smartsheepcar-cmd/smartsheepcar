// מרכיב קובץ HTML יחיד עצמאי מתוך תוצרי ה-build:
// CSS ו-JS מוטמעים, ותמונות (מסקוט/תמונת המייסד) כ-data URI.
// הפונטים כבר מוטמעים אוטומטית ע"י Vite בתוך ה-CSS (ראו assetsInlineLimit
// ב-vite.config.ts) - אין צורך בטיפול ידני כאן.
// פלט: dist-single/app.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "dist", "assets");
const files = readdirSync(assets);
const cssFile = files.find((f) => f.endsWith(".css"));
const jsFile = files.find((f) => f.endsWith(".js"));

const css = readFileSync(join(assets, cssFile), "utf8");
let js = readFileSync(join(assets, jsFile), "utf8");

// הטמעת תמונות ציבוריות (מסקוט + תמונת המייסד, אם קיימת) כ-data URI
function inlineImage(publicName, mime) {
  const path = join(root, "public", publicName);
  if (!existsSync(path)) return false;
  const b64 = readFileSync(path).toString("base64");
  const uri = `data:${mime};base64,${b64}`;
  js = js.split(`"./${publicName}"`).join(JSON.stringify(uri));
  return true;
}
const mascotInlined = inlineImage("mascot.png", "image/png");
const founderInlined = inlineImage("founder.jpg", "image/jpeg");
const logoInlined = inlineImage("logo.png", "image/png");
const sheepInlined = inlineImage("sheep.png", "image/png");

// גוף העמוד בלבד (עוטף ה-Artifact מוסיף doctype/head/body)
const html = `<style>${css}</style>
<div id="app"></div>
<script type="module">${js}</script>`;

const outDir = join(root, "dist-single");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "app.html"), html, "utf8");
console.log(
  "wrote dist-single/app.html",
  html.length,
  "bytes; mascot inlined:",
  mascotInlined,
  "; logo inlined:",
  logoInlined,
  "; founder photo inlined:",
  founderInlined,
  "; sheep inlined:",
  sheepInlined,
  "; fonts inlined by Vite:",
  css.includes("data:font/woff2")
);
