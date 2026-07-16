// src/App.jsx
// מעטפת האפליקציה: ניווט תחתון בסגנון אפליקציה בטלפון,
// כותרת עם ניווט עליון במחשב. אותם ארבעה מסכים בשני העולמות.
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth, { UpdatePassword } from './Auth'
import Survey from './Survey'
import Catalog from './Catalog'
import ProfileEdit from './ProfileEdit'
import SavingsHelp from './SavingsHelp'
import InstallPrompt from './InstallPrompt'
import { GoalProgress } from './Goal'

const NAV = [
  { id: 'catalog', ico: '🚗', label: 'קטלוג' },
  { id: 'goal', ico: '💵', label: 'היעד שלי' },
  { id: 'savings', ico: '💡', label: 'חיסכון' },
  { id: 'profile', ico: '👤', label: 'פרופיל' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('catalog')
  const [retaking, setRetaking] = useState(false)
  const [recovery, setRecovery] = useState(false)

  // העדפת אנימציות שמורה: מפעילה תנועה גם כשהמערכת מבקשת פחות
  useEffect(() => {
    try {
      if (localStorage.getItem('force_motion') === 'on') {
        document.documentElement.setAttribute('data-motion', 'on')
      }
    } catch { /* לא קריטי */ }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // כניסה דרך קישור איפוס סיסמה מהמייל
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    setProfile(data || null)
    setLoading(false)
  }

  useEffect(() => {
    if (session?.user) loadProfile(session.user.id)
    else { setProfile(null); setLoading(false) }
  }, [session])

  if (!session) return <><Auth /><InstallPrompt /></>
  if (recovery) return <UpdatePassword onDone={() => setRecovery(false)} />
  if (loading) return <div className="page-wrap">טוען</div>
  if (!profile || profile.sigma == null) {
    return <Survey userId={session.user.id} onDone={() => loadProfile(session.user.id)} />
  }
  if (retaking) {
    return (
      <Survey
        userId={session.user.id}
        profile={profile}
        onCancel={() => setRetaking(false)}
        onDone={() => { setRetaking(false); setScreen('catalog'); loadProfile(session.user.id) }}
      />
    )
  }

  const goCatalog = () => setScreen('catalog')

  let content
  if (screen === 'savings') {
    content = <SavingsHelp profile={profile} onBack={goCatalog} />
  } else if (screen === 'goal') {
    content = <GoalProgress profile={profile} onBack={goCatalog} asTab />
  } else if (screen === 'profile') {
    content = (
      <ProfileEdit
        profile={profile}
        userId={session.user.id}
        onRetakeSurvey={() => setRetaking(true)}
        onDone={async () => { await loadProfile(session.user.id); setScreen('catalog') }}
        onCancel={goCatalog}
        onSignOut={() => supabase.auth.signOut()}
      />
    )
  } else {
    content = <Catalog profile={profile} onProfileSaved={() => loadProfile(session.user.id)} />
  }

  return (
    <div className="app-shell">
      {/* פס עליון דק בטלפון: רק שם האפליקציה */}
      <div className="mobile-topbar">
        <span className="wordmark">יד ליעד 🚗</span>
      </div>

      {/* כותרת מלאה במחשב: שם + ניווט + התנתקות */}
      <header className="app-header">
        <span className="wordmark">יד ליעד 🚗</span>
        <nav aria-label="ניווט ראשי">
          {NAV.map(n => (
            <button key={n.id} aria-current={screen === n.id || undefined} onClick={() => setScreen(n.id)}>
              {n.ico} {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px' }}>התנתקות</button>
      </header>

      {content}

      {/* ניווט תחתון בטלפון */}
      <nav className="bottom-nav" aria-label="ניווט ראשי">
        {NAV.map(n => (
          <button key={n.id} aria-current={screen === n.id || undefined} onClick={() => setScreen(n.id)}>
            <span className="ico" aria-hidden="true">{n.ico}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <InstallPrompt />
    </div>
  )
}
