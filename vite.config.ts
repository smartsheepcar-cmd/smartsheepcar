/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// base: "./" -> נכסים יחסיים, כדי שיעבוד גם בתת-נתיב (GitHub Pages)
// וגם בתוך iframe שמוטמע ב-Canva.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    outDir: "dist",
    // מטמיע נכסים קטנים (כמו קבצי הפונט) ישירות כ-data URI בתוך ה-CSS,
    // כדי שיעבדו גם בתוך קישור תצוגה עצמאי (Artifact) ללא בקשות רשת נוספות.
    assetsInlineLimit: 100_000,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
