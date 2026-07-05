import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signUp({ email, password })
    setMsg(error ? error.message : 'נרשמת. בדוק את המייל לאישור אם נדרש.')
    setLoading(false)
  }

  async function signIn() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error ? error.message : 'התחברת בהצלחה.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <h2>יד ליעד</h2>
      <input
        placeholder="אימייל"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8 }}
      />
      <input
        type="password"
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
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  )
}
