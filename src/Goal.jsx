// src/Goal.jsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { cleanName } from './lib/priceBook'
import { PiggyBank, flyCoin } from './DepositFx'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

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
    <div className="page-wrap">
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
      <div className="page-title" style={{ marginBottom: 4 }}>התחלת חיסכון ליעד</div>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>{v.name} · שנת {v.year}</div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 14 }}>
        <Line label="מחיר הרכב" val={fmt(price) + ' ₪'} />
        <Line label="כבר חסכת" val={fmt(saved) + ' ₪'} />
        <Line label="נשאר לחסוך" val={fmt(target) + ' ₪'} strong />
        {m != null && <Line label="החזקה חודשית אחרי הקנייה, בערך" val={fmt(m) + ' ₪'} />}
      </div>

      <div style={{ fontSize: 13, marginBottom: 6 }}>כמה תפריש בכל חודש?</div>
      <input
        style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10 }}
        inputMode="numeric" placeholder="סכום בשקלים"
        value={monthly} onChange={e => setMonthly(e.target.value)}
      />
      {months != null && (
        <div style={{ fontSize: 14, marginBottom: 10 }}>
          בקצב הזה תגיע ליעד בעוד כ {months} חודשים, בסביבות {finishTxt}
        </div>
      )}
      {ambitious && (
        <div style={{ fontSize: 12, color: 'var(--color-warn)', marginBottom: 10 }}>
          הקצב הזה מעל מחצית מההכנסה שציינת, שאפתני מאוד
        </div>
      )}
      <button onClick={start} disabled={saving} className="btn-primary"
        style={{ width: '100%', padding: 12, borderRadius: 10, fontSize: 15 }}>
        {saving ? 'שומר' : 'התחלת החיסכון'}
      </button>
      {err && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
    </div>
  )
}

export function GoalBanner({ profile, onOpenCar, onOpenProgress, onProfileSaved }) {
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
    <div style={{ border: '1px solid var(--color-primary)', background: 'var(--color-surface)', borderRadius: 12, padding: 12, marginBottom: 14, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 800, marginBottom: 2 }}>היעד שלך: {cleanName(g.name)}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {fmt(g.monthly_saving)} ₪ בחודש{left != null ? ' · עוד כ ' + left + ' חודשים' : ''}
      </div>
      {flavor && <div style={{ fontSize: 12.5, color: 'var(--color-info)', marginBottom: 8 }}>{flavor}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onOpenProgress} className="btn-primary" style={{ padding: '6px 10px' }}>מעקב והפקדות</button>
        <button onClick={() => onOpenCar(g.product_id)} style={{ padding: '6px 10px' }}>צפייה ברכב</button>
        <button onClick={cancel} style={{ padding: '6px 10px' }}>ביטול יעד</button>
      </div>
    </div>
  )
}

export function GoalProgress({ profile, onBack, asTab = false }) {
  const g = profile?.goal
  const pigRef = useRef(null)
  const amountRef = useRef(null)
  const [deposits, setDeposits] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [extra, setExtra] = useState(0)

  async function load() {
    let req = supabase.from('goal_deposits').select('id, amount, note, created_at').order('created_at', { ascending: false })
    if (g?.started_at) req = req.gte('created_at', g.started_at)
    const { data, error } = await req
    if (error) {
      setErr(error.message.includes('goal_deposits') ? 'נראה שקטע ה SQL של ההפקדות עוד לא הורץ בסופבייס' : error.message)
      setLoaded(true)
      return
    }
    setDeposits(data || [])
    setLoaded(true)
  }

  useEffect(() => { load() }, [])

  if (!g) {
    return (
      <div className="page-wrap">
        {!asTab && <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>}
        <div className="page-title" style={{ marginBottom: 6 }}>עוד אין יעד 🐷</div>
        <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
          בוחרים רכב בקטלוג, קובעים כמה מפרישים בחודש, והחזירון מתחיל לעבוד בשבילך.
        </div>
        <button onClick={onBack} className="btn-primary" style={{ padding: '10px 18px', borderRadius: 10 }}>
          לקטלוג הרכבים 🚗
        </button>
      </div>
    )
  }

  const sum = deposits.reduce((s, d) => s + Number(d.amount), 0)
  const target = g.target ?? 0
  const remaining = Math.max(0, target - sum)
  const done = target > 0 && remaining === 0
  // עד שהיעד באמת הושלם לא מציגים 100%, כדי שהחגיגה לא תוקדם בגלל עיגול
  const pct = done || target <= 0 ? 100 : Math.min(99, Math.floor((100 * sum) / target))
  const monthsLeft = g.monthly_saving > 0 ? Math.ceil(remaining / g.monthly_saving) : null

  // התקדמות מוענקת: מה שכבר היה לך בהתחלה נספר כחלק מהדרך אל מחיר הרכב המלא.
  // מחקר Nunes & Dreze 2006: התחלה עם התקדמות קיימת מגבירה התמדה משמעותית.
  const price = g.price ?? 0
  const saved0 = Math.max(0, price - target)
  const journeyExact = price > 0 ? (100 * (saved0 + sum)) / price : (done ? 100 : 0)
  const journeyPct = done ? 100 : Math.min(99, Math.floor(journeyExact))

  // רצף הפקדות: חודשים עוקבים עם לפחות הפקדה אחת.
  // החודש הנוכחי לא שובר את הרצף אם עוד לא הפקדת בו.
  const mKey = d => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth() }
  const monthsWithDeposit = new Set(deposits.map(d => mKey(d.created_at)))
  const nowKey = mKey(new Date())
  let streak = 0
  for (let k = monthsWithDeposit.has(nowKey) ? nowKey : nowKey - 1; monthsWithDeposit.has(k); k--) streak++

  let etaTxt = ''
  if (!done && monthsLeft != null) {
    const d = new Date()
    d.setMonth(d.getMonth() + monthsLeft)
    etaTxt = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(d)
  }

  const style = profile?.motivation_style
  let flavor = ''
  if (done) flavor = ''
  else if (style === 'gamification') flavor = 'כבר ' + deposits.length + ' הפקדות. עוד ' + fmt(remaining) + ' ₪ לניצחון'
  else if (style === 'deadline') flavor = monthsLeft != null ? 'בקצב שהגדרת נשארו כ ' + monthsLeft + ' חודשים' : ''
  else flavor = 'הפקדה קבועה של ' + fmt(g.monthly_saving) + ' ₪ בחודש תסגור את זה לבד'

  async function add() {
    const a = Number(amount)
    if (!(a > 0)) { setErr('הזן סכום חיובי'); return }
    setBusy(true); setErr('')
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('goal_deposits').insert({ user_id: u?.user?.id, amount: a, note: note || null })
    setBusy(false)
    if (error) {
      setErr(error.message.includes('goal_deposits') ? 'נראה שקטע ה SQL של ההפקדות עוד לא הורץ בסופבייס' : error.message)
      return
    }
    setAmount(''); setNote('')
    flyCoin({ fromEl: amountRef.current, pigEl: pigRef.current, amount: a })
    load()
  }

  async function remove(id) {
    if (!window.confirm('למחוק את ההפקדה?')) return
    const { error } = await supabase.from('goal_deposits').delete().eq('id', id)
    if (!error) load()
  }

  return (
    <div className="page-wrap">
      {!asTab && <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>}
      <div className="page-title" style={{ marginBottom: 2 }}>מעקב חיסכון</div>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>{cleanName(g.name)}</div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, minHeight: 120 }}>
        {loaded && <PiggyBank ref={pigRef} width={132} pct={journeyPct} />}
      </div>

      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 999, height: 16, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', minWidth: pct > 0 ? 8 : 0, height: '100%', background: done ? 'var(--color-primary-dark)' : 'var(--color-primary)', transition: 'width 0.6s ease' }} />
        </div>
        {[25, 50, 75].map(m => (
          <div key={m} style={{ position: 'absolute', left: `${m}%`, top: 0, width: 2, height: 16, background: 'var(--color-bg)', opacity: 0.8, transform: 'translateX(-1px)', pointerEvents: 'none' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: saved0 > 0 ? 2 : 12 }}>
        <div>{fmt(sum)} ₪ מתוך {fmt(target)} ₪</div>
        <div style={{ fontWeight: 800 }}>{pct}%</div>
      </div>
      {saved0 > 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          יחד עם {fmt(saved0)} ₪ שכבר היו לך בהתחלה, עברת {journeyPct}% מהדרך למחיר הרכב המלא 🚗
        </div>
      )}

      {done ? (
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)', animation: 'goalPop 0.5s ease', marginBottom: 14 }}>
          הגעת ליעד! הסכום שהגדרת ביד. שלב הקנייה לפניך
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
          נשארו {fmt(remaining)} ₪{monthsLeft != null ? ', בקצב שלך עוד כ ' + monthsLeft + ' חודשים, בסביבות ' + etaTxt : ''}
        </div>
      )}
      {streak >= 2 && !done && (
        <div style={{ fontSize: 12.5, color: 'var(--color-warn)', fontWeight: 700, marginBottom: 8 }}>
          🔥 {streak} חודשים של הפקדות ברצף{style === 'gamification' ? '. אל תשבור אותו!' : ''}
        </div>
      )}
      {flavor && <div style={{ fontSize: 12.5, color: 'var(--color-info)', marginBottom: 14 }}>{flavor}</div>}

      {!done && g.monthly_saving > 0 && remaining > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>מה אם תגדיל את הקצב?</div>
          <input
            type="range" min="0" max="1000" step="50" value={extra}
            onChange={e => setExtra(Number(e.target.value))}
            style={{ width: '100%', direction: 'ltr', accentColor: 'var(--color-primary)' }}
            aria-label="תוספת חודשית להפקדה"
          />
          {extra > 0 ? (
            <div style={{ fontSize: 12.5, marginTop: 6 }}>
              עוד <b>{fmt(extra)} ₪</b> בחודש: מגיעים ליעד בעוד כ {Math.ceil(remaining / (g.monthly_saving + extra))} חודשים
              {monthsLeft != null && Math.ceil(remaining / (g.monthly_saving + extra)) < monthsLeft && (
                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                  {' '}— {monthsLeft - Math.ceil(remaining / (g.monthly_saving + extra))} חודשים מוקדם יותר
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
              גרור את הסליידר כדי לראות כמה מוקדם תוכל להגיע ליעד
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>הפקדה חדשה</div>
        <input
          ref={amountRef}
          style={{ width: '48%', padding: 8, marginInlineEnd: '4%' }}
          inputMode="numeric" placeholder="סכום בשקלים"
          value={amount} onChange={e => setAmount(e.target.value)}
        />
        <input
          style={{ width: '48%', padding: 8 }}
          placeholder="הערה, לא חובה"
          value={note} onChange={e => setNote(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {[100, 500, 1000, 5000].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              className={amount === String(v) ? 'btn-primary' : ''}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
              +{v.toLocaleString()} ₪
            </button>
          ))}
        </div>
        <button onClick={add} disabled={busy} className="btn-primary" style={{ display: 'block', marginTop: 8, padding: '7px 12px' }}>
          {busy ? 'שומר' : 'הוספת הפקדה'}
        </button>
      </div>

      {deposits.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>עוד אין הפקדות. ההפקדה הראשונה היא הכי חשובה</div>}
      {deposits.map(d => (
        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(d.amount)} ₪</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
              {new Date(d.created_at).toLocaleDateString('he-IL')}{d.note ? ' · ' + d.note : ''}
            </div>
          </div>
          <button onClick={() => remove(d.id)} style={{ padding: '4px 8px', fontSize: 12 }}>מחיקה</button>
        </div>
      ))}
      {err && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
