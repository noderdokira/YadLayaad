// src/lib/priceBook.js
// מערכת המחירים החדשה: ניקוי שמות, איחוד רמות גימור, מחירים מאומתים ושווי נוכחי.
//
// הרקע: טבלת המוצרים נבנתה ממאגר הרכב הממשלתי. יש בה שורה לכל רמת גימור,
// והמחיר בכל שורה הוא מחיר המחירון המקורי של אותה שנת דגם, לא שווי שוק נוכחי.
// חלק מהמחירים במאגר שגויים בעליל (למשל לוגיסטר 100 ב־40,000 ש"ח).
// הפתרון כאן:
//   1. cleanName    - הסרת ארץ הייצור משם הדגם.
//   2. PRICE_BOOK   - מחירי מחירון שאומתו ידנית מול מקורות ישראליים (יולי 2026).
//   3. normalizeCars - איחוד גימורים לדגם+שנה, תיקון מחיר, הערכת שווי נוכחי.
// מקורות אימות: rehev-info.co.il, carzone.co.il, auto.co.il, cartube.co.il,
// אתרי יבואנים רשמיים. שיעורי ירידת ערך: כ־15% בשנה הראשונה וכ־12-14% בהמשך,
// לפי סקירות שוק ישראליות.

import { isPriceSuspect } from './costModel'

export const PRICES_UPDATED = 'יולי 2026'
// לא פחות מ 2026 (חותמת ספר המחירים), ומתקדם אוטומטית כשהשנה מתחלפת
const CURRENT_YEAR = Math.max(2026, new Date().getFullYear())

// ---------- 1. ניקוי שם הדגם מארץ הייצור ----------

const COUNTRY_WORDS = [
  'סין', 'יפן', 'קוריאה', 'דרום', 'גרמניה', 'צרפת', 'ספרד', 'פורטוגל',
  'אנגליה', 'בריטניה', 'ארהב', 'ארה"ב', 'איטליה', 'צכיה', "צ'כיה", 'הודו',
  'טורקיה', 'תאילנד', 'הונגריה', 'סלובקיה', 'סלובניה', 'רומניה', 'מקסיקו',
  'בלגיה', 'הולנד', 'אוסטריה', 'פולין', 'שוודיה', 'שבדיה', 'פינלנד',
  'אפריקה', 'מרוקו', 'דקוריאה', 'דקוריא', 'וייטנאם', 'ויאטנם', 'ברזיל', 'ארגנטינה', 'אינדונזיה',
  'מלזיה', 'טאיוואן', 'טיוואן', 'קנדה', 'אוסטרליה', 'אירלנד', 'שווייץ',
  'שוויץ', 'סרביה', 'אוקראינה', 'רוסיה', 'אוזבקיסטן', 'סינגפור',
]

const strip = s => s.replace(/["'׳״.]/g, '')

function isCountryToken(tok) {
  const t = strip(tok)
  if (!t) return false
  return COUNTRY_WORDS.some(c => {
    const cc = strip(c)
    // התאמה מלאה, או קידומת קטומה של שם מדינה (במאגר יש שמות קטומים כמו "גרמנ")
    return t === cc || (t.length >= 4 && cc.startsWith(t) && cc !== t)
  })
}

export function cleanName(name) {
  if (!name) return ''
  return String(name)
    .split(/\s+/)
    .map(tok =>
      tok.includes('-')
        ? tok.split('-').filter(p => p && !isCountryToken(p)).join('-')
        : tok
    )
    .filter(tok => tok && !isCountryToken(tok))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ---------- 2. מחירון מאומת (נבדק ידנית מול מקורות ישראליים, יולי 2026) ----------
// b: היצרן בעברית כפי שמופיע בשם, m: ביטוי על החלק הלטיני של השם,
// base: מחיר מחירון עדכני לרכב חדש (2025-2026), years: מחירי שנים ספציפיות.

const PRICE_BOOK = [
  { b: 'מ.ג', m: /^MG\s?3/, base: 120220 },
  { b: 'מ.ג', m: /^MG\s?4/, base: 143550 },
  { b: 'מ.ג', m: /^ZS/, base: 156550 },
  { b: 'בי ווי די', m: /^(BYD\s)?DOLPHIN\s?SURF/, base: 114990 },
  { b: 'בי ווי די', m: /^(BYD\s)?ATTO\s?2/, base: 149650 },
  { b: 'בי ווי די', m: /^(BYD\s)?DOLPHIN(?!\s?SURF)/, base: 150650 },
  { b: 'ליפמוטור', m: /^T03/, base: 89900 },
  { b: 'סנטרו', m: /^LOGISTAR\s?100/, base: 99000, years: { 2023: 82000, 2024: 99000 } },
  { b: 'סיטרואן', m: /^C3(?!\s?AIRCROSS)/, base: 99990 },
  { b: 'טויוטה', m: /^AYGO/, base: 104990 },
  { b: 'קיה', m: /^PICANTO/, base: 109900 },
  { b: 'דונגפנג', m: /^BOX/, base: 113900 },
  { b: "צ'רי", m: /^TIGGO\s?4/, base: 114990 },
  { b: 'צרי', m: /^TIGGO\s?4/, base: 114990 },
  { b: 'סוזוקי', m: /^SWIFT/, base: 120330 },
  { b: 'סקודה', m: /^FABIA/, base: 121330 },
  { b: "דאצ'יה", m: /^SANDERO\s?STEPWAY/, base: 121990 },
  { b: 'דאציה', m: /^SANDERO\s?STEPWAY/, base: 121990 },
  { b: 'סיאט', m: /^IBIZA/, base: 122730 },
  { b: 'רנו', m: /^CLIO/, base: 125360 },
  { b: "דאצ'יה", m: /^LOGAN/, base: 128330 },
  { b: 'דאציה', m: /^LOGAN/, base: 128330 },
  { b: 'יונדאי', m: /^VENUE/, base: 130330 },
  { b: 'אופל', m: /^CORSA/, base: 130330 },
  { b: 'סיאט', m: /^ARONA/, base: 133240 },
  { b: "פיג'ו", m: /^208/, base: 135830 },
  { b: 'פיגו', m: /^208/, base: 135830 },
  { b: 'סקודה', m: /^SCALA/, base: 138830 },
  { b: 'קיה', m: /^STONIC/, base: 139240 },
  { b: "דאצ'יה", m: /^DUSTER/, base: 140330 },
  { b: 'דאציה', m: /^DUSTER/, base: 140330 },
  { b: 'סקודה', m: /^KAMIQ/, base: 140650 },
  { b: 'טויוטה', m: /^YARIS(?!\s?CROSS)/, base: 141330 },
  { b: 'סיטרואן', m: /^C3\s?AIRCROSS/, base: 145690 },
  { b: 'פולקסווגן', m: /^T-?CROSS/, base: 145560 },
  { b: 'ניסאן', m: /^JUKE/, base: 147650 },
  { b: "פיג'ו", m: /^2008/, base: 148650 },
  { b: 'פיגו', m: /^2008/, base: 148650 },
  { b: 'סיטרואן', m: /^C4(?!\s?X)/, base: 149690 },
  { b: 'אופל', m: /^MOKKA/, base: 150650 },
  { b: 'ביואיד', m: /^DOLPHIN\s?SURF/, base: 114990 },
  { b: 'BYD', m: /^DOLPHIN\s?SURF/, base: 114990 },
  { b: 'ביואיד', m: /^ATTO\s?2/, base: 149650 },
  { b: 'BYD', m: /^ATTO\s?2/, base: 149650 },
  { b: 'ביואיד', m: /^DOLPHIN/, base: 150650 },
  { b: 'BYD', m: /^DOLPHIN/, base: 150650 },
  { b: 'מיצובישי', m: /^ASX/, base: 151650 },
  { b: 'רנו', m: /^CAPTUR/, base: 152690 },
  { b: 'הונדה', m: /^JAZZ/, base: 155060 },
  { b: 'ניסאן', m: /^SENTRA/, base: 155650 },
  { b: 'טויוטה', m: /^COROLLA\s?CROSS/, base: 179990 },
  { b: 'טויוטה', m: /^COROLLA/, base: 159990 },
  { b: "צ'רי", m: /^TIGGO\s?7/, base: 159990 },
  { b: 'צרי', m: /^TIGGO\s?7/, base: 159990 },
  { b: 'יונדאי', m: /^KONA/, base: 176990 },
  { b: 'אם גי', m: /^MG\s?3/, base: 120220 },
  { b: "אם ג'י", m: /^MG\s?3/, base: 120220 },
  { b: 'אמגי', m: /^MG\s?3/, base: 120220 },
  { b: 'אם גי', m: /^MG\s?4/, base: 143550 },
  { b: "אם ג'י", m: /^MG\s?4/, base: 143550 },
  { b: 'אם גי', m: /^ZS/, base: 156550 },
  { b: "אם ג'י", m: /^ZS/, base: 156550 },
]

// ---------- זיהוי רכב חשמלי ----------
// מותגים שכל הדגמים שלהם חשמליים, ודגמים חשמליים מובהקים מספר המחירים.
// זיהוי שמרני: עדיף לפספס חשמלי מלסמן בטעות רכב בנזין כחשמלי.
const EV_BRANDS = ['ביואיד', 'בי ווי די', 'BYD', 'ליפמוטור', 'טסלה', 'אורה', 'איון', 'דיפאל']
const EV_MODELS = [/^T03/, /^MG\s?4/, /^DOLPHIN/, /^ATTO/, /^BOX$/, /^BOX\s/, /\bEV\b/]

export function isElectric(clean, attrs) {
  try {
    const a = JSON.stringify(attrs || {})
    if (a.includes('חשמל')) return true
    if (/"fuel"\s*:\s*"?elect/i.test(a)) return true
  } catch { /* לא קריטי */ }
  if (EV_BRANDS.some(b => clean.includes(b))) return true
  const latin = latinPart(clean)
  return EV_MODELS.some(rx => rx.test(latin))
}

function latinPart(clean) {
  const m = clean.match(/[A-Za-z0-9][A-Za-z0-9 .\-]*$/)
  return (m ? m[0] : '').trim().toUpperCase()
}

export function bookEntry(clean) {
  const latin = latinPart(clean)
  if (!latin) return null
  return PRICE_BOOK.find(e => clean.includes(e.b) && e.m.test(latin)) || null
}

// ---------- 3. שווי נוכחי: ירידת ערך שנתית מקובלת בישראל ----------
// כ־15% בשנה הראשונה, כ־12-14% בשנים הבאות, מתמתן בהמשך.

const DEP = [1, 0.85, 0.75, 0.67, 0.6, 0.54, 0.49]

export function depreciationFactor(age) {
  if (!(age > 0)) return 1
  if (age < DEP.length) return DEP[age]
  return Math.max(0.35, DEP[DEP.length - 1] * Math.pow(0.91, age - DEP.length + 1))
}

const round100 = x => Math.round(x / 100) * 100
const median = arr => (arr.length ? arr[Math.floor(arr.length / 2)] : 0)

// ---------- 4. איחוד גימורים ונרמול ----------
// מקבל שורות גולמיות מהמאגר ומחזיר רשומה אחת לכל דגם+שנה:
// market_price = המחיר שמציגים (שווי נוכחי מוערך לרכב משומש, מחירון לרכב חדש),
// list_price = מחיר המחירון של שנת הדגם, priceTag = תג ההסבר.

export function normalizeCars(rows) {
  const groups = new Map()
  for (const r of rows || []) {
    const clean = cleanName(r.name || '')
    const key = clean + '|' + (r.year ?? '')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  const out = []
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => (a.market_price ?? 0) - (b.market_price ?? 0))
    let prices = sorted.map(x => Number(x.market_price) || 0).filter(p => p > 0)
    // סינון גימור חריג כלפי מטה בתוך הקבוצה (שורה שגויה בודדת)
    const med0 = median(prices)
    if (prices.length >= 3) prices = prices.filter(p => p >= med0 * 0.55)

    const rep = sorted[Math.floor(sorted.length / 2)] || sorted[0]
    const clean = cleanName(rep.name || '')
    const year = rep.year ?? CURRENT_YEAR
    const age = Math.max(0, CURRENT_YEAR - year)

    const entry = bookEntry(clean)
    let listPrice = median(prices)
    let verified = false

    if (entry) {
      if (entry.years && entry.years[year] != null) {
        listPrice = entry.years[year]
        verified = true
      } else if (year >= 2025) {
        listPrice = entry.base
        verified = true
      } else if (isPriceSuspect({ market_price: listPrice, year })) {
        // מחיר המאגר לשנה הישנה שגוי בעליל, גוזרים מהמחיר המאומת של הדגם
        listPrice = entry.base
        verified = true
      }
    }

    const suspect = !verified && isPriceSuspect({ market_price: listPrice, year })
    const estimated = !suspect && age > 0
    const valueNow = estimated ? round100(listPrice * depreciationFactor(age)) : listPrice

    out.push({
      id: rep.id,
      name: clean,
      year,
      isEv: isElectric(clean, rep.attrs),
      market_price: suspect ? listPrice : valueNow,
      list_price: listPrice,
      addons_once: rep.addons_once,
      monthly_cost: rep.monthly_cost,
      attrs: rep.attrs,
      trims: list.length,
      priceRange: prices.length > 1 ? [prices[0], prices[prices.length - 1]] : null,
      verified,
      estimated,
      suspect,
    })
  }
  return out
}

// תג המחיר להצגה ליד המספר
export function priceTag(v) {
  if (!v) return null
  if (v.suspect) return { txt: 'מחיר לא מאומת', kind: 'warn' }
  if (v.verified && !v.estimated) return { txt: 'מחיר מאומת ' + PRICES_UPDATED, kind: 'ok' }
  if (v.estimated) return { txt: 'שווי מוערך היום', kind: 'info' }
  return { txt: 'מחיר מחירון', kind: 'muted' }
}

// ---------- 5. חיפוש ביד שנייה ----------
export function usedSearchUrl(v) {
  const q = 'יד2 ' + (v?.name || '') + ' ' + (v?.year || '')
  return 'https://www.google.com/search?q=' + encodeURIComponent(q.trim())
}

// ---------- 6. מד רמת חיסכון: כמה קשה יהיה לחסוך לרכב ----------
// 1 = קל מאוד ... 5 = קשה מאוד, לפי מספר חודשי החיסכון בקצב של המשתמש.

const LEVEL_LABEL = ['', 'קל מאוד', 'קל', 'בינוני', 'מאתגר', 'קשה מאוד']

export function savingsLevel(price, monthlyCapacity, currentSavings) {
  if (!(monthlyCapacity > 0) || !(price > 0)) return null
  const target = Math.max(0, price - (currentSavings ?? 0))
  const months = Math.ceil(target / monthlyCapacity)
  let level
  if (months <= 8) level = 1
  else if (months <= 18) level = 2
  else if (months <= 30) level = 3
  else if (months <= 48) level = 4
  else level = 5
  return { months, level, label: LEVEL_LABEL[level] }
}
