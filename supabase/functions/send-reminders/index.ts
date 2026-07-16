// Supabase Edge Function · תזכורת הפקדה חודשית בדחיפה
// מתוזמנת לתחילת החודש. שולחת רק למשתמש שיש לו יעד פעיל, מנוי להתראות,
// אפס הפקדות החודש, והיעד עוד לא הושלם. מנקה מנויים מתים.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const APP_URL = 'https://noderdokira.github.io/YadLayaad/'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  webpush.setVapidDetails(
    'mailto:alon.bar456@gmail.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
  if (error) return new Response(error.message, { status: 500 })

  const byUser = new Map<string, typeof subs>()
  for (const s of subs ?? []) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
    byUser.get(s.user_id)!.push(s)
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  let sent = 0, removed = 0

  for (const [userId, userSubs] of byUser) {
    const { data: prof } = await supabase.from('profiles').select('goal').eq('id', userId).maybeSingle()
    const goal = prof?.goal
    if (!goal || !(goal.target > 0)) continue

    // הפקדות החודש
    const { count: monthCount } = await supabase
      .from('goal_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart)
    if ((monthCount ?? 0) > 0) continue

    // האם היעד כבר הושלם
    let dep = supabase.from('goal_deposits').select('amount').eq('user_id', userId)
    if (goal.started_at) dep = dep.gte('created_at', goal.started_at)
    const { data: deps } = await dep
    const total = (deps ?? []).reduce((s: number, d: { amount: number }) => s + Number(d.amount), 0)
    if (total >= goal.target) continue

    const payload = JSON.stringify({
      title: 'יד ליעד 🐷',
      body: 'עוד לא הפקדת החודש! שמירה על הרצף שווה יותר מגובה הסכום.',
      url: APP_URL,
    })

    for (const s of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          removed++
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent, removed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
