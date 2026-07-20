// src/CarCheck.jsx
// בדיקת רכב לפי מספר רישוי, מול מאגר הרכב הפתוח של משרד התחבורה.
// נועד לשלב שבו בודקים מודעה ביד שנייה: מאמתים שנתון, דגם, סוג בעלות,
// תוקף טסט ונתוני בטיחות, ומצליבים מול השווי המוערך בקטלוג שלנו.
import { useState } from 'react'
import { supabase } from './lib/supabase'
import { normalizePlate, fetchAnyByPlate, fetchModelSpec } from './lib/govCar'
import { normalizeCars, cleanName, priceListSearchUrl } from './lib/priceBook'
import { normalizeMotos } from './lib/motoBook'

const fmt = n => (n == null || n === '' ? 'אין נתון' : Number(n).toLocaleString('he-IL'))

const KIND_COLORS = {
  ok: 'var(--color-primary)',
  info: 'var(--color-info)',
  warn: 'var(--color-warn)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-text-muted)',
}

const OWNERSHIP_INFO = {
  'פרטי': { kind: 'ok', note: 'בעלות פרטית. עדיין כדאי לברר כמה בעלים היו לרכב לאורך חייו' },
  'השכרה': { kind: 'warn', note: 'רכב שרשום כהשכרה: לרוב קילומטראז׳ גבוה ושחיקה מוגברת. המחיר צריך להיות נמוך בהתאם' },
  'ליסינג': { kind: 'warn', note: 'רכב ליסינג: נהגים מתחלפים ושימוש אינטנסיבי. בקש היסטוריית טיפולים מלאה' },
  'חברה': { kind: 'warn', note: 'רכב חברה: שימוש מוגבר יחסית לרכב פרטי. ודא טיפולים סדירים' },
}

function Badge({ kind = 'muted', children }) {
  const c = KIND_COLORS[kind] || KIND_COLORS.muted
  return (
    <span style={{ fontSize: 11, color: c, border: '1px solid ' + c, borderRadius: 8, padding: '1px 7px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13.5 }}>
      <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{children}</div>
    </div>
  )
}

function testStatus(tokef) {
  if (!tokef) return null
  const d = new Date(tokef)
  if (Number.isNaN(d.getTime())) return null
  const days = Math.floor((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return { txt: 'פג תוקף', kind: 'danger' }
  if (days <= 30) return { txt: 'פג בעוד ' + days + ' ימים', kind: 'warn' }
  return { txt: 'בתוקף', kind: 'ok' }
}

function heDate(s) {
  if (!s) return 'אין נתון'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s)
  return d.toLocaleDateString('he-IL')
}

export default function CarCheck({ onBack, onPick }) {
  const [plateInput, setPlateInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [rec, setRec] = useState(null)
  const [vkind, setVkind] = useState(null)
  const [spec, setSpec] = useState(null)
  const [catalogCar, setCatalogCar] = useState(null)
  const [searched, setSearched] = useState(false)

  async function findInCatalog(r) {
    const kinuy = String(r.kinuy_mishari || '').trim()
    if (!kinuy || kinuy.length < 2) return null
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
        .eq('kind', 'car')
        .eq('year', r.shnat_yitzur)
        .ilike('name', '%' + kinuy + '%')
        .limit(30)
      const n = normalizeCars(data || [])
      return n.length ? n[0] : null
    } catch {
      return null
    }
  }

  // הצלבה מול קטלוג הדו גלגלי: degem_nm הוא לפעמים שם שיווקי ("NINJA 500")
  // ולפעמים קוד יצרן ("CMM1"). מנסים התאמת שם, ובלעדיה אין הצלבה, שזה
  // מצב תקין. עדיף כלום מאשר דגם שגוי.
  async function findMotoInCatalog(r) {
    const degem = String(r.degem_nm || '').trim()
    if (degem.length < 3 || !/[A-Za-z]/.test(degem)) return null
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
        .eq('kind', 'moto')
        .eq('year', r.shnat_yitzur)
        .ilike('name', '%' + degem + '%')
        .limit(10)
      const n = normalizeMotos(data || [])
      return n.length ? n[0] : null
    } catch {
      return null
    }
  }

  async function check() {
    const plate = normalizePlate(plateInput)
    if (plate == null) { setErr('הזן מספר רישוי תקין, 7 או 8 ספרות'); return }
    setBusy(true); setErr(''); setRec(null); setVkind(null); setSpec(null); setCatalogCar(null); setSearched(false)
    try {
      const { rec: r, vkind: k } = await fetchAnyByPlate(plate)
      setRec(r)
      setVkind(k)
      setSearched(true)
      if (r && k === 'car') {
        const [s, c] = await Promise.all([fetchModelSpec(r), findInCatalog(r)])
        setSpec(s)
        setCatalogCar(c)
      } else if (r && k === 'moto') {
        // למאגר הדו גלגלי אין רשומות WLTP, ולכן רק הצלבה מול הקטלוג
        setCatalogCar(await findMotoInCatalog(r))
      }
    } catch {
      setErr('אין כרגע גישה למאגר משרד התחבורה. שווה לבדוק את החיבור ולנסות שוב')
    }
    setBusy(false)
  }

  const isMoto = vkind === 'moto'
  const own = rec ? OWNERSHIP_INFO[rec.baalut] : null
  const test = rec && !isMoto ? testStatus(rec.tokef_dt) : null
  const title = rec ? (cleanName(rec.tozeret_nm || '') + ' ' + (rec.kinuy_mishari || rec.degem_nm || '')).trim() : ''
  const adsUrl = rec
    ? 'https://www.google.com/search?q=' + encodeURIComponent('יד2 ' + (rec.kinuy_mishari || '') + ' ' + (rec.shnat_yitzur || ''))
    : '#'

  return (
    <div className="page-wrap page-wrap--mid">
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
      <div className="page-title" style={{ marginBottom: 4 }}>🔎 בדיקה לפי מספר רישוי</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
        מצאת מודעה ביד שנייה? מספר הרישוי מחזיר את נתוני האמת מהמאגרים הרשמיים של משרד
        התחבורה, גם לרכב וגם לאופנוע: שנתון, דגם וסוג בעלות. חינם וללא הגבלה.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 12, fontSize: 17, letterSpacing: 1, textAlign: 'center' }}
          inputMode="numeric"
          placeholder="מספר רישוי, למשל 12345678"
          value={plateInput}
          onChange={e => setPlateInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') check() }}
        />
        <button onClick={check} disabled={busy} className="btn-primary" style={{ padding: '8px 18px', fontSize: 15 }}>
          {busy ? 'בודק' : 'בדיקה'}
        </button>
      </div>

      {err && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{err}</p>}

      {searched && !rec && !err && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.6 }}>
          המספר לא נמצא, לא במאגר הרכב הפרטי ולא במאגר הדו גלגלי. זה קורה כשהכלי ירד
          מהכביש, כשהוא רכב כבד, או כשיש טעות הקלדה. שווה לבדוק את המספר שוב.
        </div>
      )}

      {rec && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 10 }}>
            {isMoto ? (rec.sug_rechev_nm || 'דו גלגלי') + ' · ' : (rec.ramat_gimur ? 'רמת גימור ' + rec.ramat_gimur + ' · ' : '')}שנת {rec.shnat_yitzur}
          </div>

          {rec.moed_aliya_lakvish && <Row label="עלה לכביש">{rec.moed_aliya_lakvish}</Row>}
          <Row label="בעלות נוכחית">
            {own ? <Badge kind={own.kind}>{rec.baalut}</Badge> : (rec.baalut || 'אין נתון')}
          </Row>
          {own && own.kind === 'warn' && (
            <div style={{ fontSize: 12, color: 'var(--color-warn)', padding: '6px 0', borderBottom: '1px solid var(--color-border)', lineHeight: 1.5 }}>
              ⚠️ {own.note}
            </div>
          )}
          {own && own.kind === 'ok' && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '6px 0', borderBottom: '1px solid var(--color-border)', lineHeight: 1.5 }}>
              {own.note}
            </div>
          )}
          {isMoto && rec.mkoriut_nm === 'יבוא אישי' && (
            <div style={{ fontSize: 12, color: 'var(--color-warn)', padding: '6px 0', borderBottom: '1px solid var(--color-border)', lineHeight: 1.5 }}>
              ⚠️ יבוא אישי: שווה לוודא זמינות חלפים ושירות אצל היבואן הרשמי לפני קנייה
            </div>
          )}
          {!isMoto && (
            <Row label="תוקף טסט">
              {test && <Badge kind={test.kind}>{test.txt}</Badge>}
              <span>{heDate(rec.tokef_dt)}</span>
            </Row>
          )}
          {!isMoto && <Row label="טסט אחרון">{heDate(rec.mivchan_acharon_dt)}</Row>}
          {!isMoto && <Row label="צבע">{rec.tzeva_rechev || 'אין נתון'}</Row>}
          {isMoto && rec.nefach_manoa > 0 && <Row label="נפח מנוע">{fmt(rec.nefach_manoa)} סמ"ק</Row>}
          {isMoto && rec.hespek > 0 && <Row label="הספק">{fmt(rec.hespek)} כ"ס</Row>}
          {isMoto && rec.mishkal_kolel > 0 && <Row label="משקל כולל">{fmt(rec.mishkal_kolel)} ק"ג</Row>}
          <Row label="דלק">{rec.sug_delek_nm || 'אין נתון'}</Row>
          {rec.ramat_eivzur_betihuty != null && (
            <Row label="רמת אבזור בטיחותי">{rec.ramat_eivzur_betihuty} מתוך 8</Row>
          )}
          {rec.kvutzat_zihum != null && <Row label="קבוצת זיהום">{rec.kvutzat_zihum} מתוך 15</Row>}
          {spec?.koah_sus != null && <Row label="כוח סוס">{fmt(spec.koah_sus)}</Row>}
          {spec?.mispar_kariot_avir != null && <Row label="כריות אוויר">{spec.mispar_kariot_avir}</Row>}
          {spec?.nikud_betihut != null && <Row label="ניקוד בטיחות (יצרן)">{spec.nikud_betihut}</Row>}
          <Row label="מספר שלדה">
            <span style={{ fontSize: 11.5, direction: 'ltr' }}>{rec.misgeret || 'אין נתון'}</span>
          </Row>
          {isMoto && (
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', paddingTop: 8, lineHeight: 1.5 }}>
              במאגר הדו גלגלי של משרד התחבורה אין נתוני תוקף טסט, ולכן הם לא מוצגים כאן
            </div>
          )}

          {catalogCar && catalogCar.market_price > 0 && (
            <div style={{ marginTop: 12, background: 'var(--color-surface-2)', borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 1.55 }}>
              💡 לפי הקטלוג שלנו, השווי המוערך של {catalogCar.name} משנת {catalogCar.year} הוא
              בסביבות <b>{fmt(catalogCar.market_price)} ₪</b>. מחיר מבוקש גבוה משמעותית דורש הסבר טוב,
              ורכב השכרה או ליסינג אמור להיות זול יותר.
              {onPick && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => onPick(catalogCar)} style={{ padding: '5px 10px', fontSize: 12.5 }}>
                    לפרטי הדגם והעלות החודשית
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12, fontSize: 12.5, flexWrap: 'wrap' }}>
            <a href={adsUrl} target="_blank" rel="noreferrer">מודעות לדגם הזה</a>
            <a href={priceListSearchUrl((rec.kinuy_mishari || ''), rec.shnat_yitzur)} target="_blank" rel="noreferrer">מחיר שוק במחירון יד2</a>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            הנתונים ממאגר כלי הרכב של משרד התחבורה (data.gov.il) ומתעדכנים תקופתית.
            הבדיקה אינה תחליף לבדיקת מכון מוסמך לפני קנייה, לבירור מספר בעלים קודמים
            ולבדיקת שעבודים ועיקולים.
          </div>
        </div>
      )}
    </div>
  )
}
