// src/Compare.jsx
import { estimateM } from './lib/costModel'
import { savingsLevel } from './lib/priceBook'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

export default function Compare({ cars, profile, onBack, onPick }) {
  const user = { birthYear: profile?.birth_year, licenseYear: profile?.license_year }
  const cap = profile?.monthly_capacity
  const savings = profile?.current_savings ?? 0

  const cols = (cars || []).map(v => {
    const m = estimateM(v, user, { includeEstimates: true })
    const lvl = savingsLevel(v.market_price, cap, savings)
    const byKey = {}
    m.components.forEach(c => { byKey[c.key] = c.monthly })
    return { v, m, lvl, byKey }
  })

  const rows = [
    { label: 'מחיר', get: c => fmt(c.v.market_price) + ' ₪' },
    { label: 'שנה', get: c => c.v.year },
    { label: 'עלות חודשית משוערת', get: c => fmt(c.m.total) + ' ₪', strong: true },
    { label: 'אגרה ורדיו', get: c => fmt(c.byKey.agra) + ' ₪' },
    { label: 'דלק / חשמל', get: c => fmt(c.byKey.fuel) + ' ₪' },
    { label: 'ביטוח, הערכה', get: c => fmt(c.byKey.insurance) + ' ₪' },
    { label: 'טיפולים, הערכה', get: c => fmt(c.byKey.maintenance) + ' ₪' },
    { label: 'חודשי חיסכון בקצב שלך', get: c => (c.lvl ? 'כ ' + c.lvl.months : 'אין נתון'), strong: true },
    { label: 'רמת חיסכון', get: c => (c.lvl ? '💰'.repeat(c.lvl.level) : 'אין נתון') },
  ]

  const cell = { padding: '8px 6px', borderBottom: '1px solid var(--color-border)', fontSize: 12.5, textAlign: 'center' }
  const head = { ...cell, fontWeight: 700, fontSize: 12 }

  return (
    <div className="page-wrap page-wrap--wide">
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה לקטלוג</button>
      <div className="page-title" style={{ marginBottom: 10 }}>השוואת רכבים</div>
      {cols.length < 2 && <div style={{ color: 'var(--color-text-muted)' }}>בחר לפחות שני רכבים להשוואה</div>}
      {cols.length >= 2 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: 'right' }}></th>
              {cols.map(c => (
                <th key={c.v.id} style={head}>
                  {c.v.name}
                  <div>
                    <button onClick={() => onPick(c.v)} style={{ marginTop: 4, padding: '3px 8px', fontSize: 11 }}>פתיחה</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label}>
                <td style={{ ...cell, textAlign: 'right', fontWeight: r.strong ? 800 : 400 }}>{r.label}</td>
                {cols.map(c => (
                  <td key={c.v.id} style={{ ...cell, fontWeight: r.strong ? 800 : 400 }}>{r.get(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 10 }}>
        הביטוח והטיפולים הם הערכות לפי הפרופיל שלך, לא הצעת מחיר.
      </div>
    </div>
  )
}
