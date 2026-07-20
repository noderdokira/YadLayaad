// src/Survey.jsx
// שאלון ההיכרות: אופי חיסכון (מחושב פנימית, לא מוצג) + נתונים כספיים.
// אפשר למלא אותו מחדש מתוך עריכת הפרופיל, ואז הנתונים הקיימים ממולאים מראש.
import { useState } from 'react'
import { supabase } from './lib/supabase'

// הניסוחים נייטרליים מגדרית בכוונה: קודם ניסוח בלי פנייה ממוגדרת בכלל,
// וצורת לך.י רק כשאין ברירה. בכתיב חסר ניקוד מילים כמו לך, שלך, עליך
// קוראות ממילא לשני המגדרים, והבעיה האמיתית היא פעלים בהווה ("אתה מעדיף",
// "בחר"). את רובם אפשר לנסח מחדש בלי מגדר בכלל, וזה גם נראה נקי יותר.
// ערכי הניקוד לא השתנו, ולכן סיגמה של פרופילים קיימים נשארת ברת השוואה.
const SURVEY = [
  { q: 'כשבא לך משהו, מה קורה בדרך כלל?', type: 'sigma',
    opts: [['קונה מיד', 0.0], ['מחכה עם זה כמה ימים', 0.6], ['לרוב החשק עובר מעצמו', 1.0]] },
  // מספרים קונקרטיים, ובסכומים גדולים שמדברים בשפת האפליקציה: חיסכון לרכב.
  // שני כללי כיול. האחד, פער גדול מדי גורם לכולם לחכות והשאלה מפסיקה
  // להבחין בין אנשים: 10,000 מול 20,000 נשמע חד, אבל הכפלה בחצי שנה היא
  // הצעה שאף אחד רציונלי לא מסרב לה. השני, אפקט הגודל מהמחקר על דחיית
  // סיפוקים: אנשים סבלניים יותר ככל שהסכום גדול, ולכן דווקא בסכומים
  // גדולים הפרמיה חייבת להיות צנועה כדי שהבחירה תישאר באמת קשה.
  // 20% על סכום גדול הם בדיוק אזור ההתלבטות.
  { q: 'מציעים לך לבחור. מה עדיף מבחינתך?', type: 'sigma',
    opts: [['10,000 ש"ח עכשיו', 0.0], ['12,000 ש"ח בעוד חצי שנה', 1.0], ['קשה להחליט, תלוי במצב', 0.5]] },
  { q: 'איך הלך בעבר עם חיסכון למשהו גדול?', type: 'sigma',
    opts: [['אף פעם לא הצלחתי', 0.0], ['הצלחתי לפעמים', 0.5], ['תמיד סיימתי מה שהתחלתי', 1.0]] },
  { q: 'לוותר על בילויים ופינוקים כדי להגיע מהר יותר ליעד?', type: 'sigma',
    opts: [['ממש לא', 0.0], ['קצת, זה בסדר', 0.5], ['בלי בעיה', 1.0]] },
  { q: 'עד כמה יש לך מעקב אחרי ההוצאות?', type: 'sigma',
    opts: [['אין בכלל', 0.0], ['בערך, בגדול', 0.5], ['עד השקל', 1.0]] },
  { q: 'החיסכון שלך עד היום היה', type: 'sigma',
    opts: [['לא יציב, תלוי בחודש', 0.2], ['פחות או יותר קבוע', 0.6], ['קבוע כמו שעון', 1.0]] },
  { q: 'מה הכי עוזר לך להתמיד לאורך זמן?', type: 'style',
    opts: [['כשמנחים אותי והרוב מגיע אליי כבר מוכן', 'automation'],
           ['לראות את ההתקדמות שלי, גרפים, הישגים וכדומה', 'gamification'],
           ['הפעלת לחץ בזמן ודדליין למשימות שלי', 'deadline']] },
]

// החזירון הלומד: אותה דמות מ־DepositFx באותם צבעים, בקטן. יושב מתחת
// לתשובות עם מיקרוקופי שמתחלף בין שאלות. עדין, לא מסיח, ונותן תחושה
// שהשאלון באמת בונה משהו.
const PIG_MSGS = ['החזירון לומד עליך...', 'החזירון רושם לעצמו...', 'החזירון בונה לך מסלול...']

function LearningPig({ step }) {
  return (
    <div style={{ marginTop: 26, textAlign: 'center' }} aria-hidden="true">
      <style>{'@keyframes pigFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }'}</style>
      {/* חזירון לומד: משקפיים עגולים, אישונים שמביטים מטה אל ספר פתוח.
          הספר בתוך אותו svg כדי שהריחוף לא ינתק את המבט מהעמוד */}
      <svg width="82" height="90" viewBox="0 0 120 132" style={{ animation: 'pigFloat 2.6s ease-in-out infinite' }}>
        <path d="M 30,28 C 24,16 30,8 40,7 C 45,13 45,22 40,28 Z" fill="#f38fb6" stroke="#46342e" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 90,28 C 96,16 90,8 80,7 C 75,13 75,22 80,28 Z" fill="#f38fb6" stroke="#46342e" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="60" cy="54" rx="42" ry="36" fill="#f9a9c7" stroke="#46342e" strokeWidth="4.5" />
        {/* משקפיים: עדשות, גשר, וזרועות אל שולי הראש */}
        <circle cx="44" cy="45" r="8.5" fill="none" stroke="#46342e" strokeWidth="3" />
        <circle cx="76" cy="45" r="8.5" fill="none" stroke="#46342e" strokeWidth="3" />
        <path d="M 52.5,44 Q 60,40.5 67.5,44" fill="none" stroke="#46342e" strokeWidth="3" strokeLinecap="round" />
        <path d="M 35.5,44 L 24,41" stroke="#46342e" strokeWidth="3" strokeLinecap="round" />
        <path d="M 84.5,44 L 96,41" stroke="#46342e" strokeWidth="3" strokeLinecap="round" />
        {/* אישונים בתחתית העדשות: המבט מופנה מטה, אל הספר */}
        <ellipse cx="44" cy="48.6" rx="2.9" ry="3.4" fill="#46342e" />
        <ellipse cx="76" cy="48.6" rx="2.9" ry="3.4" fill="#46342e" />
        <ellipse cx="60" cy="62" rx="15" ry="10.5" fill="#fbc7db" stroke="#46342e" strokeWidth="4" />
        <ellipse cx="55" cy="62" rx="2" ry="3.4" fill="#46342e" />
        <ellipse cx="65" cy="62" rx="2" ry="3.4" fill="#46342e" />
        <path d="M 52,77 Q 60,81 68,77" fill="none" stroke="#46342e" strokeWidth="3.5" strokeLinecap="round" />
        {/* ספר פתוח מתחת לפנים */}
        <path d="M 24,103 Q 43,95 58,101 L 58,124 Q 43,117 24,125 Z" fill="#fdf3e3" stroke="#46342e" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M 96,103 Q 77,95 62,101 L 62,124 Q 77,117 96,125 Z" fill="#fdf3e3" stroke="#46342e" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M 60,101 L 60,124" stroke="#46342e" strokeWidth="3" />
        {/* שורות טקסט בעמודים */}
        <path d="M 30,107 Q 44,101 54,105" fill="none" stroke="#c9b39a" strokeWidth="2" strokeLinecap="round" />
        <path d="M 30,113 Q 44,107 54,111" fill="none" stroke="#c9b39a" strokeWidth="2" strokeLinecap="round" />
        <path d="M 90,107 Q 76,101 66,105" fill="none" stroke="#c9b39a" strokeWidth="2" strokeLinecap="round" />
        <path d="M 90,113 Q 76,107 66,111" fill="none" stroke="#c9b39a" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
        {PIG_MSGS[step % PIG_MSGS.length]}
      </div>
    </div>
  )
}

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

  function checkInputs() {
    const now = new Date().getFullYear()
    const by = birthYear === '' ? null : Number(birthYear)
    const ly = licenseYear === '' ? null : Number(licenseYear)
    const money = [['הכנסה', income], ['חיסכון', savings], ['הפרשה חודשית', monthly]]
    for (const [label, v] of money) {
      if (v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)) return 'בשדה ' + label + ' יש להזין מספר חיובי'
    }
    if (by != null && (!Number.isInteger(by) || by < 1920 || by > now)) return 'שנת לידה לא סבירה'
    if (ly != null && (!Number.isInteger(ly) || ly < 1935 || ly > now)) return 'שנת רישיון לא סבירה'
    if (by != null && ly != null && ly - by < 16) return 'שנת הרישיון מוקדמת מדי ביחס לשנת הלידה'
    return ''
  }

  async function finish() {
    const problem = checkInputs()
    if (problem) { setErr(problem); return }
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
      <div className="page-wrap page-wrap--narrow" style={{ marginTop: 40 }}>
        {cancelLink}
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          שאלה {step + 1} מתוך {SURVEY.length}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{cur.q}</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          אין תשובה נכונה, זה עוזר להתאים לך מסלול
        </div>
        {cur.opts.map(([label, val], k) => (
          <button key={k} style={optBtn} onClick={() => pick(val)}>{label}</button>
        ))}
        <LearningPig step={step} />
      </div>
    )
  }

  return (
    <div className="page-wrap page-wrap--narrow" style={{ marginTop: 40 }}>
      {cancelLink}
      <div className="page-title" style={{ marginBottom: 4 }}>הנתונים הכספיים שלך</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        כדי לחשב כמה כל יעד באמת דורש ממך, ולהעריך ביטוח שמכוון אליך
      </div>
      <input style={input} placeholder="הכנסה חודשית נטו בשקלים" inputMode="numeric" value={income} onChange={e => setIncome(e.target.value)} />
      <input style={input} placeholder="כמה כבר חסכת בשקלים" inputMode="numeric" value={savings} onChange={e => setSavings(e.target.value)} />
      <input style={input} placeholder="כמה אפשר להפריש בחודש בשקלים" inputMode="numeric" value={monthly} onChange={e => setMonthly(e.target.value)} />
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
