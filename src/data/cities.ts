// ------------------------------------------------------------------
// cities.ts - ערים בישראל (שם עברי + קואורדינטות) לחישוב מרחק נסיעה.
// המרחק מחושב בקו אווירי (haversine) ומוכפל במקדם כביש להערכת מרחק נהיגה.
// ------------------------------------------------------------------

import raw from "./cities.json";

export interface City {
  he: string;
  lat: number;
  lon: number;
}

export const CITIES = raw as City[];

/** מקדם המרה מקו אווירי למרחק נהיגה משוער */
export const ROAD_FACTOR = 1.3;

/** שמות ערים מרכזיות - מוצגות כברירת מחדל כשהשדה ריק, במקום רשימה א-ב */
const MAJOR_CITY_NAMES = [
  "תל אביב - יפו",
  "ירושלים",
  "חיפה",
  "ראשון לציון",
  "פתח תקווה",
  "אשדוד",
  "נתניה",
  "באר שבע",
  "חולון",
  "בני ברק",
  "רמת גן",
  "רחובות",
];

export const MAJOR_CITIES = MAJOR_CITY_NAMES
  .map((name) => CITIES.find((c) => c.he === name))
  .filter((c): c is City => !!c);

export function searchCities(query: string, limit = 8): City[] {
  const s = query.trim();
  if (!s) return MAJOR_CITIES.slice(0, limit);
  const starts = CITIES.filter((c) => c.he.startsWith(s));
  const contains = CITIES.filter((c) => !c.he.startsWith(s) && c.he.includes(s));
  return [...starts, ...contains].slice(0, limit);
}

const R = 6371;
const rad = Math.PI / 180;

/** מרחק נהיגה משוער בק"מ בין שתי ערים */
export function drivingKm(a: City, b: City): number {
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  const straight = 2 * R * Math.asin(Math.sqrt(s));
  return straight * ROAD_FACTOR;
}
