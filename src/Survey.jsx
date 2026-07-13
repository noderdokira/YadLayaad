// src/Survey.jsx
// שאלון ההיכרות: אופי חיסכון (מחושב פנימית, לא מוצג) + נתונים כספיים.
// אפשר למלא אותו מחדש מתוך עריכת הפרופיל, ואז הנתונים הקיימים ממולאים מראש.
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

export default function Survey({ userId, profile = null, onDone, onCancel }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [income, setIncome] = useState(profile?.income != null ? String(profile.income) : '')
  const [savings, setSavings] = useState(profile?.current_savings != null ? String(profile.current_savings) : '')
  const [monthly, setMonthly] = useState(profile?.monthly_capacity != null ? String(profile.monthly_capacity) : '')
  const [license, setLicense] = useState(profile?.license ?? '')
  const [birthYear, setBirthYear] = useState(profile?.birth_year != null ? String(profile.birth_year) : '')
  const [licenseYear, setLicenseYear] = useState(profile?.license_year != null ? String(profile.license_year) : '')
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
    let style = profile?.motivation_style || 'automation'
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
      birth_year: birthYear === '' ? null : Number(birthYear),
      license_year: licenseYear === '' ? null : Number(licenseYear),
      sigma: Number(sigma.toFixed(3)),
      motivation_style: style,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onDone()
  }

  const wrap = { maxWidth: 360, margin: '60px auto', direction: 'rtl', padding: 16 }
  const optBtn = {
    display: 'block', width: '100%', padding: 12, marginBottom: 8, textAlign: 'right',
    borderRadius: 10, border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer',
  }
  const input = { display: 'block', width: '100%', padding: 10, marginBottom: 10 }

  const cancelLink = onCancel && (
    <button onClick={onCancel} style={{ marginBottom: 14, padding: '6px 10px' }}>
      ביטול וחזרה
    </button>
  )

  if (isSurvey) {
    return (
      <div style={wrap}>
        {cancelLink}
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          שאלה {step + 1} מתוך {SURVEY.length}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{cur.q}</div>
        {cur.opts.map(([label, val], k) => (
          <button key={k} style={optBtn} onClick={() => pick(val)}>{label}</button>
        ))}
      </div>
    )
  }

  return (
    <div style={wrap}>
      {cancelLink}
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>הנתונים הכספיים שלך</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        כדי לחשב כמה כל יעד באמת דורש ממך, ולהעריך ביטוח שמכוון אליך
      </div>
      <input style={input} placeholder="הכנסה חודשית נטו בשקלים" inputMode="numeric" value={income} onChange={e => setIncome(e.target.value)} />
      <input style={input} placeholder="כמה כבר חסכת בשקלים" inputMode="numeric" value={savings} onChange={e => setSavings(e.target.value)} />
      <input style={input} placeholder="כמה תוכל להפריש בחודש בשקלים" inputMode="numeric" value={monthly} onChange={e => setMonthly(e.target.value)} />
      <input style={input} placeholder="סוג רישיון נהיגה, לא חובה" value={license} onChange={e => setLicense(e.target.value)} />
      <input style={input} placeholder="שנת לידה, למשל 2004" inputMode="numeric" value={birthYear} onChange={e => setBirthYear(e.target.value)} />
      <input style={input} placeholder="שנת הוצאת רישיון, למשל 2022" inputMode="numeric" value={licenseYear} onChange={e => setLicenseYear(e.target.value)} />
      <button onClick={finish} disabled={saving} className="btn-primary" style={{ width: '100%', padding: 12, borderRadius: 10, fontSize: 15 }}>
        {saving ? 'שומר' : 'סיום ושמירת פרופיל'}
      </button>
      {err && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
