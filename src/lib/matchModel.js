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
