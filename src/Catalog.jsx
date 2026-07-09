// src/Catalog.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { estimateM } from './lib/costModel'
import { fetchCarImage } from './lib/carImage'
import MatchTest from './MatchTest'
import { GoalBanner, GoalSetup, GoalProgress } from './Goal'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

const CONF = {
  precise: { txt: 'מדויק', color: '#2e7d32' },
  calculated: { txt: 'מחושב', color: '#1565c0' },
  default: { txt: 'לפי ברירת מחדל', color: '#8a6d00' },
  estimate: { txt: 'הערכה', color: '#b26a00' },
}

function Tag({ conf }) {
  const c = CONF[conf] || CONF.estimate
  return (
    <span style={{ fontSize: 11, color: c.color, border: `1px solid ${c.color}`, borderRadius: 8, padding: '1px 7px', marginInlineStart: 8, whiteSpace: 'nowrap' }}>
      {c.txt}
    </span>
  )
}

function Detail({ v, profile, onBack, onProfileSaved, onStartGoal }) {
  const [includeEst, setIncludeEst] = useState(true)
  const [edits, setEdits] = useState({})
  const [birth, setBirth] = useState('')
  const [lic, setLic] = useState('')
  const [saving, setSaving] = useState(false)
  const [img, setImg] = useState(null)

  useEffect(() => {
    let on = true
    setImg(null)
    fetchCarImage(v).then(u => { if (on) setImg(u) })
    return () => { on = false }
  }, [v?.id])

  const hasDriver = profile?.birth_year != null
  const m = estimateM(
    v,
    { birthYear: profile?.birth_year, licenseYear: profile?.license_year },
    { includeEstimates: true }
  )

  const rows = m.components.map(c => {
    const isEst = c.confidence === 'estimate'
    const e = edits[c.key]
    let val
    if (e !== undefined && e !== '') val = Number(e)
    else if (isEst && !includeEst) val = null
    else val = c.monthly
    return { ...c, shown: Number.isFinite(val) ? val : null, edited: e !== undefined && e !== '' }
  })
  const total = rows.reduce((s, c) => s + (c.shown ?? 0), 0)
  const missing = rows.some(c => c.shown == null)
  const dirty = !includeEst || Object.values(edits).some(x => x !== undefined && x !== '')
  const infoUrl = 'https://www.google.com/search?q=' + encodeURIComponent(v.name + ' ' + (v.year || ''))

  async function saveDriver() {
    setSaving(true)
    const { data } = await supabase.auth.getUser()
    const uid = data?.user?.id
    if (uid) {
      await supabase.from('profiles').update({
        birth_year: birth === '' ? null : Number(birth),
        license_year: lic === '' ? null : Number(lic),
      }).eq('id', uid)
      await onProfileSaved()
    }
    setSaving(false)
  }

  const a = v.attrs || {}
  const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const rowSt = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee', gap: 10 }

  return (
    <div style={wrap}>
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
      <h2 style={{ marginBottom: 4 }}>{v.name}</h2>
      <div style={{ color: '#777', marginBottom: 10 }}>שנת {v.year} · {a.importer || ''}</div>
      {img && <img src={img} alt={v.name} style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />}
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{fmt(v.market_price)} ₪</div>
      <div style={{ marginBottom: 16, fontSize: 12.5 }}>
        <a href={infoUrl} target="_blank" rel="noreferrer">מידע על הדגם ברשת</a>
      </div>

      <h3 style={{ marginBottom: 6 }}>עלות חודשית</h3>

      {!hasDriver && (
        <div style={{ background: '#f6f6f6', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>
          <div style={{ marginBottom: 8 }}>להערכת ביטוח מכוונת אליך, השלם שנת לידה ושנת הוצאת רישיון</div>
          <input style={{ width: '48%', padding: 8, marginInlineEnd: '4%', boxSizing: 'border-box' }} placeholder="שנת לידה" inputMode="numeric" value={birth} onChange={e => setBirth(e.target.value)} />
          <input style={{ width: '48%', padding: 8, boxSizing: 'border-box' }} placeholder="שנת רישיון" inputMode="numeric" value={lic} onChange={e => setLic(e.target.value)} />
          <button onClick={saveDriver} disabled={saving} style={{ display: 'block', marginTop: 8, padding: '7px 12px' }}>
            {saving ? 'שומר' : 'שמור בפרופיל'}
          </button>
        </div>
      )}

      <label style={{ display: 'block', fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
        <input type="checkbox" checked={includeEst} onChange={e => setIncludeEst(e.target.checked)} />
        {' '}לכלול הערכת ביטוח ותחזוקה בסכום. אלה סכומים משוערים לפי מאפייני הרכב והנהג, לא הצעת מחיר. כל רכיב ניתן לעריכה.
      </label>

      {dirty && (
        <button
          onClick={() => { setEdits({}); setIncludeEst(true) }}
          style={{ marginBottom: 10, padding: '6px 10px', fontSize: 12.5 }}
        >
          איפוס לערכים המשוערים
        </button>
      )}

      {rows.map(c => (
        <div key={c.key} style={{ ...rowSt, opacity: c.shown == null ? 0.55 : 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {c.label}
              <Tag conf={c.confidence} />
              {c.edited && <span style={{ fontSize: 11, color: '#666', marginInlineStart: 6 }}>נערך ידנית</span>}
            </div>
            <div style={{ fontSize: 11.5, color: '#999', marginTop: 2 }}>
              {c.shown == null
                ? 'לא נכלל בחישוב. הזן סכום ידנית אם תרצה'
                : c.note + (c.rangeMonthly ? ' · טווח ' + fmt(c.rangeMonthly[0]) + ' עד ' + fmt(c.rangeMonthly[1]) + ' ₪' : '')}
            </div>
          </div>
          <input
            inputMode="numeric"
            value={edits[c.key] ?? (c.shown != null ? String(c.shown) : '')}
            placeholder="הזן"
            onChange={e => setEdits(x => ({ ...x, [c.key]: e.target.value }))}
            style={{ width: 84, padding: 6, textAlign: 'center' }}
          />
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', fontWeight: 800, fontSize: 16 }}>
        <div>סך הכול לחודש</div>
        <div>{fmt(total)} ₪</div>
      </div>
      {missing && (
        <div style={{ fontSize: 12, color: '#b26a00' }}>
          חלק מהעלויות לא נכללו, העלות בפועל תהיה גבוהה יותר.
        </div>
      )}

      <button
        onClick={() => onStartGoal(total)}
        style={{ display: 'block', width: '100%', marginTop: 16, padding: 12, borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
      >
        בחר רכב זה והתחל לחסוך
      </button>

      <div style={{ marginTop: 14, fontSize: 12.5 }}>
        <a href="https://car.cma.gov.il" target="_blank" rel="noreferrer">לבדיקת מחיר ביטוח אמיתי, מחשבון רשות שוק ההון</a>
      </div>
    </div>
  )
}

export default function Catalog({ profile, onProfileSaved }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('list')
  const [goalDraft, setGoalDraft] = useState(null)
  const [showProgress, setShowProgress] = useState(false)

  async function search(q) {
    setLoading(true)
    let req = supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('kind', 'car')
      .limit(50)
    if (q && q.trim()) {
      req = req.ilike('name', `%${q.trim()}%`).order('market_price', { ascending: true })
    } else {
      req = req.order('year', { ascending: false }).order('market_price', { ascending: true })
    }
    const { data, error } = await req
    setLoading(false)
    if (!error) setRows(data || [])
  }

  useEffect(() => { search('') }, [])

  async function openGoalCar(id) {
    const { data } = await supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('id', id)
      .maybeSingle()
    if (data) setSelected(data)
  }

  const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const row = { padding: 12, borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10 }

  if (showProgress) {
    return <GoalProgress profile={profile} onBack={() => setShowProgress(false)} />
  }

  if (goalDraft) {
    return (
      <GoalSetup
        v={goalDraft.v}
        m={goalDraft.m}
        profile={profile}
        onBack={() => setGoalDraft(null)}
        onDone={async () => { setGoalDraft(null); setSelected(null); await onProfileSaved() }}
      />
    )
  }

  if (selected) {
    return (
      <Detail
        v={selected}
        profile={profile}
        onBack={() => setSelected(null)}
        onProfileSaved={onProfileSaved}
        onStartGoal={total => setGoalDraft({ v: selected, m: total })}
      />
    )
  }

  if (mode === 'test') {
    return (
      <MatchTest
        profile={profile}
        onBack={() => setMode('list')}
        onPick={v => { setMode('list'); setSelected(v) }}
      />
    )
  }

  return (
    <div style={wrap}>
      <GoalBanner
        profile={profile}
        onOpenCar={openGoalCar}
        onOpenProgress={() => setShowProgress(true)}
        onProfileSaved={onProfileSaved}
      />
      <button
        onClick={() => setMode('test')}
        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 10, border: '1px solid #111', background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
      >
        {profile?.car_prefs ? 'תוצאות ההתאמה שלי' : 'מבחן התאמה, מצא רכב בשבילי'}
      </button>
      <input
        style={{ width: '100%', padding: 10, marginBottom: 12, boxSizing: 'border-box', fontSize: 15 }}
        placeholder="חפש לפי יצרן או דגם, למשל טויוטה"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') search(query) }}
      />
      <button onClick={() => search(query)} style={{ padding: '8px 14px', marginBottom: 12 }}>חיפוש</button>
      {loading && <div style={{ color: '#999' }}>טוען</div>}
      {!loading && rows.length === 0 && <div style={{ color: '#999' }}>לא נמצאו תוצאות</div>}
      {rows.map(v => (
        <div key={v.id} style={row} onClick={() => setSelected(v)}>
          <div>
            <div style={{ fontWeight: 700 }}>{v.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>שנת {v.year}</div>
          </div>
          <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(v.market_price)} ₪</div>
        </div>
      ))}
    </div>
  )
}
