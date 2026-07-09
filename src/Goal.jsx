// src/Goal.jsx
import { useState } from 'react'
import { supabase } from './lib/supabase'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))
const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }

function Line({ label, val, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: strong ? 800 : 400 }}>
      <div>{label}</div>
      <div>{val}</div>
    </div>
  )
}

export function GoalSetup({ v, m, profile, onBack, onDone }) {
  const price = v.market_price ?? 0
  const saved = profile?.current_savings ?? 0
  const target = Math.max(0, price - saved)
  const [monthly, setMonthly] = useState(profile?.monthly_capacity != null ? String(profile.monthly_capacity) : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const mv = Number(monthly)
  const months = mv > 0 ? Math.ceil(target / mv) : null
  let finishTxt = ''
  if (months != null) {
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    finishTxt = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(d)
  }
  const ambitious = profile?.income > 0 && mv > profile.income * 0.5

  async function start() {
    if (!(mv > 0)) { setErr('הזן סכום חודשי חיובי'); return }
    setSaving(true); setErr('')
    const goal = {
      product_id: v.id,
      name: v.name,
      price,
      m_total: m ?? null,
      monthly_saving: mv,
      target,
      months_est: months,
      started_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('profiles').update({ goal }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      setErr(error.message.includes('goal') ? 'נראה שקטע ה SQL עוד לא הורץ בסופבייס' : error.message)
      return
    }
    onDone()
  }

  return (
    <div style={wrap}>
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>התחלת חיסכון ליעד</div>
      <div style={{ color: '#777', marginBottom: 14 }}>{v.name} · שנת {v.year}</div>

      <div style={{ background: '#f6f6f6', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 14 }}>
        <Line label="מחיר הרכב" val={fmt(price) + ' ₪'} />
        <Line label="כבר חסכת" val={fmt(saved) + ' ₪'} />
        <Line label="נשאר לחסוך" val={fmt(target) + ' ₪'} strong />
        {m != null && <Line label="החזקה חודשית אחרי הקנייה, בערך" val={fmt(m) + ' ₪'} />}
      </div>

      <div style={{ fontSize: 13, marginBottom: 6 }}>כמה תפריש בכל חודש?</div>
      <input
        style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }}
        inputMode="numeric" placeholder="סכום בשקלים"
        value={monthly} onChange={e => setMonthly(e.target.value)}
      />
      {months != null && (
        <div style={{ fontSize: 14, marginBottom: 10 }}>
          בקצב הזה תגיע ליעד בעוד כ {months} חודשים, בסביבות {finishTxt}
        </div>
      )}
      {ambitious && (
        <div style={{ fontSize: 12, color: '#b26a00', marginBottom: 10 }}>
          הקצב הזה מעל מחצית מההכנסה שציינת, שאפתני מאוד
        </div>
      )}
      <button onClick={start} disabled={saving}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        {saving ? 'שומר' : 'התחלת החיסכון'}
      </button>
      {err && <p style={{ color: '#c00', marginTop: 10 }}>{err}</p>}
    </div>
  )
}

export function GoalBanner({ profile, onOpenCar, onProfileSaved }) {
  const g = profile?.goal
  if (!g) return null
  const started = g.started_at ? new Date(g.started_at) : new Date()
  const now = new Date()
  const monthsElapsed = Math.max(0, (now.getFullYear() - started.getFullYear()) * 12 + (now.getMonth() - started.getMonth()))
  const left = g.months_est != null ? Math.max(0, g.months_est - monthsElapsed) : null

  const style = profile?.motivation_style
  let flavor = ''
  if (style === 'gamification') flavor = 'אתה בחודש ' + (monthsElapsed + 1) + ' של הרצף. כל חודש מקרב אותך'
  else if (style === 'deadline') flavor = left != null ? 'נשארו כ ' + left + ' חודשים ליעד. הזמן רץ' : ''
  else flavor = 'הוראת קבע של ' + fmt(g.monthly_saving) + ' ₪ בחודש תעשה את העבודה לבד'

  async function cancel() {
    if (!window.confirm('לבטל את היעד הנוכחי?')) return
    const { error } = await supabase.from('profiles').update({ goal: null }).eq('id', profile.id)
    if (!error) await onProfileSaved()
  }

  return (
    <div style={{ border: '1px solid #111', borderRadius: 12, padding: 12, marginBottom: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 2 }}>היעד שלך: {g.name}</div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
        {fmt(g.monthly_saving)} ₪ בחודש{left != null ? ' · עוד כ ' + left + ' חודשים' : ''}
      </div>
      {flavor && <div style={{ fontSize: 12.5, color: '#1565c0', marginBottom: 8 }}>{flavor}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onOpenCar(g.product_id)} style={{ padding: '6px 10px' }}>צפייה ברכב</button>
        <button onClick={cancel} style={{ padding: '6px 10px' }}>ביטול יעד</button>
      </div>
    </div>
  )
}
