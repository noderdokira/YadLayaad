// מטפל ההתראות של יד ליעד: מוזרק ל־service worker הראשי דרך importScripts.
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* גוף לא תקין */ }
  event.waitUntil(
    self.registration.showNotification(data.title || 'יד ליעד 🐷', {
      body: data.body || 'תזכורת: עוד לא הפקדת החודש. הרצף שווה יותר מהסכום!',
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: data.url || self.registration.scope },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus()
      }
      return clients.openWindow(url)
    })
  )
})
