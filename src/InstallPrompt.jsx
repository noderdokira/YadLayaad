// src/InstallPrompt.jsx
// באנר התקנה לטלפון: באנדרואיד/כרום נתפס אירוע beforeinstallprompt ומוצג
// כפתור התקנה אמיתי; באייפון אין אירוע כזה, ולכן מוצגת הנחיה קצרה.
// הבאנר לא מוצג כשהאפליקציה כבר רצה כמותקנת, ונסגר לצמיתות בלחיצת X.
import { useEffect, useState } from 'react'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [showIos, setShowIos] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('install_dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    if (isStandalone()) return
    const onBip = e => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => { setDeferred(null); setShowIos(false) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    if (isIOS()) setShowIos(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden || (!deferred && !showIos)) return null

  function dismiss() {
    try { localStorage.setItem('install_dismissed', '1') } catch { /* לא קריטי */ }
    setHidden(true)
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setDeferred(null)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 12, right: 12, zIndex: 1000,
      maxWidth: 470, margin: '0 auto', direction: 'rtl',
      background: 'var(--color-surface)', border: '1px solid var(--color-primary)',
      borderRadius: 12, boxShadow: 'var(--shadow)', padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, lineHeight: 1.45,
    }}>
      <span style={{ fontSize: 22 }} aria-hidden="true">📲</span>
      <div style={{ flex: 1 }}>
        {deferred
          ? 'אפשר להתקין את יד ליעד כאפליקציה בטלפון, עם אייקון ומסך מלא'
          : <>להתקנה באייפון: כפתור השיתוף בספארי ← <b>הוספה למסך הבית</b></>}
      </div>
      {deferred && (
        <button onClick={install} className="btn-primary" style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
          התקנה
        </button>
      )}
      <button onClick={dismiss} aria-label="סגירת הבאנר" style={{ padding: '4px 9px' }}>✕</button>
    </div>
  )
}
