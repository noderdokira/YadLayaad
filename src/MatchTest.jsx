// src/MatchTest.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { rankCars } from './lib/matchModel'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

const QUESTIONS = [
  { key: 'budgetMax', q: 'כמה בערך תרצה להשקיע בקניית הרכב?',
    opts: [['עד 50 אלף', 50000], ['עד 90 אלף', 90000], ['עד 130 אלף', 130000], ['עד 180 אלף', 180000]] },
  { key: 'mCeiling', q: 'איזו עלות חודשית תרגיש לך נוחה?',
    opts: [['עד 1,200 בחודש', 1200], ['עד 1,800 בחודש', 1800], ['עד 2,500 בחודש', 2500], ['בלי הגבלה', 0]] },
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
    const { data, error: qErr } = await supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('kind', 'car')
      .lte('market_price', Math.round(budget * 1.15))
      .order('market_price', { ascending: true })
      .limit(300)
    setBusy(false)
    if (qErr) { setErr(qErr.message); return }
    setResults(rankCars(data || [], prefs, userCtx))
  }

  useEffect(() => {
    if (profile?.car_prefs) runMatch(profile.car_prefs, false)
  }, [])

  function pick(key, val) {
    const a = { ...answers, [key]: val }
    setAnswers(a)
    if (step + 1 < QUESTIONS.length) setTimeout(() => setStep(s => s + 1), 120)
    else runMatch(a, true)
  }

  function redo() { setResults(null); setAnswers({}); setStep(0); setErr('') }

  const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const optBtn = { display: 'block', width: '100%', padding: 12, marginBottom: 8, textAlign: 'right', borderRadius: 10, border: '1px solid #ccc', background: '#fafafa', fontSize: 15, cursor: 'pointer' }

  if (busy) return <div style={wrap}>מחשב התאמות</div>

  if (results) {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={onBack} style={{ padding: '6px 10px' }}>חזרה לקטלוג</button>
          <button onClick={redo} style={{ padding: '6px 10px' }}>מילוי מחדש</button>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>הרכבים שהכי מתאימים לך</div>
        {results.length === 0 && <div style={{ color: '#999' }}>לא נמצאו רכבים מתאימים בתקציב הזה</div>}
        {results.map(r => (
          <div key={r.v.id} onClick={() => onPick(r.v)}
            style={{ padding: 12, borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{r.v.name}</div>
              <div style={{ fontSize: 12, color: '#999' }}>שנת {r.v.year} · {fmt(r.v.market_price)} ₪ · כ {fmt(r.m.total)} ₪ בחודש</div>
              <div style={{ fontSize: 11.5, color: '#555', marginTop: 2 }}>{r.reasons.slice(0, 2).join(' · ')}</div>
            </div>
            <div style={{
              fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap',
              color: r.score >= 80 ? '#2e7d32' : r.score >= 60 ? '#b26a00' : '#777',
            }}>
              {r.score}
            </div>
          </div>
        ))}
        {err && <p style={{ color: '#c00', marginTop: 10 }}>{err}</p>}
      </div>
    )
  }

  const cur = QUESTIONS[step]
  return (
    <div style={wrap}>
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה לקטלוג</button>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>שאלה {step + 1} מתוך {QUESTIONS.length}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{cur.q}</div>
      {cur.opts.map(([label, val], k) => (
        <button key={k} style={optBtn} onClick={() => pick(cur.key, val)}>{label}</button>
      ))}
      {err && <p style={{ color: '#c00', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
