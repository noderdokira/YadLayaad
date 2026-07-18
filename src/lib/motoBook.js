// src/lib/motoBook.js
// קטלוג הדו גלגלי: ספר מחירים מאומת, מפרט לכל דגם, ונרמול שורות.
//
// מקורות אימות (יולי 2026): אתרי היבואנים הרשמיים (hondabike.co.il, vespa.co.il),
// עלית אופנועים (מחירון פברואר 2026), מגזין מוטו, range.co.il, מלכת הכביש.
// דרגות רישיון: A2 עד 125 סמ"ק ועד 11 קילוואט מגיל 16, A1 עד 35 קילוואט (47.5 כ"ס)
// מגיל 18, A בלי הגבלה מגיל 21.
//
// המבנה מקביל ל־priceBook של הרכבים: מחיר חדש מאומת, ושווי נוכחי לפי ירידת ערך.

import { cleanName, PRICES_UPDATED } from './priceBook'

const CURRENT_YEAR = Math.max(2026, new Date().getFullYear())

// b: היצרן בעברית, m: ביטוי על החלק הלטיני של השם, base: מחיר מחירון חדש,
// cc: נפח מנוע, hp: הספק בכ"ס, lic: דרגת רישיון, cons: צריכה בליטר ל-100 ק"מ,
// since: השנה המוקדמת שסביר למצוא בארץ. הסדר חשוב: ספציפי לפני כללי.
export const MOTO_BOOK = [
  // ---- הונדה (יבואן: מאיר) ----
  { b: 'הונדה', m: /^PCX/, base: 19900, cc: 125, hp: 12.5, lic: 'A2', cons: 2.1, since: 2019 },
  { b: 'הונדה', m: /^FORZA\s?350/, base: 39900, cc: 330, hp: 29.1, lic: 'A1', cons: 3.4, since: 2021 },
  { b: 'הונדה', m: /^ADV\s?350/, base: 43900, cc: 330, hp: 29.2, lic: 'A1', cons: 3.5, since: 2022 },
  { b: 'הונדה', m: /^CB750/, base: 58500, cc: 755, hp: 91.8, lic: 'A', cons: 4.3, since: 2023 },
  { b: 'הונדה', m: /^CBR650R/, base: 71400, cc: 649, hp: 95, lic: 'A', cons: 4.9, since: 2019 },
  { b: 'הונדה', m: /^XL750/, base: 77900, cc: 755, hp: 91.8, lic: 'A', cons: 4.4, since: 2023 },
  // ---- ימאהה ----
  { b: 'ימאהה', m: /^NMAX/, base: 21985, cc: 125, hp: 12.2, lic: 'A2', cons: 2.2, since: 2019 },
  { b: 'ימאהה', m: /^XMAX\s?125/, base: 30985, cc: 125, hp: 14, lic: 'A2', cons: 2.6, since: 2021 },
  { b: 'ימאהה', m: /^XMAX\s?300\s?TECH/, base: 43985, cc: 292, hp: 27.6, lic: 'A1', cons: 3.2, since: 2021 },
  { b: 'ימאהה', m: /^XMAX\s?300/, base: 39985, cc: 292, hp: 27.6, lic: 'A1', cons: 3.2, since: 2018 },
  { b: 'ימאהה', m: /^RAYZR/, base: 14985, cc: 125, hp: 8.2, lic: 'A2', cons: 2.0, since: 2023 },
  { b: 'ימאהה', m: /^TRICITY\s?125/, base: 26485, cc: 125, hp: 12, lic: 'A2', cons: 2.4, since: 2019, wheels3: true },
  { b: 'ימאהה', m: /^TRICITY\s?300/, base: 45985, cc: 292, hp: 27.6, lic: 'A1', cons: 3.6, since: 2021, wheels3: true },
  { b: 'ימאהה', m: /^TMAX/, base: 87985, cc: 562, hp: 47.6, lic: 'A', cons: 4.8, since: 2020 },
  // ---- וספה (יבואן: עופר אבניר) ----
  { b: 'וספה', m: /^PRIMAVERA/, base: 28290, cc: 125, hp: 10.7, lic: 'A2', cons: 2.4, since: 2018 },
  { b: 'וספה', m: /^GTS/, base: 37950, cc: 278, hp: 23.8, lic: 'A1', cons: 3.1, since: 2019 },
  // ---- סאן יאנג SYM ----
  { b: 'סאן יאנג', m: /^MIO/, base: 16485, cc: 125, hp: 8.9, lic: 'A2', cons: 2.4, since: 2019 },
  { b: 'סאן יאנג', m: /^JET\s?14/, base: 16985, cc: 125, hp: 9.6, lic: 'A2', cons: 2.5, since: 2019 },
  { b: 'סאן יאנג', m: /^JET\s?X/, base: 19985, cc: 125, hp: 9.8, lic: 'A2', cons: 2.5, since: 2022 },
  { b: 'סאן יאנג', m: /^SYMPHONY/, base: 16485, cc: 125, hp: 9.9, lic: 'A2', cons: 2.4, since: 2019 },
  { b: 'סאן יאנג', m: /^JOYMAX\s?Z\+?\s?125/, base: 25985, cc: 125, hp: 12.5, lic: 'A2', cons: 2.9, since: 2021 },
  { b: 'סאן יאנג', m: /^JOYMAX\s?Z\+?\s?300/, base: 31985, cc: 278, hp: 26.2, lic: 'A1', cons: 3.3, since: 2021 },
  { b: 'סאן יאנג', m: /^ADX\s?125/, base: 21985, cc: 125, hp: 12.3, lic: 'A2', cons: 2.6, since: 2024 },
  { b: 'סאן יאנג', m: /^ADX\s?300/, base: 34985, cc: 278, hp: 26.5, lic: 'A1', cons: 3.4, since: 2025 },
  { b: 'סאן יאנג', m: /^CRUISYM\s?125/, base: 25985, cc: 125, hp: 12.4, lic: 'A2', cons: 2.9, since: 2020 },
  { b: 'סאן יאנג', m: /^CRUISYM\s?300/, base: 34985, cc: 278, hp: 25.8, lic: 'A1', cons: 3.3, since: 2019 },
  { b: 'סאן יאנג', m: /^MAXSYM\s?TL/, base: 55985, cc: 508, hp: 40.5, lic: 'A1', cons: 4.5, since: 2022 },
  { b: 'סאן יאנג', m: /^MAXSYM\s?400/, base: 39985, cc: 400, hp: 33.5, lic: 'A1', cons: 3.9, since: 2021 },
  // ---- קוואסאקי (יבואן: מטרו מוטור) ----
  { b: 'קוואסאקי', m: /^NINJA\s?500/, base: 44985, cc: 451, hp: 45.4, lic: 'A1', cons: 4.1, since: 2024 },
  { b: 'קוואסאקי', m: /^Z500/, base: 43985, cc: 451, hp: 45.4, lic: 'A1', cons: 4.1, since: 2024 },
  // ---- רויאל אנפילד (יבואן: ד.ל.ב מוטוספורט) ----
  { b: 'רויאל אנפילד', m: /^CLASSIC\s?350/, base: 28990, cc: 349, hp: 20.2, lic: 'A1', cons: 2.9, since: 2022 },
  { b: 'רויאל אנפילד', m: /^HUNTER\s?350/, base: 26318, cc: 349, hp: 20.2, lic: 'A1', cons: 2.8, since: 2023 },
]

function latinPart(clean) {
  const m = clean.match(/[A-Za-z0-9][A-Za-z0-9 .+\-]*$/)
  return (m ? m[0] : '').trim().toUpperCase()
}

export function motoEntry(clean) {
  const latin = latinPart(clean)
  if (!latin) return null
  return MOTO_BOOK.find(e => clean.includes(e.b) && e.m.test(latin)) || null
}

// ירידת ערך לדו גלגלי: תלולה יותר מרכב, בעיקר בקטנועים עירוניים.
// כ-20% בשנה הראשונה, כ-12-13% בהמשך, רצפה של 30% מהמחירון.
const DEP_MOTO = [1, 0.8, 0.7, 0.61, 0.54, 0.48, 0.43]

export function motoDepreciationFactor(age) {
  if (!(age > 0)) return 1
  if (age < DEP_MOTO.length) return DEP_MOTO[age]
  return Math.max(0.3, DEP_MOTO[DEP_MOTO.length - 1] * Math.pow(0.9, age - DEP_MOTO.length + 1))
}

const round100 = x => Math.round(x / 100) * 100

// נרמול שורות אופנועים מה־DB לכרטיסים. שורה אחת לכל דגם+שנה (אין רמות גימור).
export function normalizeMotos(rows) {
  const out = []
  for (const r of rows || []) {
    const clean = cleanName(r.name || '')
    const year = r.year ?? CURRENT_YEAR
    const age = Math.max(0, CURRENT_YEAR - year)
    const entry = motoEntry(clean)
    const a = r.attrs || {}

    let listPrice = entry ? entry.base : (Number(r.market_price) || 0)
    const verified = !!entry && age === 0
    const estimated = !!entry && age > 0
    const valueNow = estimated ? round100(listPrice * motoDepreciationFactor(age)) : listPrice
    const suspect = !entry && listPrice > 0 && listPrice < 4000

    out.push({
      id: r.id,
      name: clean,
      year,
      kind: 'moto',
      isEv: false,
      market_price: valueNow,
      list_price: listPrice,
      addons_once: r.addons_once,
      monthly_cost: r.monthly_cost,
      attrs: r.attrs,
      cc: entry?.cc ?? a.cc ?? null,
      hp: entry?.hp ?? a.hp ?? null,
      license: entry?.lic ?? a.license ?? null,
      consumption: entry?.cons ?? a.consumption ?? null,
      trims: 1,
      priceRange: null,
      verified,
      estimated,
      suspect,
    })
  }
  return out
}

export { PRICES_UPDATED }
