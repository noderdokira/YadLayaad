// src/lib/matchModel.js
// ציון התאמה 0 עד 100 לכל רכב, לפי העדפות המשתמש ונתוני הפרופיל.
// הרשימה שמגיעה לכאן היא אחרי נרמול (normalizeCars): מחיר מוצג, דגל suspect וכו'.
import { estimateM, isPriceSuspect } from './costModel'

const WEIGHTS = {
  price: { price: 0.4, monthly: 0.2, newness: 0.15, feasible: 0.25 },
  monthly: { price: 0.2, monthly: 0.4, newness: 0.15, feasible: 0.25 },
  balanced: { price: 0.3, monthly: 0.3, newness: 0.15, feasible: 0.25 },
}

export function scoreCar(v, prefs = {}, user = {}) {
  const w = WEIGHTS[prefs.priority] || WEIGHTS.balanced
  const price = v.market_price ?? 0
  const cy = new Date().getFullYear()

  const m = estimateM(v, {
    birthYear: user.birthYear,
    licenseYear: user.licenseYear,
    kmPerYear: prefs.kmMonthly ? prefs.kmMonthly * 12 : undefined,
  }, { includeEstimates: true })

  const parts = []
  const reasons = []

  if (prefs.budgetMax > 0) {
    let s
    if (price <= prefs.budgetMax * 0.8) { s = 1; reasons.push('מתחת לתקציב בנוחות') }
    else if (price <= prefs.budgetMax) { s = 0.75; reasons.push('בתוך התקציב') }
    else { s = Math.max(0, 0.45 - (price - prefs.budgetMax) / prefs.budgetMax); reasons.push('מעל התקציב') }
    parts.push([w.price, s])
  }

  if (prefs.mCeiling > 0) {
    let s
    if (m.total <= prefs.mCeiling * 0.85) { s = 1; reasons.push('עלות חודשית נוחה') }
    else if (m.total <= prefs.mCeiling) { s = 0.7; reasons.push('עלות חודשית על הגבול') }
    else { s = Math.max(0, 0.4 - (m.total - prefs.mCeiling) / prefs.mCeiling); reasons.push('עלות חודשית גבוהה ממה שרצית') }
    parts.push([w.monthly, s])
  }

  if (prefs.newness) {
    let s = 1
    if (prefs.newness === 'new') s = v.year >= cy - 1 ? 1 : v.year >= cy - 4 ? 0.5 : 0.2
    else if (prefs.newness === 'prefer_new') s = v.year >= cy - 2 ? 1 : v.year >= cy - 6 ? 0.7 : 0.45
    if (prefs.newness !== 'used_ok' && v.year >= cy - 1) reasons.push('רכב חדש')
    parts.push([w.newness, s])
  }

  let months = null
  if (user.monthlyCapacity > 0) {
    const target = Math.max(0, price - (user.currentSavings ?? 0))
    months = Math.ceil(target / user.monthlyCapacity)
    const horizon = prefs.horizonMonths || 24
    let s
    if (months <= horizon) { s = 1; reasons.push(`בהישג יד בכ ${months} חודשים`) }
    else { s = Math.max(0, 1 - (months - horizon) / horizon); reasons.push(`דורש כ ${months} חודשי חיסכון`) }
    parts.push([w.feasible, s])
  }

  const wSum = parts.reduce((a, p) => a + p[0], 0) || 1
  const score = Math.round(100 * parts.reduce((a, p) => a + p[0] * p[1], 0) / wSum)
  return { score, m, months, reasons }
}

export function rankCars(list, prefs, user, topN = 12) {
  return (list || [])
    .filter(v => !(v.suspect ?? isPriceSuspect(v)))
    .map(v => ({ v, ...scoreCar(v, prefs, user) }))
    .sort((a, b) => b.score - a.score || (a.v.market_price ?? 0) - (b.v.market_price ?? 0))
    .slice(0, topN)
}

// ---------------- דו גלגלי ----------------
// דרגת הרישיון היא מסנן קשיח ולא רכיב ציון, והבחירה בה היא כוונת קנייה
// ולא היתר חוקי: מי שבחר A1 רשאי לרכוב גם על A2, אבל הוא לא בא לשמוע
// על קטנועי 125 זולים, אחרת היה בוחר A2. לכן דרגה שנבחרה מציגה את
// הדרגה הזו בלבד. 'any' פירושו עוד אין רישיון, ואז מציגים הכל
// והדרגה מופיעה על הכרטיס ממילא.
const LICENSE_ALLOWS = {
  A2: ['A2'],
  A1: ['A1'],
  A: ['A'],
  any: ['A2', 'A1', 'A'],
}

const MOTO_W = { price: 0.3, monthly: 0.25, feasible: 0.25, fit: 0.2 }

export function scoreMoto(v, prefs = {}, user = {}) {
  const price = v.market_price ?? 0
  const m = estimateM(v, { birthYear: user.birthYear, licenseYear: user.licenseYear }, { includeEstimates: true })
  const parts = []
  const reasons = []

  if (prefs.budgetMax > 0) {
    let s
    if (price <= prefs.budgetMax * 0.8) { s = 1; reasons.push('מתחת לתקציב בנוחות') }
    else if (price <= prefs.budgetMax) { s = 0.75; reasons.push('בתוך התקציב') }
    else { s = Math.max(0, 0.45 - (price - prefs.budgetMax) / prefs.budgetMax); reasons.push('מעל התקציב') }
    parts.push([MOTO_W.price, s])
  }

  if (prefs.mCeiling > 0) {
    let s
    if (m.total <= prefs.mCeiling * 0.85) { s = 1; reasons.push('עלות חודשית נוחה') }
    else if (m.total <= prefs.mCeiling) { s = 0.7; reasons.push('עלות חודשית על הגבול') }
    else { s = Math.max(0, 0.4 - (m.total - prefs.mCeiling) / prefs.mCeiling); reasons.push('עלות חודשית גבוהה מהיעד') }
    parts.push([MOTO_W.monthly, s])
  }

  let months = null
  if (user.monthlyCapacity > 0) {
    const target = Math.max(0, price - (user.currentSavings ?? 0))
    months = Math.ceil(target / user.monthlyCapacity)
    const horizon = prefs.horizonMonths || 24
    let s
    if (months <= horizon) { s = 1; reasons.push(`בהישג יד בכ ${months} חודשים`) }
    else { s = Math.max(0, 1 - (months - horizon) / horizon); reasons.push(`דורש כ ${months} חודשי חיסכון`) }
    parts.push([MOTO_W.feasible, s])
  }

  // התאמה לאופי הרכיבה: קטנוע מול הילוכים, עיר מול בין עירוני, וניסיון
  let fit = 1
  const scooter = v.isScooter
  if (prefs.style === 'scooter' && !scooter) { fit -= 0.6 }
  else if (prefs.style === 'geared' && scooter) { fit -= 0.6 }
  else if (prefs.style && prefs.style !== 'any') { reasons.push(scooter ? 'קטנוע אוטומטי' : 'אופנוע הילוכים') }

  const cc = v.cc ?? 0
  if (prefs.usage === 'urban') {
    if (cc > 0 && cc <= 330) reasons.push('זריז ונוח לעיר')
    else if (cc > 500) { fit -= 0.3; reasons.push('גדול מהנדרש לעיר') }
  } else if (prefs.usage === 'road') {
    if (cc >= 300) reasons.push('יציב לבין עירוני')
    else if (cc > 0) { fit -= 0.35; reasons.push('קטן לנסיעות בין עירוניות') }
  }

  if (prefs.exp === 'none') {
    if (v.kw != null && v.kw > 35) { fit -= 0.5; reasons.push('חזק מדי לרכיבה ראשונה') }
    else if (v.kw != null) reasons.push('ידידותי להתחלה')
  }

  // בטיחות אלקטרונית: ABS ודאי מעל 125 סמ"ק (תקנה אירופית 168/2013).
  // בקרת אחיזה ידועה רק לדגמים שסומנו מול מפרט יבואן, ולכן חוסר סימון
  // הוא הסתייגות ולא פסילה: ייתכן שיש והספר פשוט עוד לא יודע.
  if (prefs.tech === 'abs') {
    if (v.abs === true) reasons.push('עם ABS')
    else { fit -= 0.35; reasons.push('ABS לא מובטח בדגם הזה') }
  } else if (prefs.tech === 'tc') {
    if (v.tc === true) reasons.push('עם ABS ובקרת אחיזה')
    else { fit -= 0.4; reasons.push('בקרת אחיזה לא מאומתת לדגם') }
  }
  parts.push([MOTO_W.fit, Math.max(0, Math.min(1, fit))])

  const wSum = parts.reduce((a, p) => a + p[0], 0) || 1
  const score = Math.round(100 * parts.reduce((a, p) => a + p[0] * p[1], 0) / wSum)
  return { score, m, months, reasons }
}

export function rankMotos(list, prefs, user, topN = 12) {
  const allow = LICENSE_ALLOWS[prefs.license] || LICENSE_ALLOWS.any
  const cy = new Date().getFullYear()
  const cc = Array.isArray(prefs.ccRange) ? prefs.ccRange : null
  return (list || [])
    .filter(v => !v.suspect)
    .filter(v => !v.license || allow.includes(v.license))
    // נפח מנוע: מסנן קשיח כמו הדרגה, כוונת קנייה ולא העדפה רכה
    .filter(v => !cc || (v.cc != null && v.cc >= cc[0] && v.cc <= cc[1]))
    // "רק חדש מהיבואן": שנתון נוכחי בלבד. מחירי שנתונים קודמים הם שווי
    // מוערך ליד שנייה ולא רלוונטיים למי שקונה חדש
    .filter(v => prefs.newness !== 'new' || v.year >= cy - 1)
    .map(v => ({ v, ...scoreMoto(v, prefs, user) }))
    .sort((a, b) => b.score - a.score || (a.v.market_price ?? 0) - (b.v.market_price ?? 0))
    .slice(0, topN)
}
