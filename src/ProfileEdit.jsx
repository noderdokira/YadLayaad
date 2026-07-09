// src/ProfileEdit.jsx
import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function ProfileEdit({ profile, userId, onDone, onCancel }) {
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

  const wrap = { maxWidth: 360, margin: '60px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const input = { display: 'block', width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>עריכת פרופיל</div>
      <div style={{ fontSize: 13, color: '#777', marginBottom: 16 }}>הנתונים משפיעים על הערכת הביטוח בכל רכב</div>
      <input style={input} placeholder="סוג רישיון נהיגה" value={license} onChange={e => setLicense(e.target.value)} />
      <input style={input} placeholder="שנת לידה, למשל 2004" inputMode="numeric" value={birthYear} onChange={e => setBirthYear(e.target.value)} />
      <input style={input} placeholder="שנת הוצאת רישיון, למשל 2022" inputMode="numeric" value={licenseYear} onChange={e => setLicenseYear(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'שומר' : 'שמירה'}
        </button>
        <button onClick={onCancel} style={{ padding: 12, borderRadius: 10 }}>ביטול</button>
      </div>
      {err && <p style={{ color: '#c00', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
