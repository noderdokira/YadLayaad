// src/MatchTest.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { rankCars } from './lib/matchModel'
import { normalizeCars } from './lib/priceBook'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

const QUESTIONS = [
  { key: 'budgetMax', q: 'כמה בערך תרצה להשקיע בקניית הרכב?', custom: 'או סכום מדויק בשקלים',
    opts: [['עד 90 אלף', 90000], ['עד 150 אלף', 150000], ['עד 250 אלף', 250000], ['עד 400 אלף', 400000]] },
  { key: 'minYear', q: 'משנת ייצור מסוימת ומעלה?', custom: 'או שנה מדויקת, למשל 2021',
    opts: [['לא משנה לי', 0], ['משנת 2020 ומעלה', 2020], ['משנת 2023 ומעלה', 2023], ['רק 2025 ומעלה', 2025]] },
  { key: 'mCeiling', q: 'איזו עלות חודשית תרגיש לך נוחה?',
    opts: [['עד 1,500 בחודש', 1500], ['עד 2,500 בחודש', 2500], ['עד 3,500 בחודש', 3500], ['בלי הגבלה', 0]] },
  { key: 'kmMonthly', q: 'כמה תיסע בחודש בערך?',
    opts: [['מעט, עד 500 קמ', 500], ['בינוני, בערך 1,000 קמ', 1000], ['הרבה, 1,500 קמ ומעלה', 1600]] },
  { key: 'newness', q: 'חדש או משומש?',
    opts: [['רק חדש', 'new'], ['עדיף חדש, אבל גמיש', 'prefer_new'], ['משומש זה מצוין', 'used_ok']] },
  { key: 'priority', q: 'מה חשוב לך יותר?',
    opts: [['מחיר קנייה נמוך', 'price'], ['עלות חודשית נמוכה', 'monthly'], ['איזון בין השניים', 'balanced']] },
  { key: 'horizonMonths', q: 'מתי תרצה שהרכב כבר יהיה שלך?',
    opts: [['תוך שנה', 12], ['תוך שנתיים', 24], ['שלוש שנים ומעלה', 40]] },
]

export default function MatchTest({ profile, onPick, onBack }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [customVal, setCustomVal] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const userCtx = {
    birthYear: profile?.birth_year,
    licenseYear: profile?.license_year,
    monthlyCapacity: profile?.monthly_capacity,
    currentSavings: profile?.current_savings,
  }

  async function runMatch(prefs, save) {
    setBusy(true); setErr('')
    if (save) {
      const { error } = await supabase.from('profiles').update({ car_prefs: prefs }).eq('id', profile.id)
      if (error) {
        setBusy(false)
        setErr(error.message.includes('car_prefs') ? 'נראה שקטע ה SQL עוד לא הורץ בסופבייס' : error.message)
        return
      }
    }
    const budget = prefs.budgetMax || 200000
    // מרחיבים את הרשת: המחיר בבסיס הנתונים הוא מחירון מקורי לפי גימור,
    // והמחיר המוצג אחרי נרמול יכול להיות נמוך ממנו. הסינון הסופי נעשה בציון.
    let req = supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('kind', 'car')
      .lte('market_price', Math.round(budget * 1.6))
      .order('market_price', { ascending: true })
      .limit(600)
    if (prefs.minYear > 0) req = req.gte('year', prefs.minYear)
    const { data, error: qErr } = await req
    setBusy(false)
    if (qErr) { setErr(qErr.message); return }
    setResults(rankCars(normalizeCars(data || []), prefs, userCtx))
  }

  useEffect(() => {
    if (profile?.car_prefs) runMatch(profile.car_prefs, false)
  }, [])

  function advance(key, val) {
    const a = { ...answers, [key]: val }
    setAnswers(a)
    setCustomVal(''); setErr('')
    if (step + 1 < QUESTIONS.length) setTimeout(() => setStep(s => s + 1), 120)
    else runMatch(a, true)
  }

  function pickCustom() {
    const cur = QUESTIONS[step]
    const n = Number(customVal)
    if (!(n > 0)) { setErr('הזן מספר חיובי'); return }
    if (cur.key === 'minYear' && (n < 1990 || n > new Date().getFullYear() + 1)) { setErr('שנה לא סבירה'); return }
    advance(cur.key, n)
  }

  function redo() { setResults(null); setAnswers({}); setStep(0); setErr(''); setCustomVal('') }

  const wrap = { maxWidth: 480, margin: '20px auto', direction: 'rtl', padding: 16 }
  const optBtn = {
    display: 'block', width: '100%', padding: 12, marginBottom: 8, textAlign: 'right',
    borderRadius: 10, border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer',
  }

  if (busy) return <div style={wrap}>מחשב התאמות</div>

  if (results) {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={onBack} style={{ padding: '6px 10px' }}>חזרה לקטלוג</button>
          <button onClick={redo} style={{ padding: '6px 10px' }}>מילוי מחדש</button>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>הרכבים שהכי מתאימים לך</div>
        {results.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>לא נמצאו רכבים מתאימים לתנאים האלה</div>}
        {results.map(r => (
          <div key={r.v.id} onClick={() => onPick(r.v)}
            style={{ padding: 12, borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{r.v.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>שנת {r.v.year} · {fmt(r.v.market_price)} ₪ · כ {fmt(r.m.total)} ₪ בחודש</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.reasons.slice(0, 2).join(' · ')}</div>
            </div>
            <div style={{
              fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap',
              color: r.score >= 80 ? 'var(--color-primary)' : r.score >= 60 ? 'var(--color-warn)' : 'var(--color-text-muted)',
            }}>
              {r.score}
            </div>
          </div>
        ))}
        {err && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
      </div>
    )
  }

  const cur = QUESTIONS[step]
  return (
    <div style={wrap}>
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה לקטלוג</button>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>שאלה {step + 1} מתוך {QUESTIONS.length}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{cur.q}</div>
      {cur.opts.map(([label, val], k) => (
        <button key={k} style={optBtn} onClick={() => advance(cur.key, val)}>{label}</button>
      ))}
      {cur.custom && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            style={{ flex: 1, padding: 10 }}
            inputMode="numeric" placeholder={cur.custom}
            value={customVal} onChange={e => setCustomVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') pickCustom() }}
          />
          <button onClick={pickCustom} style={{ padding: '8px 14px' }}>המשך</button>
        </div>
      )}
      {err && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
