// src/lib/push.js
// ניהול מנוי התראות דחיפה: הרשאה, רישום מול הדפדפן, ושמירת המנוי בסופבייס.
// המפתח הציבורי (VAPID) נועד להיות חשוף; המפתח הפרטי חי רק בצד השרת.
import { supabase } from './supabase'

export const VAPID_PUBLIC_KEY = 'BIieQ3kWyox1xhR65ldkm9jkGNAsrJOO60vMozDR3N34Y9qK48HzKwU3YST1El6IEcDBGFm06xEINtxIV-FWlbQ'

function b64ToU8(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function pushStatus() {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub && Notification.permission === 'granted'
  } catch {
    return false
  }
}

export async function enablePush() {
  if (!pushSupported()) {
    throw new Error('הדפדפן הזה לא תומך בהתראות. באייפון: קודם התקן את האפליקציה למסך הבית ופתח אותה משם')
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('כדי לקבל תזכורות צריך לאשר התראות בחלון שהדפדפן מציג')
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToU8(VAPID_PUBLIC_KEY),
  })
  const j = sub.toJSON()
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) throw new Error('צריך להיות מחוברים')
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: j.endpoint,
    user_id: u.user.id,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
  })
  if (error) {
    throw new Error(error.message.includes('relation') || error.message.includes('does not exist')
      ? 'קטע ה־SQL של ההתראות עוד לא הורץ בסופבייס'
      : error.message)
  }
}

export async function disablePush() {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    try { await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint) } catch { /* לא קריטי */ }
    await sub.unsubscribe()
  }
}
