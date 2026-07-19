// src/lib/motoBook.js
// קטלוג הדו גלגלי: ספר מחירים מאומת, מפרט לכל דגם, ונרמול שורות.
//
// מקורות אימות (יולי 2026):
//   • עלית אופנועים, מחירון שעודכן 18.2.2026 (elitemoto.co.il/scooter, /road-bike).
//     זהו המקור למחירי סאן יאנג, ימאהה וקוואסאקי שמופיעים כאן.
//   • אתרי היבואנים הרשמיים: hondabike.co.il (מאיר), vespa.co.il (עופר אבניר).
//   • מגזין מוטו, range.co.il, מלכת הכביש.
//
// דרגות רישיון בישראל (אומת מול משרד התחבורה ובתי ספר לנהיגה, יולי 2026):
//   A2 — עד 125 סמ"ק וגם עד 11 קילוואט, מגיל 16.
//   A1 — עד 35 קילוואט (47.5 כ"ס), בלי הגבלת נפח, מגיל 18.
//   A  — בלי הגבלה, מגיל 21 ואחרי שנה עם A1.
// שים לב: בישראל A2 היא הדרגה הקטנה ו־A1 היא הבינונית, הפוך מהמקובל באירופה.
//
// המבנה מקביל ל־priceBook של הרכבים: מחיר חדש מאומת, ושווי נוכחי לפי ירידת ערך.

import { cleanName, PRICES_UPDATED } from './priceBook'

const CURRENT_YEAR = Math.max(2026, new Date().getFullYear())

// דרגת הרישיון נגזרת מהמפרט ולא נכתבת ביד, כדי שלא ייווצרו סתירות.
// החישוב בקילוואט ולא בכוח סוס, כי גבול ה־35 קילוואט הוא הגבול החוקי
// ו־47.5 כ"ס הוא רק העיגול שלו. TMAX 560 יושב על 35.0 קילוואט בדיוק,
// ולכן הוא A1, למרות ש־47.6 כ"ס "נראה" מעל הסף.
export function licenseFor(cc, kw, override) {
  if (override) return override
  if (cc == null || kw == null) return null
  if (cc <= 125 && kw <= 11) return 'A2'
  if (kw <= 35) return 'A1'
  return 'A'
}

const HP_PER_KW = 1.35962

// b: היצרן בעברית, m: ביטוי על החלק הלטיני של השם, base: מחיר מחירון חדש,
// cc: נפח מנוע, kw: הספק בקילוואט, cons: צריכה בליטר ל 100 ק"מ (null כשלא אומת),
// since: השנה המוקדמת שסביר למצוא בארץ, wiki: שם הערך באנגלית לשליפת תמונה,
// lic: דריסה ידנית של דרגת הרישיון. הסדר חשוב: ספציפי לפני כללי.
export const MOTO_BOOK = [
  // ---------------- הונדה (יבואן: מאיר) ----------------
  { b: 'הונדה', m: /^PCX/, base: 19900, cc: 125, kw: 9.2, cons: 2.1, since: 2019, wiki: 'Honda PCX' },
  { b: 'הונדה', m: /^FORZA\s?350/, base: 39900, cc: 330, kw: 21.5, cons: 3.4, since: 2021, wiki: null },
  { b: 'הונדה', m: /^ADV\s?350/, base: 43900, cc: 330, kw: 21.5, cons: 3.5, since: 2022, wiki: null },
  { b: 'הונדה', m: /^CB750/, base: 58500, cc: 755, kw: 67.5, cons: 4.3, since: 2023, wiki: null },
  { b: 'הונדה', m: /^CBR650R/, base: 71400, cc: 649, kw: 70, cons: 4.9, since: 2019, wiki: 'Honda CBR650R' },
  { b: 'הונדה', m: /^XL750/, base: 77900, cc: 755, kw: 67.5, cons: 4.4, since: 2023, wiki: 'Honda Transalp' },

  // ---------------- ימאהה, קטנועים ----------------
  { b: 'ימאהה', m: /^NMAX/, base: 21985, cc: 125, kw: 9.0, cons: 2.2, since: 2019, wiki: 'Yamaha NMAX' },
  { b: 'ימאהה', m: /^XMAX\s?125\s?TECH/, base: 33985, cc: 125, kw: 10.3, cons: 2.6, since: 2023, wiki: 'Yamaha XMAX' },
  { b: 'ימאהה', m: /^XMAX\s?125/, base: 30985, cc: 125, kw: 10.3, cons: 2.6, since: 2021, wiki: 'Yamaha XMAX' },
  { b: 'ימאהה', m: /^XMAX\s?300\s?TECH/, base: 43985, cc: 292, kw: 20.6, cons: 3.2, since: 2021, wiki: 'Yamaha XMAX' },
  { b: 'ימאהה', m: /^XMAX\s?300/, base: 39985, cc: 292, kw: 20.6, cons: 3.2, since: 2018, wiki: 'Yamaha XMAX' },
  { b: 'ימאהה', m: /^RAYZR/, base: 14985, cc: 125, kw: 6.1, cons: 2.0, since: 2023, wiki: null },
  { b: 'ימאהה', m: /^TRICITY\s?125/, base: 26485, cc: 125, kw: 9.0, cons: 2.4, since: 2019, wheels3: true, wiki: 'Yamaha Tricity' },
  { b: 'ימאהה', m: /^TRICITY\s?300/, base: 45985, cc: 292, kw: 20.6, cons: 3.6, since: 2021, wheels3: true, wiki: 'Yamaha Tricity' },
  { b: 'ימאהה', m: /^TMAX\s?560\s?TECH/, base: 98985, cc: 562, kw: 35.0, cons: 4.8, since: 2022, wiki: 'Yamaha TMAX' },
  { b: 'ימאהה', m: /^TMAX/, base: 87985, cc: 562, kw: 35.0, cons: 4.8, since: 2020, wiki: 'Yamaha TMAX' },

  // ---------------- ימאהה, אופנועי כביש ----------------
  { b: 'ימאהה', m: /^YZF-?R125/, base: 31985, cc: 125, kw: 11.0, cons: 2.2, since: 2019, wiki: 'Yamaha YZF-R125' },
  { b: 'ימאהה', m: /^MT-?125/, base: 30985, cc: 125, kw: 11.0, cons: 2.2, since: 2020, wiki: null },
  { b: 'ימאהה', m: /^XSR\s?125/, base: 30985, cc: 125, kw: 11.0, cons: 2.2, since: 2022, wiki: null },
  { b: 'ימאהה', m: /^MT-?03/, base: 38985, cc: 321, kw: 30.9, cons: 3.7, since: 2020, wiki: 'Yamaha MT-03' },
  { b: 'ימאהה', m: /^YZF-?R3/, base: 38985, cc: 321, kw: 30.9, cons: 3.8, since: 2019, wiki: 'Yamaha YZF-R3' },
  { b: 'ימאהה', m: /^MT-?07\s?Y-?AMT/, base: 57984, cc: 689, kw: 54.0, cons: 4.3, since: 2025, wiki: 'Yamaha MT-07' },
  { b: 'ימאהה', m: /^MT-?07/, base: 56984, cc: 689, kw: 54.0, cons: 4.3, since: 2016, wiki: 'Yamaha MT-07' },
  { b: 'ימאהה', m: /^YZF-?R7/, base: 65985, cc: 689, kw: 54.0, cons: 4.3, since: 2022, wiki: 'Yamaha YZF-R7' },
  { b: 'ימאהה', m: /^TRACER\s?7\s?35\s?KW/, base: 64985, cc: 689, kw: 35.0, cons: 4.3, since: 2023, wiki: 'Yamaha Tracer 700' },
  { b: 'ימאהה', m: /^TRACER\s?7\s?Y-?AMT/, base: 67985, cc: 689, kw: 54.0, cons: 4.3, since: 2025, wiki: 'Yamaha Tracer 700' },
  { b: 'ימאהה', m: /^TRACER\s?7/, base: 64985, cc: 689, kw: 54.0, cons: 4.3, since: 2021, wiki: 'Yamaha Tracer 700' },
  { b: 'ימאהה', m: /^TENERE\s?700/, base: 74985, cc: 689, kw: 54.0, cons: 4.3, since: 2020, wiki: 'Yamaha Ténéré 700' },
  { b: 'ימאהה', m: /^MT-?09\s?SP\s?35\s?KW/, base: 84985, cc: 890, kw: 35.0, cons: 5.0, since: 2024, wiki: 'Yamaha MT-09' },
  { b: 'ימאהה', m: /^MT-?09\s?SP/, base: 84985, cc: 890, kw: 87.5, cons: 5.0, since: 2021, wiki: 'Yamaha MT-09' },
  { b: 'ימאהה', m: /^MT-?09\s?Y-?AMT/, base: 77985, cc: 890, kw: 87.5, cons: 5.0, since: 2025, wiki: 'Yamaha MT-09' },
  { b: 'ימאהה', m: /^MT-?09/, base: 74985, cc: 890, kw: 87.5, cons: 5.0, since: 2018, wiki: 'Yamaha MT-09' },
  { b: 'ימאהה', m: /^XSR900\s?GP/, base: 91985, cc: 890, kw: 87.5, cons: 5.0, since: 2024, wiki: 'Yamaha XSR900' },
  { b: 'ימאהה', m: /^XSR900/, base: 81985, cc: 890, kw: 87.5, cons: 5.0, since: 2022, wiki: 'Yamaha XSR900' },
  { b: 'ימאהה', m: /^R9\b/, base: 94985, cc: 890, kw: 87.5, cons: 5.0, since: 2025, wiki: 'Yamaha YZF-R9' },
  { b: 'ימאהה', m: /^TRACER\s?9\s?GT/, base: 96985, cc: 890, kw: 87.5, cons: 5.0, since: 2021, wiki: 'Yamaha Tracer 9' },
  { b: 'ימאהה', m: /^TRACER\s?9/, base: 82985, cc: 890, kw: 87.5, cons: 5.0, since: 2021, wiki: 'Yamaha Tracer 9' },
  { b: 'ימאהה', m: /^MT-?10\s?SP/, base: 122985, cc: 998, kw: 122.0, cons: 6.0, since: 2022, wiki: 'Yamaha MT-10' },
  { b: 'ימאהה', m: /^MT-?10/, base: 106985, cc: 998, kw: 122.0, cons: 6.0, since: 2018, wiki: 'Yamaha MT-10' },
  { b: 'ימאהה', m: /^YZF-?R1M/, base: 219985, cc: 998, kw: 147.1, cons: 6.8, since: 2020, wiki: 'Yamaha YZF-R1' },
  { b: 'ימאהה', m: /^YZF-?R1/, base: 159985, cc: 998, kw: 147.1, cons: 6.8, since: 2018, wiki: 'Yamaha YZF-R1' },

  // ---------------- קוואסאקי (יבואן: מטרו מוטור) ----------------
  { b: 'קוואסאקי', m: /^NINJA\s?500\s?SE/, base: 47985, cc: 451, kw: 33.4, cons: 4.1, since: 2024, wiki: null },
  { b: 'קוואסאקי', m: /^NINJA\s?500/, base: 45985, cc: 451, kw: 33.4, cons: 4.1, since: 2024, wiki: null },
  { b: 'קוואסאקי', m: /^Z500\s?SE/, base: 44985, cc: 451, kw: 33.4, cons: 4.1, since: 2024, wiki: null },
  { b: 'קוואסאקי', m: /^Z500/, base: 43985, cc: 451, kw: 33.4, cons: 4.1, since: 2024, wiki: null },
  { b: 'קוואסאקי', m: /^ELIMINATOR\s?500\s?SE/, base: 45985, cc: 451, kw: 33.4, cons: 3.9, since: 2024, wiki: null },
  { b: 'קוואסאקי', m: /^ELIMINATOR\s?500/, base: 43985, cc: 451, kw: 33.4, cons: 3.9, since: 2024, wiki: null },
  { b: 'קוואסאקי', m: /^KLE500\s?SE/, base: 45985, cc: 451, kw: 33.4, cons: 4.1, since: 2025, wiki: null },
  { b: 'קוואסאקי', m: /^KLE500/, base: 41994, cc: 451, kw: 33.4, cons: 4.1, since: 2025, wiki: null },
  { b: 'קוואסאקי', m: /^NINJA\s?ZX-?4RR/, base: 57985, cc: 399, kw: 56.5, cons: 5.0, since: 2024, wiki: 'Kawasaki Ninja ZX-4R' },
  { b: 'קוואסאקי', m: /^NINJA\s?ZX-?4R/, base: 52985, cc: 399, kw: 56.5, cons: 5.0, since: 2024, wiki: 'Kawasaki Ninja ZX-4R' },
  { b: 'קוואסאקי', m: /^NINJA\s?650/, base: 49985, cc: 649, kw: 50.2, cons: 4.3, since: 2018, wiki: 'Kawasaki Ninja 650' },
  { b: 'קוואסאקי', m: /^Z650/, base: 46985, cc: 649, kw: 50.2, cons: 4.3, since: 2018, wiki: 'Kawasaki Z650' },
  { b: 'קוואסאקי', m: /^VERSYS\s?650/, base: 56985, cc: 649, kw: 50.2, cons: 4.4, since: 2018, wiki: 'Kawasaki Versys 650' },
  { b: 'קוואסאקי', m: /^VULCAN\s?650/, base: 55985, cc: 649, kw: 45.0, cons: 4.4, since: 2018, wiki: null },
  { b: 'קוואסאקי', m: /^Z900\s?2025\s?35\s?KW/, base: 67985, cc: 948, kw: 35.0, cons: 5.4, since: 2025, wiki: 'Kawasaki Z900' },
  { b: 'קוואסאקי', m: /^Z900\s?SE/, base: 77985, cc: 948, kw: 92.2, cons: 5.4, since: 2022, wiki: 'Kawasaki Z900' },
  { b: 'קוואסאקי', m: /^Z900/, base: 69985, cc: 948, kw: 92.2, cons: 5.4, since: 2020, wiki: 'Kawasaki Z900' },
  { b: 'קוואסאקי', m: /^NINJA\s?ZX-?6R/, base: 94985, cc: 636, kw: 96.0, cons: 6.0, since: 2019, wiki: 'Kawasaki Ninja ZX-6R' },
  { b: 'קוואסאקי', m: /^VERSYS\s?1100\s?SE/, base: 111985, cc: 1099, kw: 99.0, cons: 5.7, since: 2025, wiki: 'Kawasaki Versys 1000' },
  { b: 'קוואסאקי', m: /^VERSYS\s?1100\s?S/, base: 106985, cc: 1099, kw: 99.0, cons: 5.7, since: 2025, wiki: 'Kawasaki Versys 1000' },
  { b: 'קוואסאקי', m: /^VERSYS\s?1100/, base: 89985, cc: 1099, kw: 99.0, cons: 5.7, since: 2025, wiki: 'Kawasaki Versys 1000' },
  { b: 'קוואסאקי', m: /^NINJA\s?1100\s?SX\s?SE/, base: 109985, cc: 1099, kw: 100.0, cons: 5.6, since: 2025, wiki: 'Kawasaki Ninja 1000' },
  { b: 'קוואסאקי', m: /^NINJA\s?1100\s?SX/, base: 99985, cc: 1099, kw: 100.0, cons: 5.6, since: 2025, wiki: 'Kawasaki Ninja 1000' },
  { b: 'קוואסאקי', m: /^Z1100\s?SE/, base: 97985, cc: 1099, kw: 100.0, cons: 5.6, since: 2025, wiki: null },
  { b: 'קוואסאקי', m: /^Z1100/, base: 86985, cc: 1099, kw: 100.0, cons: 5.6, since: 2025, wiki: null },
  { b: 'קוואסאקי', m: /^Z\s?H2/, base: 129985, cc: 998, kw: 147.1, cons: 6.6, since: 2021, wiki: null },
  { b: 'קוואסאקי', m: /^NINJA\s?ZX-?10RR/, base: 199985, cc: 998, kw: 149.3, cons: 6.8, since: 2021, wiki: 'Kawasaki Ninja ZX-10R' },
  { b: 'קוואסאקי', m: /^NINJA\s?ZX-?10R/, base: 159985, cc: 998, kw: 149.3, cons: 6.8, since: 2021, wiki: 'Kawasaki Ninja ZX-10R' },
  { b: 'קוואסאקי', m: /^NINJA\s?H2\s?SX/, base: 169985, cc: 998, kw: 147.1, cons: 6.6, since: 2022, wiki: 'Kawasaki Ninja H2' },

  // ---------------- וספה (יבואן: עופר אבניר) ----------------
  { b: 'וספה', m: /^PRIMAVERA/, base: 28290, cc: 125, kw: 7.9, cons: 2.4, since: 2018, wiki: 'Vespa Primavera' },
  { b: 'וספה', m: /^GTS/, base: 37950, cc: 278, kw: 17.5, cons: 3.1, since: 2019, wiki: 'Vespa GTS' },

  // ---------------- סאן יאנג SYM ----------------
  // ל־SYM אין ערכי ויקיפדיה לדגמים, ולכן wiki הוא null והכרטיס מציג אייקון.
  { b: 'סאן יאנג', m: /^MIO/, base: 16485, cc: 125, kw: 6.6, cons: 2.4, since: 2019, wiki: null },
  { b: 'סאן יאנג', m: /^DUKE\s?125/, base: 15485, cc: 125, kw: 6.6, cons: null, since: 2024, wiki: null },
  { b: 'סאן יאנג', m: /^JET\s?14\s?EVO\s?200/, base: 17985, cc: 169, kw: 8.8, cons: null, since: 2023, wiki: null },
  { b: 'סאן יאנג', m: /^JET\s?14/, base: 16985, cc: 125, kw: 7.2, cons: 2.5, since: 2019, wiki: null },
  { b: 'סאן יאנג', m: /^JET\s?X/, base: 19985, cc: 125, kw: 7.3, cons: 2.5, since: 2022, wiki: null },
  { b: 'סאן יאנג', m: /^SYMPHONY/, base: 16485, cc: 125, kw: 7.4, cons: 2.4, since: 2019, wiki: null },
  { b: 'סאן יאנג', m: /^JOYRIDE\s?125/, base: 23985, cc: 125, kw: 9.0, cons: null, since: 2022, wiki: null },
  { b: 'סאן יאנג', m: /^JOYRIDE\s?200/, base: 26985, cc: 169, kw: 12.0, cons: null, since: 2022, wiki: null },
  { b: 'סאן יאנג', m: /^JOYRIDE\s?300/, base: 31985, cc: 278, kw: 20.1, cons: null, since: 2022, wiki: null },
  { b: 'סאן יאנג', m: /^JOYMAX\s?Z\+?\s?125/, base: 25985, cc: 125, kw: 9.2, cons: 2.9, since: 2021, wiki: null },
  { b: 'סאן יאנג', m: /^JOYMAX\s?Z\+?\s?250/, base: 30985, cc: 249, kw: 16.0, cons: null, since: 2022, wiki: null },
  { b: 'סאן יאנג', m: /^JOYMAX\s?Z\+?\s?300/, base: 31985, cc: 278, kw: 19.3, cons: 3.3, since: 2021, wiki: null },
  { b: 'סאן יאנג', m: /^ADX\s?125/, base: 21985, cc: 125, kw: 9.0, cons: 2.6, since: 2024, wiki: null },
  { b: 'סאן יאנג', m: /^ADX\s?300/, base: 34985, cc: 278, kw: 19.5, cons: 3.4, since: 2025, wiki: null },
  { b: 'סאן יאנג', m: /^ADXTG\s?400/, base: 44985, cc: 399, kw: 26.0, cons: null, since: 2025, wiki: null },
  { b: 'סאן יאנג', m: /^CRUISYM\s?125/, base: 25985, cc: 125, kw: 9.1, cons: 2.9, since: 2020, wiki: null },
  { b: 'סאן יאנג', m: /^CRUISYM\s?300/, base: 34985, cc: 278, kw: 19.0, cons: 3.3, since: 2019, wiki: null },
  { b: 'סאן יאנג', m: /^MAXSYM\s?TL/, base: 55985, cc: 508, kw: 29.8, cons: 4.5, since: 2022, wiki: null },
  { b: 'סאן יאנג', m: /^MAXSYM\s?400/, base: 39985, cc: 400, kw: 24.6, cons: 3.9, since: 2021, wiki: null },

  // ---------------- רויאל אנפילד (יבואן: ד.ל.ב מוטוספורט) ----------------
  { b: 'רויאל אנפילד', m: /^CLASSIC\s?350/, base: 28990, cc: 349, kw: 15.0, cons: 2.9, since: 2022, wiki: 'Royal Enfield Classic' },
  { b: 'רויאל אנפילד', m: /^HUNTER\s?350/, base: 26318, cc: 349, kw: 15.0, cons: 2.8, since: 2023, wiki: 'Royal Enfield Hunter 350' },
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

    const cc = entry?.cc ?? a.cc ?? null
    const kw = entry?.kw ?? a.kw ?? null

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
      cc,
      kw,
      hp: kw != null ? Math.round(kw * HP_PER_KW * 10) / 10 : (a.hp ?? null),
      license: licenseFor(cc, kw, entry?.lic ?? a.license),
      consumption: entry?.cons ?? a.consumption ?? null,
      wiki: entry?.wiki ?? null,
      // נבדק ידנית מול ויקיפדיה: אם הדגם בספר ואין לו ערך, אין טעם לחפש.
      // חיפוש חופשי היה מחזיר כאן דגם מדור אחר (למשל נינג'ה 500R מ-2009).
      wikiChecked: !!entry,
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
