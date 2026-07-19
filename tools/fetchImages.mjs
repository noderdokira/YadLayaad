// tools/fetchImages.mjs
// מייצר מפת תמונות סטטית לכל דגם ושנתון בקטלוג, מוויקישיתוף.
//
// למה סקריפט ולא חיפוש בזמן ריצה: היום כל דפדפן שולח מאות בקשות לוויקימדיה
// בטעינת הקטלוג, חוטף הגבלת קצב, ומקבל כרטיסים בלי תמונה. מפה סטטית פותרת
// את זה לגמרי: אפס קריאות רשת אצל המשתמש, ותמונה שמופיעה מיד.
//
// הרצה מקומית:  node tools/fetchImages.mjs
// ב־CI זה רץ שבועית דרך .github/workflows/images.yml
//
// דרוש: SUPABASE_URL ו־SUPABASE_ANON_KEY בסביבה.

import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const OUT = 'src/lib/imageMap.json'

// ויקימדיה דורשת User-Agent מזהה לשימוש ב־API. בלעדיו הבקשות נחסמות.
const UA = 'YadLayaad/1.0 (https://github.com/noderdokira/YadLayaad) image-map-builder'

const BRANDS = {
  'טויוטה': 'Toyota', 'קיה': 'Kia', 'יונדאי': 'Hyundai', 'שברולט': 'Chevrolet',
  'סיטרואן': 'Citroen', 'מאזדה': 'Mazda', 'סקודה': 'Skoda', 'סוזוקי': 'Suzuki',
  'מרוטי-סוזוקי': 'Maruti Suzuki', 'ניסאן': 'Nissan', 'פורד': 'Ford',
  'פולקסווגן': 'Volkswagen', 'רנו': 'Renault', 'פיגו': 'Peugeot', "פיג'ו": 'Peugeot',
  'הונדה': 'Honda', 'מיצובישי': 'Mitsubishi', 'סובארו': 'Subaru', 'אאודי': 'Audi',
  'במוו': 'BMW', 'ב.מ.וו': 'BMW', 'מרצדס': 'Mercedes-Benz', 'ליפמוטור': 'Leapmotor',
  'סיאט': 'Seat', 'סאט': 'Seat', 'דאציה': 'Dacia', "דאצ'יה": 'Dacia', 'אופל': 'Opel',
  'פיאט': 'Fiat', 'וולוו': 'Volvo', 'טסלה': 'Tesla', 'צרי': 'Chery', "צ'רי": 'Chery',
  'גילי': 'Geely', "ג'ילי": 'Geely', 'לקסוס': 'Lexus', 'מיני': 'Mini',
  'סנטרו': 'Cenntro', 'דונגפנג': 'Dongfeng', "ג'אק": 'JAC', 'גאק': 'JAC',
  'ביואיד': 'BYD', "אם ג'י": 'MG', 'אם גי': 'MG', 'מ.ג': 'MG', 'דאיון': 'Dayun',
  'לנדרובר': 'Land Rover', 'רובר': 'Land Rover', "ג'יפ": 'Jeep', 'גיפ': 'Jeep',
  'דייהטסו': 'Daihatsu', 'סאנגיונג': 'SsangYong', 'איסוזו': 'Isuzu', 'סמארט': 'Smart',
  'אלפא': 'Alfa Romeo', "ג'אקו": 'Jaecoo', 'אומודה': 'Omoda', 'דיפאל': 'Deepal',
  'אורה': 'Ora', 'איון': 'Aion', 'גי.אי.סי': 'GAC', 'גיי.איי.סי': 'GAC',
  'קיי גי מוביליט': 'KGM',
  // דו גלגלי
  'וספה': 'Vespa', 'קוואסאקי': 'Kawasaki', 'רויאל אנפילד': 'Royal Enfield',
  'סאן יאנג': 'SYM', 'ימאהה': 'Yamaha',
}

// שנתון והספק אינם מזהי דגם ולכן יוצאים מהשאילתה
const stripQualifiers = m => m.toUpperCase()
  .replace(/\b20\d\d\b/g, '').replace(/\b\d+\s?KW\b/g, '').replace(/\s+/g, ' ').trim()

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url)
  return res.json()
}

// כללי ההתאמה, זהים לאלה שבאפליקציה:
//   שם היצרן חייב להופיע בשם הקובץ
//   כל מילות הדגם חייבות להופיע
//   כל מספר בשם הדגם חייב להופיע, אחרת מקבלים אלימינייטור 125 במקום 500
//   מבין המתאימים בוחרים את השנתון הקרוב ביותר, ואז קובץ שמתחיל בשם היצרן
async function findImage(brandEn, model, year) {
  if (!brandEn || !model) return null
  const core = stripQualifiers(model)
  if (!core) return null
  const api = 'https://commons.wikimedia.org/w/api.php'
    + '?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=14'
    + '&gsrsearch=' + encodeURIComponent(brandEn + ' ' + core)
    + '&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=480'
  const json = await getJson(api)
  const pages = Object.values(json?.query?.pages || {}).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))

  const B = brandEn.toUpperCase()
  const tokens = core.split(/\s+/).filter(Boolean)
  const nums = core.match(/\d+/g) || []
  const hits = []
  for (const p of pages) {
    const title = (p.title || '').replace(/^File:/, '')
    const T = title.toUpperCase().replace(/[_\-()]/g, ' ')
    const ii = p.imageinfo?.[0]
    if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime || '')) continue
    if (!T.includes(B)) continue
    if (!tokens.every(t => T.includes(t.replace(/[-()]/g, ' ').trim()))) continue
    if (!nums.every(n => new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(T))) continue
    const fy = (title.match(/\b(20\d\d)\b/) || [])[1]
    hits.push({
      url: ii.thumburl,
      title,
      gap: fy && year ? Math.abs(Number(fy) - year) : 6,
      lead: T.trimStart().startsWith(B) ? 0 : 1,
    })
  }
  hits.sort((a, b) => a.gap - b.gap || a.lead - b.lead)
  return hits[0] || null
}

function split(name) {
  const he = Object.keys(BRANDS).sort((a, b) => b.length - a.length).find(k => name.startsWith(k))
  if (!he) return null
  const rest = name.slice(he.length)
  const latin = (rest.match(/[A-Za-z0-9][A-Za-z0-9 .\-]*/g) || []).join(' ').trim()
  return latin ? { brandEn: BRANDS[he], model: latin, brandHe: he } : null
}

async function loadCatalog() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('חסרים SUPABASE_URL או SUPABASE_ANON_KEY בסביבה')
  }
  const rows = []
  for (const kind of ['car', 'moto']) {
    let from = 0
    for (;;) {
      const url = SUPABASE_URL + '/rest/v1/products?select=name,year,kind&kind=eq.' + kind
        + '&order=name.asc&limit=1000&offset=' + from
      const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } })
      if (!res.ok) throw new Error('Supabase HTTP ' + res.status)
      const batch = await res.json()
      rows.push(...batch)
      if (batch.length < 1000) break
      from += batch.length
    }
  }
  // דגם ושנתון ייחודיים בלבד
  const seen = new Set()
  return rows.filter(r => {
    const k = r.kind + '|' + r.name + '|' + r.year
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ארבע בקשות במקביל. יותר מזה וויקימדיה מחזירה 429.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    for (;;) {
      const idx = i++
      if (idx >= items.length) return
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}

const catalog = await loadCatalog()
console.log('שורות בקטלוג:', catalog.length)

let hit = 0, miss = 0, reused = 0, failed = 0
const missing = []
const map = {}

await mapLimit(catalog, 4, async (row) => {
  const key = (row.kind === 'moto' ? 'm|' : '') + row.name + '|' + row.year
  const parts = split(row.name)
  if (!parts) { miss++; missing.push(row.name + ' (יצרן לא מזוהה)'); return }
  try {
    const r = await findImage(parts.brandEn, parts.model, row.year)
    if (r) { map[key] = r.url; hit++ }
    else { miss++; missing.push(row.name + ' ' + row.year) }
  } catch (e) {
    // כשל רשת: שומרים את הערך הקודם אם היה, ולא מוחקים תמונה תקינה
    failed++
    if (prev[key]) { map[key] = prev[key]; reused++ }
  }
})

const sorted = Object.fromEntries(Object.keys(map).sort().map(k => [k, map[k]]))
writeFileSync(OUT, JSON.stringify(sorted, null, 0) + '\n')

const uniqMissing = [...new Set(missing.map(m => m.replace(/ \d{4}$/, '')))].sort()
writeFileSync('tools/missing-images.txt',
  'דגמים בלי תמונה, נוצר ' + new Date().toISOString().slice(0, 10) + '\n\n' + uniqMissing.join('\n') + '\n')

console.log('נמצאו:', hit, '· חסרים:', miss, '· כשלי רשת:', failed, '(מתוכם שוחזרו מהמפה הקודמת:', reused + ')')
console.log('דגמים ייחודיים בלי תמונה:', uniqMissing.length)
console.log('נכתב:', OUT)
