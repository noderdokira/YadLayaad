// src/League.jsx
// ליגת חברים: תחרות ידידותית לפי אחוז התקדמות בלבד.
// פרטיות קודמת לכל: אף סכום לא נחשף, רק אחוז מהיעד האישי של כל אחד.
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const genCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

// האחוז שלי מהדרך למחיר הרכב, כולל החיסכון ההתחלתי
async function myJourneyPct(profile) {
  const g = profile?.goal
  if (!g || !(g.price > 0)) return null
  let req = supabase.from('goal_deposits').select('amount, created_at')
  if (g.started_at) req = req.gte('created_at', g.started_at)
  const { data } = await req
  const sum = (data || []).reduce((s, d) => s + Number(d.amount), 0)
  const saved0 = Math.max(0, (g.price ?? 0) - (g.target ?? 0))
  return Math.min(100, Math.round((100 * (saved0 + sum)) / g.price))
}

function leagueErr(e) {
  return e.message.includes('relation') || e.message.includes('does not exist') || e.message.includes('schema cache')
    ? 'נראה שקטע ה־SQL של הליגות עוד לא הורץ בסופבייס'
    : e.message
}

export default function League({ profile, onBack }) {
  const [uid, setUid] = useState(null)
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState({})
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [disp, setDisp] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    setErr('')
    const { data: u } = await supabase.auth.getUser()
    const id = u?.user?.id
    if (!id) { setLoading(false); return }
    setUid(id)
    setDisp(d => d || (u.user.email || '').split('@')[0])
    const { data: mine, error } = await supabase
      .from('league_members')
      .select('league_id, display_name, leagues(name, code)')
      .eq('user_id', id)
    if (error) { setErr(leagueErr(error)); setLoading(false); return }
    setRows(mine || [])
    const pct = await myJourneyPct(profile)
    for (const row of mine || []) {
      if (pct != null) {
        await supabase.from('league_members')
          .update({ pct, updated_at: new Date().toISOString() })
          .eq('league_id', row.league_id).eq('user_id', id)
      }
      const { data: mem } = await supabase
        .from('league_members')
        .select('user_id, display_name, pct, updated_at')
        .eq('league_id', row.league_id)
        .order('pct', { ascending: false })
      setMembers(m => ({ ...m, [row.league_id]: mem || [] }))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createLeague() {
    if (!name.trim()) { setErr('תן שם לליגה'); return }
    if (!disp.trim()) { setErr('בחר כינוי שיוצג לחברים'); return }
    setBusy(true); setErr(''); setMsg('')
    const { data: lg, error } = await supabase
      .from('leagues')
      .insert({ name: name.trim(), code: genCode(), created_by: uid })
      .select('id, code')
      .single()
    if (error) { setErr(leagueErr(error)); setBusy(false); return }
    const { error: e2 } = await supabase
      .from('league_members')
      .insert({ league_id: lg.id, user_id: uid, display_name: disp.trim() })
    if (e2) { setErr(leagueErr(e2)); setBusy(false); return }
    setName('')
    setMsg('הליגה נוצרה! שתף עם החברים את הקוד: ' + lg.code)
    await load()
    setBusy(false)
  }

  async function joinLeague() {
    if (!code.trim()) { setErr('הזן קוד ליגה'); return }
    if (!disp.trim()) { setErr('בחר כינוי'); return }
    setBusy(true); setErr(''); setMsg('')
    const { error } = await supabase.rpc('join_league', { join_code: code.trim().toUpperCase(), disp: disp.trim() })
    if (error) {
      setErr(error.message.includes('league not found') ? 'לא נמצאה ליגה עם הקוד הזה' : leagueErr(error))
      setBusy(false)
      return
    }
    setCode(''); setMsg('הצטרפת לליגה! 🎉')
    await load()
    setBusy(false)
  }

  async function leave(lid) {
    setBusy(true)
    await supabase.from('league_members').delete().eq('league_id', lid).eq('user_id', uid)
    await load()
    setBusy(false)
  }

  function copyCode(c) {
    try { navigator.clipboard.writeText(c); setMsg('הקוד ' + c + ' הועתק, שלח לחברים') } catch { /* לא קריטי */ }
  }

  const medal = i => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.')
  const input = { display: 'block', width: '100%', padding: 10, marginBottom: 8 }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 12 }

  return (
    <div className="page-wrap">
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
      <div className="page-title" style={{ marginBottom: 4 }}>🏆 ליגת חברים</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.55 }}>
        תחרות ידידותית על ההתקדמות בלבד. אף אחד לא רואה סכומים של אף אחד, רק אחוזים מהיעד האישי של כל אחד.
      </div>

      {loading && <div style={{ color: 'var(--color-text-muted)' }}>טוען</div>}

      {!loading && rows.map(row => (
        <div key={row.league_id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{row.leagues?.name}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => copyCode(row.leagues?.code)} style={{ padding: '3px 9px', fontSize: 12, letterSpacing: 1 }}>
                {row.leagues?.code} 📋
              </button>
              <button onClick={() => leave(row.league_id)} disabled={busy} style={{ padding: '3px 9px', fontSize: 12, color: 'var(--color-danger)' }}>
                עזיבה
              </button>
            </div>
          </div>
          {(members[row.league_id] || []).map((m, i) => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
              <span style={{ width: 30, fontSize: 15 }}>{medal(i)}</span>
              <span style={{ flex: 1, fontWeight: m.user_id === uid ? 800 : 500, fontSize: 13.5 }}>
                {m.display_name}{m.user_id === uid ? ' (אתה)' : ''}
              </span>
              <div style={{ flex: 2, background: 'var(--color-surface-2)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, m.pct || 0) + '%', height: '100%', background: 'var(--color-primary)' }} />
              </div>
              <span style={{ width: 42, textAlign: 'left', fontWeight: 800, fontSize: 13.5 }}>{Math.round(m.pct || 0)}%</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
            האחוז של כל חבר מתעדכן כשהוא נכנס למסך הליגה
          </div>
        </div>
      ))}

      {!loading && (
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{rows.length ? 'ליגה נוספת?' : 'איך מתחילים?'}</div>
          <input style={input} placeholder="הכינוי שלך בליגה" value={disp} onChange={e => setDisp(e.target.value)} maxLength={20} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <input style={{ ...input, marginBottom: 0, flex: 1 }} placeholder="שם לליגה חדשה" value={name} onChange={e => setName(e.target.value)} maxLength={30} />
            <button onClick={createLeague} disabled={busy} className="btn-primary" style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>יצירה</button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0' }}>או</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...input, marginBottom: 0, flex: 1, letterSpacing: 2, textAlign: 'center' }} placeholder="קוד מחבר, למשל X7K2M9" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
            <button onClick={joinLeague} disabled={busy} style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>הצטרפות</button>
          </div>
        </div>
      )}

      {msg && <p style={{ color: 'var(--color-primary)', fontSize: 13, fontWeight: 700 }}>{msg}</p>}
      {err && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{err}</p>}
    </div>
  )
}
