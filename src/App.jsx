// src/App.jsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import Survey from './Survey'
import Catalog from './Catalog'
import ProfileEdit from './ProfileEdit'

const STYLE_LABEL = { automation: 'אוטומציה', gamification: 'גיימיפיקציה', deadline: 'דדליין' }

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
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

  const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }

  if (!session) return <Auth />
  if (loading) return <div style={wrap}>טוען</div>
  if (!profile || profile.sigma == null) {
    return <Survey userId={session.user.id} onDone={() => loadProfile(session.user.id)} />
  }
  if (editing) {
    return (
      <ProfileEdit
        profile={profile}
        userId={session.user.id}
        onDone={() => { setEditing(false); loadProfile(session.user.id) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const pct = Math.round(profile.sigma * 100)
  return (
    <div>
      <div style={{ ...wrap, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: '#555' }}>
          צנע {pct}% · {STYLE_LABEL[profile.motivation_style] || profile.motivation_style}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing(true)} style={{ padding: '6px 10px' }}>עריכת פרופיל</button>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 10px' }}>התנתקות</button>
        </div>
      </div>
      <Catalog profile={profile} onProfileSaved={() => loadProfile(session.user.id)} />
    </div>
  )
}
