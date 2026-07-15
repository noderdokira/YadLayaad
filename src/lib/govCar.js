// src/lib/govCar.js
// גישה למאגרי הרכב הפתוחים של משרד התחבורה ב־data.gov.il (CKAN datastore).
// המאגר ציבורי, ללא מפתח API, ועם CORS פתוח, ולכן אפשר לקרוא ישירות מהדפדפן.
// אומת ביולי 2026: המאגר הפעיל מכיל כ־4.15 מיליון כלי רכב.

const API = 'https://data.gov.il/api/3/action/datastore_search'

// כלי רכב פרטיים ומסחריים פעילים (רשומה לכל לוחית רישוי)
export const REGISTRY_RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
// נתוני דגם מורחבים (WLTP): בטיחות, כוח סוס, כריות אוויר ועוד
export const WLTP_RESOURCE = '142afde2-6228-49f9-8a29-9b6c3a0cbe40'

async function search(resource, filters, limit = 1) {
  const url = API
    + '?resource_id=' + resource
    + '&filters=' + encodeURIComponent(JSON.stringify(filters))
    + '&limit=' + limit
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const json = await res.json()
  if (!json.success) throw new Error('השאילתה נכשלה')
  return json.result?.records || []
}

// מנרמל קלט של מספר רישוי: מסיר מקפים ורווחים, בודק אורך סביר
export function normalizePlate(input) {
  const digits = String(input || '').replace(/\D/g, '')
  if (digits.length < 5 || digits.length > 8) return null
  return Number(digits)
}

export async function fetchByPlate(plate) {
  const recs = await search(REGISTRY_RESOURCE, { mispar_rechev: plate }, 1)
  return recs[0] || null
}

// נתוני דגם מורחבים לפי הרשומה מהמאגר. לא לכל דגם יש רשומת WLTP,
// בעיקר בדגמים ישנים, ולכן כישלון כאן שקט ולא מפיל את הבדיקה.
export async function fetchModelSpec(rec) {
  if (!rec || rec.tozeret_cd == null || rec.degem_cd == null) return null
  try {
    const recs = await search(WLTP_RESOURCE, {
      tozeret_cd: rec.tozeret_cd,
      degem_cd: rec.degem_cd,
      shnat_yitzur: rec.shnat_yitzur,
    }, 1)
    return recs[0] || null
  } catch {
    return null
  }
}
