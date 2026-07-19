// src/lib/consumptionBook.js
// צריכת דלק פר דגם רכב, במקום ברירת המחדל הגלובלית של 7 ליטר ל 100 ק"מ.
//
// מקור: מאגר ה־WLTP של משרד התחבורה ב־data.gov.il
// (resource 142afde2-6228-49f9-8a29-9b6c3a0cbe40, נסרק ביולי 2026, 100,325 רשומות).
//
// חשוב: במאגר אין שדה של צריכת דלק. יש בו פליטת CO2 לפי מחזור WLTP,
// והצריכה כאן נגזרת ממנה לפי יחסי הבעירה המקובלים באיחוד האירופי:
//   ליטר בנזין משחרר כ־2,392 גרם CO2  →  ליטר ל 100 ק"מ = CO2 חלקי 23.92
//   ליטר סולר  משחרר כ־2,640 גרם CO2  →  ליטר ל 100 ק"מ = CO2 חלקי 26.40
// לכל דגם נלקח החציון של כל הגרסאות שלו בשנתונים 2017 ומעלה, ולכן דגם
// שנמכר בארץ בעיקר כהיברידי (קורולה, יאריס) מקבל ערך נמוך בהתאם. זה מכוון:
// זה משקף את מה שקונה בפועל מוצא בשוק.
//
// שני סייגים שחשוב להכיר:
//   1. פלאג אין (PHEV) לא נכלל כאן. תקן WLTP מודד אותו עם זיכוי סוללה,
//      ויוצא ערך כמו 2 ליטר ל 100 ק"מ שלא מייצג נהיגה בלי הטענה יומית.
//      דגמים כאלה נופלים לברירת המחדל, וזה עדיף על מספר שמטעה כלפי מטה.
//   2. הרשימה מכסה את דגמי הבסיס הנפוצים בישראל, לא את כל 1,486 הצירופים
//      שבמאגר. שם דגם שלא נמצא נופל לברירת המחדל ומסומן ככזה בממשק.
//
// רענון: יחד עם רענון המחירון הרבעוני. הכלי שמפיק את הרשימה הוא
// tools/consumptionFetch.md, שמתאר את השאילתה להרצה בדפדפן.

export const CONSUMPTION_UPDATED = '2026-07'

// יצרן בעברית -> שם הדגם הלטיני -> ליטר ל 100 ק"מ (חציון WLTP)
const BOOK = {
  'טויוטה': {
    'COROLLA CROSS': 4.8, 'COROLLA': 4.3, 'YARIS CROSS': 4.2, 'YARIS': 5.2,
    'AYGO': 5.0, 'C-HR': 4.5, 'RAV 4': 5.4,
  },
  'קיה': {
    'PICANTO': 5.6, 'RIO': 5.8, 'STONIC': 5.6, 'CEED': 5.4,
    'NIRO': 4.6, 'SPORTAGE': 6.7,
  },
  'יונדאי': {
    'I10': 5.4, 'I20': 5.6, 'I30': 5.7, 'KONA': 6.3,
    'TUCSON': 6.8, 'BAYON': 5.3, 'VENUE': 6.2,
  },
  'סקודה': {
    'FABIA': 5.1, 'SCALA': 5.6, 'OCTAVIA': 5.2, 'KAMIQ': 5.6, 'KAROQ': 6.4,
  },
  'פולקסווגן': {
    'POLO': 5.8, 'GOLF': 5.5, 'T-CROSS': 6.0, 'T-ROC': 6.2,
  },
  'סיאט': { 'IBIZA': 5.6, 'ARONA': 5.8, 'LEON': 6.1 },
  'דאציה': {
    'SANDERO STEPWAY': 5.9, 'SANDERO': 6.2, 'DUSTER': 6.0, 'LOGAN': 5.4,
  },
  'רנו': { 'CLIO': 5.6, 'CAPTUR': 5.8 },
  'שברולט': { 'SPARK': 5.9 },
  'סוזוקי': { 'SWIFT': 5.1, 'BALENO': 5.5, 'VITARA': 5.5, 'IGNIS': 5.2 },
  'ניסאן': { 'MICRA': 5.9, 'QASHQAI': 6.1, 'JUKE': 5.8 },
  'מיצובישי': { 'SPACE STAR': 5.3, 'ASX': 7.4 },
  'פיגו': { '208': 5.3, '2008': 5.7, '3008': 5.3 },
  'סיטרואן': { 'C3': 5.8, 'C4': 5.6, 'BERLINGO': 5.8 },
  'הונדה': { 'JAZZ': 5.5, 'CIVIC': 6.3 },
  'פורד': { 'FOCUS': 6.1, 'PUMA': 5.7 },
  'אופל': { 'CROSSLAND X': 6.4, 'CROSSLAND': 5.8, 'CORSA': 5.2 },
  'מיני': { 'COOPER S': 6.0, 'COOPER': 5.3 },
  'צרי': {
    'TIGGO 4 HYBRID': 5.0, 'TIGGO 4 PRO': 7.4, 'TIGGO 4': 7.4,
    'TIGGO 7 HEV': 5.4, 'TIGGO 7 PRO': 7.1, 'TIGGO 7': 7.1,
    'TIGGO 8 PRO': 7.7, 'TIGGO 8': 7.7,
  },
}

// איות היצרן בקטלוג לא אחיד: גרש, נקודות ורווחים מופיעים ולא מופיעים.
// מנרמלים לפני ההשוואה כדי ש"פיג'ו" ו"פיגו" יגיעו לאותה רשומה.
function normBrand(s) {
  return String(s || '').replace(/['".׳״\s]/g, '')
}

const INDEX = Object.entries(BOOK).map(([b, models]) => [normBrand(b), models])

export function consumptionFor(name) {
  const raw = String(name || '')
  const latin = (raw.match(/[A-Za-z0-9][A-Za-z0-9 .\-]*$/) || [''])[0].trim().toUpperCase()
  if (!latin) return null
  const brand = normBrand(raw.slice(0, raw.length - latin.length))
  if (!brand) return null

  const entry = INDEX.find(([b]) => brand.includes(b) || b.includes(brand))
  if (!entry) return null
  const models = entry[1]

  if (models[latin] != null) return models[latin]
  // התאמת תחילית: "COROLLA HYBRID" נופל ל"COROLLA".
  // עוברים מהארוך לקצר כדי ש"COROLLA CROSS" לא ייבלע על ידי "COROLLA".
  const keys = Object.keys(models).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (latin === k || latin.startsWith(k + ' ')) return models[k]
  }
  return null
}
