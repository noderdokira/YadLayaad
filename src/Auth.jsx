import { useState } from 'react'
import { supabase } from './lib/supabase'

// כתובת החזרה לקישורי אימייל: עובדת גם בפיתוח וגם ב־GitHub Pages
const redirectTo = () => window.location.origin + import.meta.env.BASE_URL

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true); setMsg('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setMsg(error.message)
    // כשהאימייל כבר רשום, סופבייס מחזיר משתמש בלי זהויות במקום שגיאה
    else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setMsg('האימייל הזה כבר רשום. נסה להתחבר, או לחץ על שכחתי סיסמה.')
    }
    else setMsg('נרשמת! אם נדרש אישור, שלחנו מייל עם קישור.')
    setLoading(false)
  }

  async function signIn() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error ? error.message : 'התחברת בהצלחה.')
    setLoading(false)
  }

  async function forgot() {
    if (!email) { setMsg('הזן אימייל למעלה ואז לחץ שוב על שכחתי סיסמה.'); return }
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })
    setMsg(error ? error.message : 'אם האימייל רשום אצלנו, נשלח אליו עכשיו קישור לאיפוס הסיסמה.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <h2>יד ליעד</h2>
      <input
        placeholder="אימייל"
        type="email"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="סיסמה"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <button onClick={signIn} disabled={loading} style={{ width: '100%', padding: 8, marginBottom: 6 }}>
        התחברות
      </button>
      <button onClick={signUp} disabled={loading} style={{ width: '100%', padding: 8 }}>
        הרשמה
      </button>
      <button
        onClick={forgot}
        disabled={loading}
        style={{ width: '100%', padding: 6, marginTop: 10, border: 'none', background: 'none', color: 'var(--color-info)', fontSize: 13, cursor: 'pointer' }}
      >
        שכחתי סיסמה
      </button>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
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
    if (error) { setMsg(error.message); return }
    onDone()
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', direction: 'rtl', padding: 16 }}>
      <h2>סיסמה חדשה</h2>
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
  )
}
