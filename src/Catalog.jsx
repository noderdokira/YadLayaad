// src/Catalog.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { estimateM } from './lib/costModel'
import { fetchCarImage, verifiedImage } from './lib/carImage'
import { normalizeCars, priceTag, usedSearchUrl, priceListSearchUrl, savingsLevel, PRICES_UPDATED } from './lib/priceBook'
import { normalizeMotos } from './lib/motoBook'
import MatchTest from './MatchTest'
import Compare from './Compare'
import CarCheck from './CarCheck'
import { GoalBanner, GoalSetup, GoalProgress } from './Goal'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

// יצרן = החלק העברי שלפני האותיות הלטיניות בשם הדגם
function brandOf(name) {
  const m = String(name || '').match(/^[^A-Za-z0-9]+/)
  return m ? m[0].trim() : ''
}

// "תמונה מאומתת" = הדגם נמצא במפה שנבנתה על ידי tools/fetchImages.mjs ואומתה
// מול שם הקובץ בוויקישיתוף. חיפוש חי עשוי למצוא עוד תמונות, אבל רק מה שבמפה
// עבר בדיקה, ולכן רק הוא נחשב מאומת בסינון הזה. הבדיקה עצמה יושבת
// ב־carImage.js, שמגשר בין השמות המנוקים בכרטיסים למפתחות הגולמיים במפה.
const hasVerifiedImage = v => !!verifiedImage(v)

// עיצוב הסליידר הדו ראשי של טווח המחיר. שני input מונחים זה על זה,
// המסילה שקופה ורק הידיות תופסות עכבר. הצבע נמשך ממשתני ערכת הנושא.
const RANGE_CSS = `
.range-wrap { position: relative; height: 26px; }
.range-wrap input[type=range] {
  position: absolute; inset: 0; width: 100%; margin: 0;
  -webkit-appearance: none; appearance: none; background: none; pointer-events: none;
}
.range-wrap input[type=range]::-webkit-slider-runnable-track { background: none; }
.range-wrap input[type=range]::-moz-range-track { background: none; }
.range-wrap input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; pointer-events: auto;
  width: 20px; height: 20px; margin-top: 3px; border-radius: 50%;
  background: var(--color-primary); border: 2.5px solid var(--color-surface);
  box-shadow: 0 1px 4px rgba(0,0,0,.3); cursor: grab;
}
.range-wrap input[type=range]::-moz-range-thumb {
  pointer-events: auto; width: 16px; height: 16px; border-radius: 50%;
  background: var(--color-primary); border: 2.5px solid var(--color-surface);
  box-shadow: 0 1px 4px rgba(0,0,0,.3); cursor: grab;
}
.range-track { position: absolute; top: 11px; left: 0; right: 0; height: 5px; border-radius: 3px; }
`

// טווח מחיר: שני ראשים על מסילה אחת, ולצידם שדות הקלדה מסונכרנים.
// גרירה מעדכנת את השדות מיד. הקלדה מתאשרת ביציאה מהשדה או ב־Enter,
// ולא תוך כדי, אחרת הקלדת "8" בדרך ל"80,000" הייתה מקפיצה את הסליידר.
// אפס פירושו "לא הוגבל", ולכן ניקוי הסינון והחלפת סוג הרכב מאפסים.
// ראש עליון שנגרר עד הקצה, או ערך מוקלד מעל התקרה, חוזרים ל"ללא הגבלה".
function PriceRange({ lo, hi, cap, onChange }) {
  const step = 1000
  const hiEff = hi || cap
  const [loTxt, setLoTxt] = useState(fmt(lo))
  const [hiTxt, setHiTxt] = useState(fmt(hiEff))
  useEffect(() => { setLoTxt(fmt(lo)); setHiTxt(fmt(hiEff)) }, [lo, hiEff])
  const digits = s => Number(String(s).replace(/[^0-9]/g, '')) || 0
  function commit() {
    let l = digits(loTxt), h = digits(hiTxt)
    if (h && h < l) { const t = l; l = h; h = t }   // טווח הפוך מתיישר במקום להעלים הכל
    l = Math.max(0, Math.min(l, cap - step))
    onChange(l, !h || h >= cap ? 0 : h)
  }
  const onKey = e => { if (e.key === 'Enter') e.target.blur() }
  const pct = x => Math.max(0, Math.min(100, (x / cap) * 100))
  // הדף כולו RTL, והמסילה נצבעת מימין: המינימום בימין כמו כיוון הקריאה
  const fill = `linear-gradient(to left, var(--color-border) ${pct(lo)}%, var(--color-primary) ${pct(lo)}%, var(--color-primary) ${pct(hiEff)}%, var(--color-border) ${pct(hiEff)}%)`
  // המספרים בכיוון לטיני כדי שהפסיקים יישבו נכון בתוך עמוד RTL
  const box = { width: 86, padding: '5px 6px', fontSize: 12.5, textAlign: 'center', borderRadius: 8, direction: 'ltr' }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5 }}>טווח מחיר</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
          <input
            value={loTxt} inputMode="numeric" aria-label="מחיר מזערי" style={box}
            onChange={e => setLoTxt(e.target.value)} onBlur={commit} onKeyDown={onKey}
          />
          <span style={{ color: 'var(--color-text-muted)' }}>עד</span>
          <input
            value={hiTxt} inputMode="numeric" aria-label="מחיר מרבי" style={box}
            onChange={e => setHiTxt(e.target.value)} onBlur={commit} onKeyDown={onKey}
          />
          <span>₪</span>
        </div>
      </div>
      <div className="range-wrap">
        <div className="range-track" style={{ background: fill }} />
        <input
          type="range" min={0} max={cap} step={step} value={hiEff}
          aria-label="מחיר מרבי"
          onChange={e => {
            const x = Math.max(Number(e.target.value), lo + step)
            onChange(lo, x >= cap ? 0 : x)
          }}
        />
        <input
          type="range" min={0} max={cap} step={step} value={lo}
          aria-label="מחיר מזערי"
          // כששני הראשים נערמים בקצה העליון, התחתון מקבל עדיפות עכבר,
          // אחרת אי אפשר להפריד אותם בחזרה
          style={lo > cap - step * 10 ? { zIndex: 3 } : undefined}
          onChange={e => onChange(Math.min(Number(e.target.value), hiEff - step), hi)}
        />
      </div>
    </div>
  )
}

const PRODUCT_COLS = 'id, name, year, market_price, addons_once, monthly_cost, attrs'

const CONF = {
  precise: { txt: 'מדויק' },
  calculated: { txt: 'מחושב' },
  default: { txt: 'לפי ברירת מחדל' },
  estimate: { txt: 'הערכה' },
}

function Tag({ conf }) {
  const c = CONF[conf] || CONF.estimate
  return (
    <span style={{ fontSize: 11, color: 'var(--color-info)', border: '1px solid var(--color-info)', borderRadius: 8, padding: '1px 7px', marginInlineStart: 8, whiteSpace: 'nowrap' }}>
      {c.txt}
    </span>
  )
}

const TAG_COLORS = {
  ok: 'var(--color-primary)',
  info: 'var(--color-info)',
  warn: 'var(--color-warn)',
  muted: 'var(--color-text-muted)',
}

function PriceBadge({ v, size = 10.5 }) {
  const t = priceTag(v)
  if (!t) return null
  const c = TAG_COLORS[t.kind] || TAG_COLORS.muted
  return (
    <span style={{ fontSize: size, color: c, border: `1px solid ${c}`, borderRadius: 8, padding: '1px 6px', whiteSpace: 'nowrap' }}>
      {t.txt}
    </span>
  )
}

// מד רמת חיסכון: 1 עד 5 שקיות כסף, כמה קשה יהיה לחסוך לרכב הזה
function MoneyMeter({ v, profile, withLabel = false }) {
  const lvl = savingsLevel(v.market_price, profile?.monthly_capacity, profile?.current_savings)
  if (!lvl) return null
  return (
    <span title={'רמת חיסכון: ' + lvl.label + ' (' + lvl.level + ' מתוך 5)'} style={{ fontSize: 12, letterSpacing: 1, whiteSpace: 'nowrap' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ opacity: i < lvl.level ? 1 : 0.22 }}>💰</span>
      ))}
      {withLabel && <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginInlineStart: 6 }}>{lvl.label}</span>}
    </span>
  )
}

function CarImage({ v, onClick, height = null }) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    let on = true
    setImg(null)
    fetchCarImage(v).then(u => { if (on) setImg(u) })
    return () => { on = false }
  }, [v?.name, v?.year])
  if (img) return <img className="car-card-img" src={img} alt={v.name} onClick={onClick} loading="lazy" style={height ? { aspectRatio: 'auto', height } : undefined} />
  return <div className="car-card-imgless" onClick={onClick}>{v?.kind === 'moto' ? '🏍️' : '🚗'}</div>
}

function Detail({ v, profile, onBack, onProfileSaved, onStartGoal, compareSel = [], onToggleCompare, demo = false }) {
  const [includeEst, setIncludeEst] = useState(true)
  const [edits, setEdits] = useState({})
  const [birth, setBirth] = useState('')
  const [lic, setLic] = useState('')
  const [saving, setSaving] = useState(false)

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
  const lvl = savingsLevel(v.market_price, profile?.monthly_capacity, profile?.current_savings)

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
  const isMoto = v.kind === 'moto'
  const rowSt = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)', gap: 10 }
  const inCompare = compareSel.some(x => x.id === v.id)

  return (
    <div className="page-wrap page-wrap--wide">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ padding: '6px 10px' }}>חזרה</button>
        {onToggleCompare && (
          <button onClick={() => onToggleCompare(v)} className={inCompare ? 'btn-primary' : ''} style={{ padding: '6px 10px' }}>
            {inCompare ? '✓ בהשוואה' : '+ השווה'}
          </button>
        )}
        <button
          onClick={() => window.open(usedSearchUrl(v), '_blank', 'noopener')}
          style={{ padding: '6px 10px' }}
        >
          🔍 חיפוש ביד שנייה
        </button>
      </div>

      <h2 className="page-title" style={{ marginBottom: 4, marginTop: 0 }}>{v.name}</h2>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
        שנת {v.year}{a.importer ? ' · ' + a.importer : ''}{v.trims > 1 ? ' · ' + v.trims + ' רמות גימור' : ''}
      </div>
      <div className="detail-grid">
      <div>
      <CarImage v={v} height={220} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(v.market_price)} ₪</div>
        <PriceBadge v={v} size={11.5} />
      </div>
      {v.estimated && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
          מחירון {v.year}: {fmt(v.list_price)} ₪ · השווי המוצג משוער לפי ירידת ערך מקובלת, בדוק מחיר בפועל ביד שנייה
        </div>
      )}
      {v.priceRange && !v.estimated && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
          לפי רמות גימור: {fmt(v.priceRange[0])} עד {fmt(v.priceRange[1])} ₪
        </div>
      )}
      {lvl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 4 }}>
          <MoneyMeter v={v} profile={profile} withLabel />
          <span style={{ fontSize: 12, color: 'var(--color-info)' }}>כ {lvl.months} חודשי חיסכון בקצב שלך</span>
        </div>
      )}
      <div style={{ marginBottom: 16, marginTop: 6, fontSize: 12.5, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href={infoUrl} target="_blank" rel="noreferrer">מידע על הדגם ברשת</a>
        <a href={priceListSearchUrl(v.name, v.year)} target="_blank" rel="noreferrer">מחיר שוק לדגם במחירון יד2</a>
      </div>
      </div>

      <div>
      <h3 style={{ marginTop: 0, marginBottom: 6 }}>עלות חודשית</h3>

      {!hasDriver && !demo && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>
          <div style={{ marginBottom: 8 }}>להערכת ביטוח מכוונת אליך, השלם שנת לידה ושנת הוצאת רישיון</div>
          <input style={{ width: '48%', padding: 8, marginInlineEnd: '4%' }} placeholder="שנת לידה" inputMode="numeric" value={birth} onChange={e => setBirth(e.target.value)} />
          <input style={{ width: '48%', padding: 8 }} placeholder="שנת רישיון" inputMode="numeric" value={lic} onChange={e => setLic(e.target.value)} />
          <button onClick={saveDriver} disabled={saving} style={{ display: 'block', marginTop: 8, padding: '7px 12px' }}>
            {saving ? 'שומר' : 'שמור בפרופיל'}
          </button>
        </div>
      )}

      <label style={{ display: 'block', fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
        <input type="checkbox" checked={includeEst} onChange={e => setIncludeEst(e.target.checked)} />
        {' '}לכלול הערכת ביטוח ותחזוקה בסכום. אלה סכומים משוערים לפי מאפייני {isMoto ? 'הכלי והרוכב' : 'הרכב והנהג'}, לא הצעת מחיר. כל רכיב ניתן לעריכה.
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
              {c.edited && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginInlineStart: 6 }}>נערך ידנית</span>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
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
        <div style={{ fontSize: 12, color: 'var(--color-warn)' }}>
          חלק מהעלויות לא נכללו, העלות בפועל תהיה גבוהה יותר.
        </div>
      )}

      <button
        onClick={() => onStartGoal(total)}
        className="btn-primary"
        style={{ display: 'block', width: '100%', marginTop: 16, padding: 12, borderRadius: 10, fontSize: 15 }}
      >
        {isMoto ? 'בחר דגם זה והתחל לחסוך' : 'בחר רכב זה והתחל לחסוך'}
      </button>

      <div style={{ marginTop: 14, fontSize: 12.5 }}>
        <a href="https://car.cma.gov.il" target="_blank" rel="noreferrer">לבדיקת מחיר ביטוח אמיתי, מחשבון רשות שוק ההון</a>
      </div>
      </div>
      </div>
    </div>
  )
}

function CarCard({ v, profile, onOpen, fav, onToggleFav, inCompare, onToggleCompare }) {
  const lvl = savingsLevel(v.market_price, profile?.monthly_capacity, profile?.current_savings)
  return (
    <div className="car-card">
      <CarImage v={v} onClick={onOpen} />
      <div className="car-card-body">
        <div onClick={onOpen} style={{ cursor: 'pointer' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.35, minHeight: 36 }}>{v.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
            שנת {v.year}
            {v.kind === 'moto' && v.license && (
              <span style={{ marginInlineStart: 6, color: 'var(--color-info)', border: '1px solid var(--color-info)', borderRadius: 8, padding: '0px 6px', fontSize: 10 }}>
                רישיון {v.license}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}>{fmt(v.market_price)} ₪</span>
            <PriceBadge v={v} />
          </div>
          {lvl && (
            <div style={{ marginTop: 4 }}>
              <MoneyMeter v={v} profile={profile} />
              <div style={{ fontSize: 10.5, color: 'var(--color-info)', marginTop: 2 }}>
                כ {lvl.months} חודשי חיסכון בקצב שלך
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
            <input type="checkbox" checked={inCompare} onChange={onToggleCompare} />
            {' '}השווה
          </label>
          <button
            onClick={onToggleFav}
            title="מועדפים"
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 17, color: fav ? 'var(--color-warn)' : 'var(--color-text-muted)', padding: 0 }}
          >
            {fav ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Catalog({ profile, onProfileSaved, demo = false, onRequestAuth }) {
  const [kind, setKind] = useState(() => localStorage.getItem('cat_kind') === 'moto' ? 'moto' : 'car')
  // חיפוש נפרד לכל קטלוג: אובייקט שאילתות לפי סוג במקום משתנה משותף.
  // כל קטלוג זוכר את הטקסט שלו, ומעבר בין קטלוגים לא גורר חיפוש של האחד לשני
  const [queries, setQueries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cat_queries') || '{}') || {} } catch { return {} }
  })
  const query = queries[kind] ?? ''
  const setQuery = v => setQueries(qs => ({ ...qs, [kind]: v }))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [carCheck, setCarCheck] = useState(false)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('list')
  const [goalDraft, setGoalDraft] = useState(null)
  const [showProgress, setShowProgress] = useState(false)
  const [yearMin, setYearMin] = useState(() => Number(localStorage.getItem('cat_yearMin')) || 0)
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('cat_sortBy') || 'year_desc')
  const [favIds, setFavIds] = useState(() => (Array.isArray(profile?.favorites) ? profile.favorites : []))
  const [favOnly, setFavOnly] = useState(() => localStorage.getItem('cat_favOnly') === 'true')
  const [imgOnly, setImgOnly] = useState(() => localStorage.getItem('cat_imgOnly') === 'true')
  const [brandSel, setBrandSel] = useState('')
  const [licSel, setLicSel] = useState('')
  const [ccMax, setCcMax] = useState(0)
  const [priceLo, setPriceLo] = useState(0)
  const [priceHi, setPriceHi] = useState(0)
  const [compareSel, setCompareSel] = useState([])
  const [compareView, setCompareView] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
    // צבע שורת הסטטוס בטלפון עוקב אחרי ערכת הנושא שנבחרה בתוך האפליקציה
    document.querySelectorAll('meta[name="theme-color"]').forEach(m =>
      m.setAttribute('content', darkMode ? '#1f1e1d' : '#f4f6f4')
    )
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('cat_queries', JSON.stringify(queries))
    localStorage.setItem('cat_yearMin', yearMin)
    localStorage.setItem('cat_sortBy', sortBy)
    localStorage.setItem('cat_favOnly', favOnly)
    localStorage.setItem('cat_kind', kind)
    localStorage.setItem('cat_imgOnly', imgOnly)
  }, [queries, yearMin, sortBy, favOnly, kind, imgOnly])

  function sortCars(list, sb) {
    const arr = [...list]
    if (sb === 'price_desc') arr.sort((x, y) => (y.market_price ?? 0) - (x.market_price ?? 0))
    else if (sb === 'price_asc') arr.sort((x, y) => (x.market_price ?? 0) - (y.market_price ?? 0))
    else if (sb === 'm_asc') {
      const u = { birthYear: profile?.birth_year, licenseYear: profile?.license_year }
      arr.sort((x, y) =>
        estimateM(x, u, { includeEstimates: true }).total - estimateM(y, u, { includeEstimates: true }).total
      )
    } else arr.sort((x, y) => (y.year ?? 0) - (x.year ?? 0) || (x.market_price ?? 0) - (y.market_price ?? 0))
    return arr
  }

  async function search(q, ym = yearMin, sb = sortBy, fo = favOnly, favs = favIds, k = kind) {
    if (fo && (!favs || favs.length === 0)) { setRows([]); return }
    setLoading(true)
    setLoadErr('')
    let req = supabase
      .from('products')
      .select(PRODUCT_COLS)
      .eq('kind', k)
      .limit(400)
    if (fo) req = req.in('id', favs)
    if (ym > 0) req = req.gte('year', ym)
    if (q && q.trim()) req = req.ilike('name', `%${q.trim()}%`)
    if (sb === 'price_desc') req = req.order('market_price', { ascending: false })
    else if (sb === 'year_desc') req = req.order('year', { ascending: false }).order('market_price', { ascending: true })
    else req = req.order('market_price', { ascending: true })
    const { data, error } = await req
    setLoading(false)
    if (error) { setLoadErr('שגיאה בטעינת הקטלוג: ' + error.message); return }
    const normalize = k === 'moto' ? normalizeMotos : normalizeCars
    setRows(sortCars(normalize(data || []), sb))
  }

  useEffect(() => { search(query) }, [])

  function switchKind(k) {
    if (k === kind) return
    setKind(k)
    setCompareSel([])
    setBrandSel(''); setLicSel(''); setCcMax(0); setPriceLo(0); setPriceHi(0)
    // מחפשים עם השאילתה של הקטלוג שעוברים אליו, לא עם זו של הנוכחי
    search(queries[k] ?? '', yearMin, sortBy, favOnly, favIds, k)
  }

  async function openGoalCar(id) {
    const { data: one } = await supabase
      .from('products')
      .select(PRODUCT_COLS + ', kind')
      .eq('id', id)
      .maybeSingle()
    if (!one) return
    const { data: grp } = await supabase
      .from('products')
      .select(PRODUCT_COLS + ', kind')
      .eq('kind', one.kind || 'car')
      .eq('name', one.name)
      .eq('year', one.year)
    const normalize = (one.kind || 'car') === 'moto' ? normalizeMotos : normalizeCars
    const n = normalize(grp && grp.length ? grp : [one])
    if (n.length) setSelected(n[0])
  }

  async function toggleFav(id) {
    if (demo) { onRequestAuth?.(); return }
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

  const sel = { flex: 1, padding: 8, fontSize: 13 }

  // סינון בבחירה ולא בהקלדה. הערכים נגזרים מהתוצאות שכבר נטענו,
  // ולכן לא מוצע למשתמש מסנן שלא יחזיר כלום.
  const brands = [...new Set(rows.map(v => brandOf(v.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'))
  // תקרת הסליידר נגזרת מהתוצאות שנטענו ומעוגלת לחמשת אלפים, כך שהמסילה
  // מתאימה את עצמה: עד כמאה אלף באופנועים, יותר ברכבים
  const priceCap = Math.max(20000, Math.ceil(Math.max(0, ...rows.map(v => v.market_price ?? 0)) / 5000) * 5000)
  const visible = rows.filter(v => {
    if (imgOnly && !hasVerifiedImage(v)) return false
    if (brandSel && brandOf(v.name) !== brandSel) return false
    if (licSel && v.license !== licSel) return false
    if (ccMax && !(v.cc != null && v.cc <= ccMax)) return false
    const price = v.market_price ?? 0
    if (priceLo && price < priceLo) return false
    if (priceHi && price > priceHi) return false
    return true
  })
  const withImg = rows.filter(hasVerifiedImage).length
  // חובה ערך בוליאני: שרשרת || שמסתיימת במספר מחזירה 0 כשהכל כבוי,
  // וריאקט מצייר את ה־0 הזה על המסך בכל {filtersOn && ...}
  const filtersOn = !!(imgOnly || brandSel || licSel || ccMax || priceLo || priceHi)

  if (showProgress) {
    return <GoalProgress profile={profile} onBack={() => setShowProgress(false)} />
  }

  if (carCheck) {
    return (
      <CarCheck
        onBack={() => setCarCheck(false)}
        onPick={v => { setCarCheck(false); setSelected(v) }}
      />
    )
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
        onStartGoal={total => { if (demo) { onRequestAuth?.(); return } setGoalDraft({ v: selected, m: total }) }}
        demo={demo}
        compareSel={compareSel}
        onToggleCompare={toggleCompare}
      />
    )
  }

  if (mode === 'test') {
    return (
      <MatchTest
        profile={profile}
        demo={demo}
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
    <div className="page-wrap page-wrap--wide">
      <GoalBanner
        profile={profile}
        onOpenCar={openGoalCar}
        onOpenProgress={() => setShowProgress(true)}
        onProfileSaved={onProfileSaved}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => switchKind('car')}
          className={kind === 'car' ? 'btn-primary' : ''}
          style={{ flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 14 }}
        >
          🚗 רכבים
        </button>
        <button
          onClick={() => switchKind('moto')}
          className={kind === 'moto' ? 'btn-primary' : ''}
          style={{ flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 14 }}
        >
          🏍️ אופנועים
        </button>
      </div>
      {/* כפתור ההתאמה האישית הוא הפעולה המרכזית במסך, ולכן מלא בצבע
          הראשי וגדול משאר הכפתורים, ולא עוד אופציה ברשימה */}
      {kind === 'car' && <button
        onClick={() => setMode('test')}
        className="btn-primary"
        style={{ width: '100%', padding: 15, marginBottom: 8, borderRadius: 12, fontWeight: 800, fontSize: 16.5 }}
      >
        {profile?.car_prefs ? 'תוצאות ההתאמה שלי' : '✨ מבחן התאמה אישית, איזה רכב מתאים לי'}
      </button>}
      {kind === 'car' && <button
        onClick={() => setCarCheck(true)}
        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 10, border: '1px solid var(--color-info)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 700, fontSize: 14 }}
      >
        🔎 בדיקת רכב לפי מספר רישוי, לפני שקונים יד שנייה
      </button>}

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
          className={favOnly ? 'btn-primary' : ''}
          style={{ padding: '6px 10px', fontSize: 12.5, borderRadius: 8, whiteSpace: 'nowrap' }}
        >
          ★ מועדפים
        </button>
        <button onClick={() => setDarkMode(d => !d)} title="החלפת ערכת נושא" style={{ padding: '6px 12px', borderRadius: 8, fontSize: 18 }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>


      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={brandSel} onChange={e => setBrandSel(e.target.value)} style={{ padding: 7, fontSize: 12.5, minWidth: 120 }}>
            <option value="">כל היצרנים</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {kind === 'moto' && (
            <select value={licSel} onChange={e => setLicSel(e.target.value)} style={{ padding: 7, fontSize: 12.5 }}>
              <option value="">כל דרגות הרישיון</option>
              <option value="A2">A2 · עד 125 סמ"ק, מגיל 16</option>
              <option value="A1">A1 · עד 47.5 כ"ס, מגיל 18</option>
              <option value="A">A · ללא הגבלה, מגיל 21</option>
            </select>
          )}

          {kind === 'moto' && (
            <select value={ccMax} onChange={e => setCcMax(Number(e.target.value))} style={{ padding: 7, fontSize: 12.5 }}>
              <option value={0}>כל הנפחים</option>
              <option value={125}>עד 125 סמ"ק</option>
              <option value={300}>עד 300 סמ"ק</option>
              <option value={500}>עד 500 סמ"ק</option>
              <option value={800}>עד 800 סמ"ק</option>
            </select>
          )}

          <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={imgOnly} onChange={e => setImgOnly(e.target.checked)} />
            רק עם תמונה מאומתת ({withImg})
          </label>

          {filtersOn && (
            <button
              onClick={() => { setBrandSel(''); setLicSel(''); setCcMax(0); setPriceLo(0); setPriceHi(0); setImgOnly(false) }}
              style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8 }}
            >
              ניקוי סינון
            </button>
          )}
        </div>

        <style>{RANGE_CSS}</style>
        <PriceRange
          lo={priceLo} hi={priceHi} cap={priceCap}
          onChange={(lo, hi) => { setPriceLo(lo); setPriceHi(hi) }}
        />

        {filtersOn && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 8 }}>
            מוצגים {visible.length} מתוך {rows.length}
          </div>
        )}
      </div>

      {compareSel.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 8 }}>
          <div style={{ fontSize: 12.5, flex: 1 }}>נבחרו {compareSel.length} מתוך 3 להשוואה</div>
          <button disabled={compareSel.length < 2} onClick={() => setCompareView(true)} className="btn-primary" style={{ padding: '6px 10px' }}>השוואה</button>
          <button onClick={() => setCompareSel([])} style={{ padding: '6px 10px' }}>ניקוי</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 10, fontSize: 15 }}
          placeholder={kind === 'moto' ? 'חיפוש לפי יצרן או דגם, למשל הונדה PCX' : 'חיפוש לפי יצרן או דגם, למשל טויוטה'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(query) }}
        />
        <button onClick={() => search(query)} style={{ padding: '8px 14px' }}>חיפוש</button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        {kind === 'moto'
          ? <>מחירי האופנועים אומתו מול היבואנים הרשמיים ({PRICES_UPDATED}). משומש מוצג לפי שווי מוערך. הביטוח מוערך לפי תעריף הפול.</>
          : <>המחירים אומתו מול מקורות ישראליים ({PRICES_UPDATED}). רכב משומש מוצג לפי שווי מוערך, רמות גימור אוחדו לכרטיס אחד.</>}
      </div>

      {loading && <div style={{ color: 'var(--color-text-muted)' }}>טוען</div>}
      {loadErr && (
        <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 10 }}>
          {loadErr} <button onClick={() => search(query)} style={{ padding: '3px 8px', fontSize: 12 }}>ניסיון נוסף</button>
        </div>
      )}
      {!loading && visible.length === 0 && (
        <div style={{ color: 'var(--color-text-muted)' }}>{
          rows.length > 0
            ? 'אין תוצאות לסינון הזה. אפשר להרחיב אותו או ללחוץ ניקוי סינון'
            : (favOnly
                ? (kind === 'moto' ? 'אין עדיין מועדפים. כוכב על דגם שמעניין אותך ישמור אותו כאן' : 'אין עדיין מועדפים. כוכב על רכב שמעניין אותך ישמור אותו כאן')
                : 'לא נמצאו תוצאות')
        }</div>
      )}
      <div className="car-grid">
        {visible.map(v => (
          <CarCard
            key={v.name + '|' + v.year}
            v={v}
            profile={profile}
            onOpen={() => setSelected(v)}
            fav={favIds.includes(v.id)}
            onToggleFav={() => toggleFav(v.id)}
            inCompare={compareSel.some(x => x.id === v.id)}
            onToggleCompare={() => toggleCompare(v)}
          />
        ))}
      </div>
    </div>
  )
}
