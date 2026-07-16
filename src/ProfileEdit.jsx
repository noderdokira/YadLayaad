// src/ProfileEdit.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { pushSupported, pushStatus, enablePush, disablePush } from './lib/push'

export default function ProfileEdit({ profile, userId, onDone, onCancel, onRetakeSurvey, onSignOut }) {
  const [license, setLicense] = useState(profile?.license ?? '')
  const [birthYear, setBirthYear] = useState(profile?.birth_year ?? '')
  const [licenseYear, setLicenseYear] = useState(profile?.license_year ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function checkYears() {
    const now = new Date().getFullYear()
    const by = birthYear === '' ? null : Number(birthYear)
    const ly = licenseYear === '' ? null : Number(licenseYear)
    if (by != null && (!Number.isInteger(by) || by < 1920 || by > now)) return 'שנת לידה לא סבירה'
    if (ly != null && (!Number.isInteger(ly) || ly < 1935 || ly > now)) return 'שנת רישיון לא סבירה'
    if (by != null && ly != null && ly - by < 16) return 'שנת הרישיון מוקדמת מדי ביחס לשנת הלידה'
    return ''
  }

  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushErr, setPushErr] = useState('')

  useEffect(() => { pushStatus().then(setPushOn) }, [])

  async function togglePush(on) {
    setPushBusy(true); setPushErr('')
    try {
      if (on) await enablePush()
      else await disablePush()
      setPushOn(on)
    } catch (e) {
      setPushErr(e.message || 'שגיאה בהגדרת ההתראות')
    }
    setPushBusy(false)
  }

  const [forceMotion, setForceMotion] = useState(() => {
    try { return localStorage.getItem('force_motion') === 'on' } catch { return false }
  })

  function toggleMotion(on) {
    setForceMotion(on)
    try { localStorage.setItem('force_motion', on ? 'on' : 'off') } catch { /* לא קריטי */ }
    if (on) document.documentElement.setAttribute('data-motion', 'on')
    else document.documentElement.removeAttribute('data-motion')
  }

  async function save() {
    const problem = checkYears()
    if (problem) { setErr(problem); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('profiles').update({
      license: license || null,
      birth_year: birthYear === '' ? null : Number(birthYear),
      license_year: licenseYear === '' ? null : Number(licenseYear),
    }).eq('id', userId)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onDone()
  }

  const input = { display: 'block', width: '100%', padding: 10, marginBottom: 10 }

  return (
    <div className="page-wrap page-wrap--narrow" style={{ marginTop: 40 }}>
      <div className="page-title" style={{ marginBottom: 4 }}>עריכת פרופיל</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        הנתונים משפיעים על הערכת הביטוח בכל רכב
      </div>
      <input style={input} placeholder="סוג רישיון נהיגה" value={license} onChange={e => setLicense(e.target.value)} />
      <input style={input} placeholder="שנת לידה, למשל 2004" inputMode="numeric" value={birthYear} onChange={e => setBirthYear(e.target.value)} />
      <input style={input} placeholder="שנת הוצאת רישיון, למשל 2022" inputMode="numeric" value={licenseYear} onChange={e => setLicenseYear(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 10 }}>
          {saving ? 'שומר' : 'שמירה'}
        </button>
        <button onClick={onCancel} style={{ padding: 12, borderRadius: 10 }}>ביטול</button>
      </div>

      {onRetakeSurvey && (
        <div style={{ marginTop: 22, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            השתנה משהו בהכנסה, בחיסכון או בהרגלים? אפשר לענות מחדש על שאלון ההיכרות
            והנתונים הכספיים, וכל החישובים יתעדכנו בהתאם.
          </div>
          <button onClick={onRetakeSurvey} style={{ width: '100%', padding: 11, borderRadius: 10, fontWeight: 700 }}>
            מילוי השאלון מחדש
          </button>
        </div>
      )}

      {pushSupported() && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={pushOn} disabled={pushBusy} onChange={e => togglePush(e.target.checked)} style={{ marginTop: 2 }} />
            <span>🔔 תזכורת חודשית בהתראה לטלפון או למחשב, אם עוד לא הפקדת החודש</span>
          </label>
          {pushErr && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{pushErr}</div>}
        </div>
      )}

      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={forceMotion} onChange={e => toggleMotion(e.target.checked)} style={{ marginTop: 2 }} />
        <span>
          אנימציות תמיד פעילות (חזירון, מטבעות ופיצוץ), גם כשהמחשב או הטלפון מוגדרים על "פחות תנועה"
        </span>
      </label>

      {onSignOut && (
        <button onClick={onSignOut} style={{ width: '100%', marginTop: 14, padding: 11, borderRadius: 10 }}>
          התנתקות מהחשבון
        </button>
      )}

      {err && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
