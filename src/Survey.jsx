import { useState } from 'react'
import { supabase } from './lib/supabase'

const SURVEY = [
  { q: 'כשבא לך משהו, אתה בדרך כלל', type: 'sigma',
    opts: [['קונה מיד', 0.0], ['חושב על זה כמה ימים', 0.6], ['כמעט תמיד מתאפק', 1.0]] },
  { q: 'מה אתה מעדיף', type: 'sigma',
    opts: [['סכום קטן עכשיו', 0.0], ['תלוי בכמה', 0.5], ['סכום גדול בעוד זמן', 1.0]] },
  { q: 'בעבר, לחסוך למשהו גדול', type: 'sigma',
    opts: [['אף פעם לא הצלחתי', 0.0], ['הצלחתי לפעמים', 0.5], ['תמיד מסיים מה שהתחלתי', 1.0]] },
  { q: 'כדי להגיע מהר ליעד, לוותר על בילויים ופינוקים', type: 'sigma',
    opts: [['ממש לא בא לי', 0.0], ['קצת, בסדר', 0.5], ['בלי בעיה', 1.0]] },
  { q: 'אני עוקב אחרי ההוצאות שלי', type: 'sigma',
    opts: [['בכלל לא', 0.0], ['בערך', 0.5], ['בדיוק', 1.0]] },
  { q: 'החיסכון שלי בדרך כלל', type: 'sigma',
    opts: [['לא יציב, תלוי בחודש', 0.2], ['פחות או יותר קבוע', 0.6], ['קבוע כמו שעון', 1.0]] },
  { q: 'מה הכי גורם לך להתמיד', type: 'style',
    opts: [['שהכל קורה אוטומטית', 'automation'], ['נקודות, רצפים והתקדמות', 'gamification'], ['דדליין ולחץ של זמן', 'deadline']] },
]

export default function Survey({ userId, onDone }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [income, setIncome] = useState('')
  const [savings, setSavings] = useState('')
  const [monthly, setMonthly] = useState('')
  const [license, setLicense] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const isSurvey = step < SURVEY.length
  const cur = SURVEY[step]

  function pick(val) {
    setAnswers(a => ({ ...a, [step]: val }))
    setTimeout(() => setStep(s => s + 1), 150)
  }

  async function finish() {
    setSaving(true); setErr('')
    const sig = []
    let style = 'automation'
    SURVEY.forEach((item, i) => {
      const val = answers[i]
      if (item.type === 'sigma' && val != null) sig.push(val)
      if (item.type === 'style' && val != null) style = val
    })
    const sigma = sig.length ? sig.reduce((x, y) => x + y, 0) / sig.length : 0.5

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      income: income === '' ? null : Number(income),
      current_savings: savings === '' ? 0 : Number(savings),
      monthly_capacity: monthly === '' ? null : Number(monthly),
      license: license || null,
      sigma: Number(sigma.toFixed(3)),
      motivation_style: style,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onDone()
  }

  const wrap = { maxWidth: 360, margin: '60px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const optBtn = { display: 'block', width: '100%', padding: 12, marginBottom: 8, textAlign: 'right', borderRadius: 10, border: '1px solid #ccc', background: '#fafafa', fontSize: 15, cursor: 'pointer' }
  const input = { display: 'block', width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }

  if (isSurvey) {
    return (
      <div style={wrap}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>שאלה {step + 1} מתוך {SURVEY.length}</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{cur.q}</div>
        {cur.opts.map(([label, val], k) => (
          <button key={k} style={optBtn} onClick={() => pick(val)}>{label}</button>
        ))}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>הנתונים הכספיים שלך</div>
      <div style={{ fontSize: 13, color: '#777', marginBottom: 16 }}>כדי לחשב כמה כל יעד באמת דורש ממך</div>
      <input style={input} placeholder="הכנסה חודשית נטו בשקלים" inputMode="numeric" value={income} onChange={e => setIncome(e.target.value)} />
      <input style={input} placeholder="כמה כבר חסכת בשקלים" inputMode="numeric" value={savings} onChange={e => setSavings(e.target.value)} />
      <input style={input} placeholder="כמה תוכל להפריש בחודש בשקלים" inputMode="numeric" value={monthly} onChange={e => setMonthly(e.target.value)} />
      <input style={input} placeholder="רישיון נהיגה, לא חובה" value={license} onChange={e => setLicense(e.target.value)} />
      <button onClick={finish} disabled={saving} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        {saving ? 'שומר' : 'סיום ושמירת פרופיל'}
      </button>
      {err && <p style={{ color: '#c00', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
