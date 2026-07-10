// src/Catalog.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { estimateM } from './lib/costModel'
import { fetchCarImage } from './lib/carImage'
import MatchTest from './MatchTest'
import Compare from './Compare'
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
  const [yearMin, setYearMin] = useState(0)
  const [sortBy, setSortBy] = useState('year_desc')
  const [favIds, setFavIds] = useState(() => (Array.isArray(profile?.favorites) ? profile.favorites : []))
  const [favOnly, setFavOnly] = useState(false)
  const [compareSel, setCompareSel] = useState([])
  const [compareView, setCompareView] = useState(false)

  async function search(q, ym = yearMin, sb = sortBy, fo = favOnly, favs = favIds) {
    if (fo && (!favs || favs.length === 0)) { setRows([]); return }
    setLoading(true)
    let req = supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('kind', 'car')
      .limit(50)
    if (fo) req = req.in('id', favs)
    if (ym > 0) req = req.gte('year', ym)
    if (q && q.trim()) req = req.ilike('name', `%${q.trim()}%`)
    if (sb === 'price_desc') req = req.order('market_price', { ascending: false })
    else if (sb === 'year_desc') req = req.order('year', { ascending: false }).order('market_price', { ascending: true })
    else req = req.order('market_price', { ascending: true })
    const { data, error } = await req
    setLoading(false)
    if (error) return
    let list = data || []
    if (sb === 'm_asc') {
      const u = { birthYear: profile?.birth_year, licenseYear: profile?.license_year }
      list = [...list].sort((x, y) =>
        estimateM(x, u, { includeEstimates: true }).total - estimateM(y, u, { includeEstimates: true }).total
      )
    }
    setRows(list)
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

  async function toggleFav(id) {
    const prev = favIds
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    setFavIds(next)
    const { error } = await supabase.from('profiles').update({ favorites: next }).eq('id', profile.id)
    if (error) setFavIds(prev)
  }

  function toggleCompare(v) {
    setCompareSel(prev => {
      if (prev.some(x => x.id === v.id)) return prev.filter(x => x.id !== v.id)
      if (prev.length >= 3) return prev
      return [...prev, v]
    })
  }

  function monthsLabel(v) {
    const cap = profile?.monthly_capacity
    if (!(cap > 0)) return null
    const target = Math.max(0, (v.market_price ?? 0) - (profile?.current_savings ?? 0))
    const n = Math.ceil(target / cap)
    return n <= 0 ? 'בהישג יד כבר עכשיו' : 'כ ' + n + ' חודשי חיסכון בקצב שלך'
  }

  const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const row = { padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', gap: 10 }
  const sel = { flex: 1, padding: 8, fontSize: 13, boxSizing: 'border-box' }

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

  if (compareView) {
    return (
      <Compare
        cars={compareSel}
        profile={profile}
        onBack={() => setCompareView(false)}
        onPick={v => { setCompareView(false); setSelected(v) }}
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          value={yearMin}
          onChange={e => { const ym = Number(e.target.value); setYearMin(ym); search(query, ym, sortBy) }}
          style={sel}
        >
          <option value={0}>כל השנים</option>
          <option value={2018}>2018 ומעלה</option>
          <option value={2020}>2020 ומעלה</option>
          <option value={2022}>2022 ומעלה</option>
          <option value={2024}>2024 ומעלה</option>
          <option value={2026}>2026 בלבד</option>
        </select>
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); search(query, yearMin, e.target.value) }}
          style={sel}
        >
          <option value="year_desc">חדשים קודם</option>
          <option value="price_asc">מחיר עולה</option>
          <option value="price_desc">מחיר יורד</option>
          <option value="m_asc">עלות חודשית נמוכה</option>
        </select>
        <button
          onClick={() => { const f = !favOnly; setFavOnly(f); search(query, yearMin, sortBy, f) }}
          style={{ padding: '6px 10px', fontSize: 12.5, borderRadius: 8, border: '1px solid ' + (favOnly ? '#111' : '#ccc'), background: favOnly ? '#111' : '#fff', color: favOnly ? '#fff' : '#111', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ★ מועדפים
        </button>
      </div>

      {compareSel.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, background: '#f6f6f6', borderRadius: 10, padding: 8 }}>
          <div style={{ fontSize: 12.5, flex: 1 }}>נבחרו {compareSel.length} מתוך 3 להשוואה</div>
          <button disabled={compareSel.length < 2} onClick={() => setCompareView(true)} style={{ padding: '6px 10px', fontWeight: 700 }}>השוואה</button>
          <button onClick={() => setCompareSel([])} style={{ padding: '6px 10px' }}>ניקוי</button>
        </div>
      )}

      <input
        style={{ width: '100%', padding: 10, marginBottom: 12, boxSizing: 'border-box', fontSize: 15 }}
        placeholder="חפש לפי יצרן או דגם, למשל טויוטה"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') search(query) }}
      />
      <button onClick={() => search(query)} style={{ padding: '8px 14px', marginBottom: 12 }}>חיפוש</button>
      {loading && <div style={{ color: '#999' }}>טוען</div>}
      {!loading && rows.length === 0 && (
        <div style={{ color: '#999' }}>{favOnly ? 'אין עדיין מועדפים. סמן כוכב על רכבים שמעניינים אותך' : 'לא נמצאו תוצאות'}</div>
      )}
      {rows.map(v => (
        <div key={v.id} style={row}>
          <div onClick={() => setSelected(v)} style={{ flex: 1, cursor: 'pointer' }}>
            <div style={{ fontWeight: 700 }}>{v.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>שנת {v.year}</div>
            {monthsLabel(v) && <div style={{ fontSize: 11, color: '#1565c0', marginTop: 2 }}>{monthsLabel(v)}</div>}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(v.market_price)} ₪</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => toggleFav(v.id)}
                title="מועדפים"
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: favIds.includes(v.id) ? '#b26a00' : '#bbb', padding: 0 }}
              >
                {favIds.includes(v.id) ? '★' : '☆'}
              </button>
              <label style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={compareSel.some(x => x.id === v.id)}
                  onChange={() => toggleCompare(v)}
                />
                {' '}השווה
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
