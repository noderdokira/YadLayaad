import { useRef, useState } from 'react'
import { supabase } from './lib/supabase'

// כתובת החזרה לקישורי אימייל: עובדת גם בפיתוח וגם ב־GitHub Pages
const redirectTo = () => window.location.origin + import.meta.env.BASE_URL

// תרגום השגיאות הנפוצות של סופבייס לעברית ברורה
function heErr(message) {
  const m = String(message || '')
  if (m.includes('Invalid login credentials')) return 'האימייל או הסיסמה שגויים. אם שכחת סיסמה, לחץ למטה על "שכחתי סיסמה"'
  if (m.includes('Anonymous sign-ins')) return 'קודם מלא אימייל וסיסמה בשדות למעלה, ואז לחץ הרשמה'
  if (m.includes('at least 6') || m.includes('Password should')) return 'הסיסמה צריכה להיות באורך 6 תווים לפחות'
  if (m.includes('valid email') || m.includes('invalid format') || m.includes('Unable to validate email')) return 'כתובת האימייל לא תקינה, בדוק אותה שוב'
  if (m.includes('rate limit') || m.includes('Too many')) return 'יותר מדי ניסיונות ברצף. חכה כמה דקות ונסה שוב'
  if (m.includes('already registered')) return 'האימייל הזה כבר רשום. נסה להתחבר, או לחץ על שכחתי סיסמה'
  return m
}

export default function Auth({ onDemo }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const emailRef = useRef(null)
  const passRef = useRef(null)

  // קריאה ישירה מהשדות: עמיד גם למילוי אוטומטי שלא מעדכן את ה־state
  function readFields() {
    const em = (emailRef.current?.value ?? email ?? '').trim()
    const pw = passRef.current?.value ?? password ?? ''
    return { em, pw }
  }

  function validate(em, pw) {
    if (!em && !pw) return 'מלא אימייל וסיסמה בשדות למעלה, ואז לחץ שוב'
    if (!em) return 'חסר אימייל. כתוב אותו בשדה העליון'
    if (!em.includes('@') || !em.includes('.')) return 'כתובת האימייל לא נראית תקינה'
    if (!pw) return 'חסרה סיסמה. בחר סיסמה באורך 6 תווים לפחות'
    if (pw.length < 6) return 'הסיסמה צריכה להיות באורך 6 תווים לפחות'
    return ''
  }

  async function signUp() {
    const { em, pw } = readFields()
    const problem = validate(em, pw)
    if (problem) { setMsg(problem); return }
    setLoading(true); setMsg('')
    const { data, error } = await supabase.auth.signUp({ email: em, password: pw })
    if (error) setMsg(heErr(error.message))
    // כשהאימייל כבר רשום, סופבייס מחזיר משתמש בלי זהויות במקום שגיאה
    else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setMsg('האימייל הזה כבר רשום. נסה להתחבר, או לחץ על שכחתי סיסמה.')
    }
    else setMsg('נרשמת! עוד רגע נכנסים...')
    setLoading(false)
  }

  async function signIn() {
    const { em, pw } = readFields()
    const problem = validate(em, pw)
    if (problem) { setMsg(problem); return }
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw })
    setMsg(error ? heErr(error.message) : 'התחברת בהצלחה!')
    setLoading(false)
  }

  async function forgot() {
    const { em } = readFields()
    if (!em) { setMsg('כתוב את האימייל שלך בשדה העליון, ואז לחץ שוב על שכחתי סיסמה.'); return }
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: redirectTo() })
    setMsg(error ? heErr(error.message) : 'אם האימייל רשום אצלנו, נשלח אליו עכשיו קישור לאיפוס הסיסמה.')
    setLoading(false)
  }

  return (
    <div className="page-wrap page-wrap--narrow" style={{ marginTop: 64, maxWidth: 340 }}>
      <h2 className="wordmark" style={{ fontSize: 30, marginTop: 0, marginBottom: 14 }}>יד ליעד 🚗</h2>
      <input
        ref={emailRef}
        placeholder="אימייל"
        type="email"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <input
        ref={passRef}
        type="password"
        autoComplete="current-password"
        placeholder="סיסמה (6 תווים לפחות)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') signIn() }}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <button onClick={signIn} disabled={loading} className="btn-primary" style={{ width: '100%', padding: 9, marginBottom: 6, borderRadius: 8 }}>
        התחברות
      </button>
      <button onClick={signUp} disabled={loading} style={{ width: '100%', padding: 8 }}>
        משתמש חדש? הרשמה
      </button>
      {onDemo && (
        <button onClick={onDemo} disabled={loading} style={{ width: '100%', padding: 8, marginTop: 6 }}>
          👀 להציץ בקטלוג בלי חשבון
        </button>
      )}
      <button
        onClick={forgot}
        disabled={loading}
        style={{ width: '100%', padding: 6, marginTop: 10, border: 'none', background: 'none', color: 'var(--color-info)', fontSize: 13, cursor: 'pointer' }}
      >
        שכחתי סיסמה
      </button>
      {msg && <p style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.5 }}>{msg}</p>}
    </div>
  )
}

// מסך קביעת סיסמה חדשה: מוצג אחרי כניסה דרך קישור האיפוס מהמייל
export function UpdatePassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (pw.length < 6) { setMsg('הסיסמה צריכה להיות באורך 6 תווים לפחות'); return }
    if (pw !== pw2) { setMsg('הסיסמאות לא תואמות'); return }
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setMsg(heErr(error.message)); return }
    onDone()
  }

  return (
    <div className="page-wrap page-wrap--narrow" style={{ marginTop: 64, maxWidth: 340 }}>
      <h2 className="page-title" style={{ marginTop: 0 }}>סיסמה חדשה</h2>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        נכנסת דרך קישור האיפוס. בחר סיסמה חדשה לחשבון.
      </div>
      <input
        type="password"
        autoComplete="new-password"
        placeholder="סיסמה חדשה"
        value={pw}
        onChange={e => setPw(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="שוב, לאימות"
        value={pw2}
        onChange={e => setPw2(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <button onClick={save} disabled={busy} className="btn-primary" style={{ width: '100%', padding: 10, borderRadius: 8 }}>
        {busy ? 'שומר' : 'שמירת הסיסמה'}
      </button>
      {msg && <p style={{ marginTop: 12, color: 'var(--color-danger)' }}>{msg}</p>}
    </div>
  )}
