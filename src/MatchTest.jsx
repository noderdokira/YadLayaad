// src/MatchTest.jsx
// מבחן התאמה אישית, לרכב ולאופנוע. אותו מסך, שני סטים של שאלות ושני
// מודלי ניקוד: rankCars ו־rankMotos. ההעדפות נשמרות בפרופיל בעמודה
// נפרדת לכל סוג (car_prefs, moto_prefs), כי אלה שאלונים שונים באמת:
// לאופנוע שואלים דרגת רישיון, קטנוע או הילוכים, אופי נסיעה וניסיון.
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { rankCars, rankMotos } from './lib/matchModel'
import { normalizeCars } from './lib/priceBook'
import { normalizeMotos } from './lib/motoBook'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

const CAR_QUESTIONS = [
  { key: 'budgetMax', q: 'כמה בערך להשקיע בקניית הרכב?', custom: 'או סכום מדויק בשקלים',
    opts: [['עד 90 אלף', 90000], ['עד 150 אלף', 150000], ['עד 250 אלף', 250000], ['עד 400 אלף', 400000]] },
  { key: 'minYear', q: 'משנת ייצור מסוימת ומעלה?', custom: 'או שנה מדויקת, למשל 2021',
    opts: [['לא משנה לי', 0], ['משנת 2020 ומעלה', 2020], ['משנת 2023 ומעלה', 2023], ['רק 2025 ומעלה', 2025]] },
  { key: 'mCeiling', q: 'איזו עלות חודשית נוחה לך?',
    opts: [['עד 1,500 בחודש', 1500], ['עד 2,500 בחודש', 2500], ['עד 3,500 בחודש', 3500], ['בלי הגבלה', 0]] },
  { key: 'kmMonthly', q: 'כמה נסיעה בחודש בערך?',
    opts: [['מעט, עד 500 קמ', 500], ['בינוני, בערך 1,000 קמ', 1000], ['הרבה, 1,500 קמ ומעלה', 1600]] },
  { key: 'newness', q: 'חדש או משומש?',
    opts: [['רק חדש', 'new'], ['עדיף חדש, אבל יש גמישות', 'prefer_new'], ['משומש זה מצוין', 'used_ok']] },
  { key: 'priority', q: 'מה חשוב לך יותר?',
    opts: [['מחיר קנייה נמוך', 'price'], ['עלות חודשית נמוכה', 'monthly'], ['איזון בין השניים', 'balanced']] },
  { key: 'horizonMonths', q: 'מתי הרכב כבר אמור להיות שלך?',
    opts: [['תוך שנה', 12], ['תוך שנתיים', 24], ['שלוש שנים ומעלה', 40]] },
]

// שאלון האופנועים שונה במהות: דרגת רישיון היא מסנן קשיח, קטנוע מול
// הילוכים ואופי הנסיעה מזינים את רכיב ההתאמה, וניסיון הרכיבה מוריד
// דגמים חזקים מדי לרוכב חדש. הסכומים מכוילים לעולם הדו גלגלי.
const MOTO_QUESTIONS = [
  { key: 'budgetMax', q: 'כמה בערך להשקיע בקנייה?', custom: 'או סכום מדויק בשקלים',
    opts: [['עד 15 אלף', 15000], ['עד 30 אלף', 30000], ['עד 50 אלף', 50000], ['עד 90 אלף', 90000]] },
  // הבחירה כאן מסננת לדרגה הזו בלבד: מי שבחר A1 לא יקבל קטנועי A2 זולים
  { key: 'license', q: 'לאיזו דרגת רישיון לחפש?',
    opts: [['A2 · עד 125 סמ"ק', 'A2'], ['A1 · עד 35 קילוואט', 'A1'], ['A · ללא הגבלה', 'A'], ['עוד אין רישיון, להציג הכל', 'any']] },
  // גם הנפח מסנן קשיח, מאותה סיבה כמו הדרגה: זו כוונת קנייה
  { key: 'ccRange', q: 'איזה נפח מנוע?',
    opts: [['עד 125 סמ"ק', [0, 125]], ['126 עד 350', [126, 350]], ['351 עד 600', [351, 600]], ['מעל 600', [601, 9999]], ['לא משנה לי', 0]] },
  { key: 'style', q: 'קטנוע או הילוכים?',
    opts: [['קטנוע אוטומטי', 'scooter'], ['אופנוע הילוכים', 'geared'], ['לא משנה לי', 'any']] },
  { key: 'usage', q: 'איפה בעיקר הנסיעות?',
    opts: [['בעיר', 'urban'], ['בין עירוני', 'road'], ['גם וגם', 'mixed']] },
  { key: 'exp', q: 'כמה ניסיון רכיבה יש לך?',
    opts: [['אין עדיין, זה הראשון', 'none'], ['עד שנתיים', 'some'], ['יותר משנתיים', 'lots']] },
  // ABS מובטח מעל 125 סמ"ק בתקנה האירופית. בקרת אחיזה מסומנת בספר רק
  // ממפרט יבואן מאומת, ולכן דגם בלי סימון מקבל הסתייגות ולא פסילה
  { key: 'tech', q: 'כמה חשובה בטיחות אלקטרונית?',
    opts: [['ABS זה מספיק', 'abs'], ['רוצה גם בקרת אחיזה', 'tc'], ['לא קריטי לי', 'any']] },
  // מחירי שנתונים קודמים בקטלוג הם שווי מוערך, שרלוונטי רק לקניית יד שנייה
  { key: 'newness', q: 'חדש מהיבואן או יד שנייה?',
    opts: [['רק חדש מהיבואן', 'new'], ['גם יד שנייה, להציג הכל', 'used_ok']] },
  { key: 'mCeiling', q: 'איזו עלות חודשית נוחה לך?',
    opts: [['עד 400 בחודש', 400], ['עד 700 בחודש', 700], ['עד 1,100 בחודש', 1100], ['בלי הגבלה', 0]] },
  { key: 'horizonMonths', q: 'מתי הוא כבר אמור להיות שלך?',
    opts: [['תוך חצי שנה', 6], ['תוך שנה', 12], ['שנתיים ומעלה', 24]] },
]

export default function MatchTest({ profile, onPick, onBack, demo = false, kind = 'car' }) {
  const isMoto = kind === 'moto'
  const QUESTIONS = isMoto ? MOTO_QUESTIONS : CAR_QUESTIONS
  const prefsCol = isMoto ? 'moto_prefs' : 'car_prefs'
  const savedPrefs = isMoto ? profile?.moto_prefs : profile?.car_prefs

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
      const { error } = await supabase.from('profiles').update({ [prefsCol]: prefs }).eq('id', profile.id)
      if (error) {
        setBusy(false)
        setErr(error.message.includes(prefsCol) ? 'נראה שקטע ה SQL של ' + prefsCol + ' עוד לא הורץ בסופבייס' : error.message)
        return
      }
    }
    const budget = prefs.budgetMax || (isMoto ? 45000 : 200000)
    // מרחיבים את הרשת: המחיר בבסיס הנתונים הוא מחירון מקורי,
    // והמחיר המוצג אחרי נרמול יכול להיות נמוך ממנו. הסינון הסופי נעשה בציון.
    let req = supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('kind', kind)
      .lte('market_price', Math.round(budget * 1.6))
      .order('market_price', { ascending: true })
      .limit(600)
    if (prefs.minYear > 0) req = req.gte('year', prefs.minYear)
    const { data, error: qErr } = await req
    setBusy(false)
    if (qErr) { setErr(qErr.message); return }
    setResults(isMoto
      ? rankMotos(normalizeMotos(data || []), prefs, userCtx)
      : rankCars(normalizeCars(data || []), prefs, userCtx))
  }

  useEffect(() => {
    if (savedPrefs) runMatch(savedPrefs, false)
  }, [])

  function advance(key, val) {
    const a = { ...answers, [key]: val }
    setAnswers(a)
    setCustomVal(''); setErr('')
    if (step + 1 < QUESTIONS.length) setTimeout(() => setStep(s => s + 1), 120)
    else runMatch(a, !demo && !!profile)
  }

  function pickCustom() {
    const cur = QUESTIONS[step]
    const n = Number(customVal)
    if (!(n > 0)) { setErr('צריך מספר חיובי'); return }
    if (cur.key === 'minYear' && (n < 1990 || n > new Date().getFullYear() + 1)) { setErr('שנה לא סבירה'); return }
    advance(cur.key, n)
  }

  function redo() { setResults(null); setAnswers({}); setStep(0); setErr(''); setCustomVal('') }

  const optBtn = {
    display: 'block', width: '100%', padding: 12, marginBottom: 8, textAlign: 'right',
    borderRadius: 10, border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer',
  }

  if (busy) return <div className="page-wrap">מחשב התאמות</div>

  if (results) {
    return (
      <div className="page-wrap">
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={onBack} style={{ padding: '6px 10px' }}>חזרה לקטלוג</button>
          <button onClick={redo} style={{ padding: '6px 10px' }}>מילוי מחדש</button>
        </div>
        <div className="page-title" style={{ marginBottom: 10 }}>
          {isMoto ? 'האופנועים שהכי מתאימים לך' : 'הרכבים שהכי מתאימים לך'}
        </div>
        {results.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)' }}>
            {isMoto ? 'לא נמצאו דגמים מתאימים לתנאים האלה. שווה להרחיב את התקציב או הדרגה' : 'לא נמצאו רכבים מתאימים לתנאים האלה'}
          </div>
        )}
        {results.map(r => (
          <div key={r.v.id} onClick={() => onPick(r.v)}
            style={{ padding: 12, borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>
                {r.v.name}
                {isMoto && r.v.license && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-info)', border: '1px solid var(--color-info)', borderRadius: 8, padding: '1px 6px', marginInlineStart: 8 }}>
                    {r.v.license}
                  </span>
                )}
              </div>
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
    <div className="page-wrap">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: '6px 10px' }}>חזרה לקטלוג</button>
        {step > 0 && (
          <button onClick={() => { setStep(s => s - 1); setErr(''); setCustomVal('') }} style={{ padding: '6px 10px' }}>
            → אחורה
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>שאלה {step + 1} מתוך {QUESTIONS.length}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{cur.q}</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        אין תשובה נכונה, זה עוזר להתאים לך {isMoto ? 'אופנוע' : 'רכב'}
      </div>
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
