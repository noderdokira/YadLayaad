// tools/fetchImages.mjs
// מייצר מפת תמונות סטטית לכל דגם ושנתון בקטלוג, מוויקישיתוף.
//
// למה סקריפט ולא חיפוש בזמן ריצה: בלי מפה סטטית כל דפדפן שולח מאות בקשות
// לוויקימדיה בטעינת הקטלוג, חוטף הגבלת קצב, ומקבל כרטיסים בלי תמונה.
//
// הרצה מקומית:  node tools/fetchImages.mjs
// ב CI זה רץ שבועית דרך .github/workflows/images.yml
//
// דרוש: SUPABASE_URL ו SUPABASE_ANON_KEY בסביבה.
//
// ============================================================================
// למה הסקריפט נראה ככה, 20.7.2026
// ============================================================================
// הריצה הראשונה החזירה 143 תמונות, כולן אאודי, ואפס אופנועים. הסיבה:
// הקטלוג הוא 44,602 שורות רכב ו 2,927 דגמים, כלומר כ 8,800 צירופי דגם ושנתון.
// הסקריפט ירה 8,800 חיפושים ברצף, ויקימדיה חסמה אחרי כ 300, וכל השאר נפל
// לתוך catch שהגדיל מונה ולא רשם כלום. 1,999 דגמים לא הותירו שום עקבה,
// והאופנועים, שישבו בסוף התור, לא נגעו ברשת בכלל.
//
// ארבע מסקנות שמעצבות את הקובץ הזה:
//   1. חיפוש אחד לדגם, לא לדגם ושנתון. בקשה אחת מחזירה 14 מועמדים, ומהם
//      נבחר לכל שנתון את הקובץ הקרוב ביותר. פי שלושה פחות בקשות.
//   2. תקציב לריצה ומצב שנשמר בין ריצות. הסוכן השבועי מתקדם במצטבר.
//   3. אופנועים ראשונים בתור. 93 דגמים, הערך הגבוה ביותר.
//   4. שקט הוא באג. הריצה נופלת אם נחסמנו, כדי שזה ייראה.
// ============================================================================

import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const OUT   = 'src/lib/imageMap.json'
const STATE = 'tools/imageState.json'
const MISS  = 'tools/missing-images.txt'

// כמה דגמים לחפש בריצה אחת. הקטלוג גדול מכדי לכסות אותו בבת אחת,
// והמצב נשמר, ולכן כל ריצה שבועית מתקדמת עוד קצת.
const BUDGET = Number(process.env.IMAGE_BUDGET || 600)

// כמה זמן לסמוך על תוצאה קודמת לפני חיפוש חוזר.
const TTL_HIT  = 180   // דגם שיש לו תמונה
const TTL_NONE = 60    // דגם שחיפשנו ולא נמצא. ויקישיתוף מתעדכן, שווה לנסות שוב

// גרסת לוגיקת החיפוש. כשמשפרים את החיפוש עצמו, "אין תמונה" שנקבע בגרסה
// ישנה הוא ממצא מיושן וצריך להיבדק מחדש, בלי לחכות 60 יום. תמונה שנמצאה
// נשארת תמונה. להעלות את המספר בכל שינוי בכללי ההתאמה.
const SEARCH_VERSION = 2

// קצב. ויקימדיה חסמה אותנו בארבע בקשות במקביל בלי השהיה.
// ניתן לכוונון מהסביבה כדי לאפשר ריצת השלמה ידנית איטית או מהירה יותר.
const CONCURRENCY = Number(process.env.IMAGE_CONCURRENCY || 2)
const MIN_GAP_MS  = Number(process.env.IMAGE_GAP_MS ?? 300)   // כ 3 בקשות לשנייה
const MAX_RETRY   = 3
const ABORT_AFTER = 5            // כשלי קצב רצופים שאחריהם עוצרים

// ויקימדיה דורשת User-Agent מזהה לשימוש ב API. בלעדיו הבקשות נחסמות.
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
  // ---- הרחבה 20.7.2026 ----
  // נגזר מרשימת "יצרן לא מזוהה" האמיתית של הריצה הראשונה: 915 דגמים נפלו
  // על היצרנים האלה ועל שמות מדינה דבוקים. נמדד: 839 מתוכם חוזרים לזיהוי.
  'ב מ וו': 'BMW', 'בי ווי די': 'BYD', 'פורשה': 'Porsche', 'קרייזלר': 'Chrysler',
  'מזדה': 'Mazda', 'אודי': 'Audi', 'וולבו': 'Volvo', 'פרארי': 'Ferrari',
  'קאדילאק': 'Cadillac', 'מקסוס': 'Maxus', 'מזארטי': 'Maserati', 'בנטלי': 'Bentley',
  'אסטון מרטין': 'Aston Martin', 'קופרה': 'Cupra', 'ניאו': 'NIO', 'יגואר': 'Jaguar',
  "דודג'": 'Dodge', 'דודג': 'Dodge', "ג'י.אמ.סי": 'GMC', 'לינק אנד קו': 'Lynk & Co',
  'רולס-רויס': 'Rolls-Royce', 'רולס רויס': 'Rolls-Royce', 'ארקפוקס': 'Arcfox',
  'למבורגיני': 'Lamborghini', 'באייק': 'BAIC', 'די.אס': 'DS', 'פוטון': 'Foton',
  'סרס': 'Seres', 'לנסיה': 'Lancia', 'אינפיניטי': 'Infiniti', 'פולסטאר': 'Polestar',
  'פולסטר': 'Polestar', 'הבל': 'Haval', 'האבל': 'Haval', 'גרייט וול': 'Great Wall',
  'טאטא': 'Tata', 'לוטוס': 'Lotus', 'מקלארן': 'McLaren', 'אלפין': 'Alpine',
  'אברת': 'Abarth', 'רם': 'Ram', 'לינקולן': 'Lincoln', 'ביואיק': 'Buick',
}
const BRAND_KEYS = Object.keys(BRANDS).sort((a, b) => b.length - a.length)

// שמות היצרן במאגר משרד התחבורה בנויים "יצרן מדינה" ("פורשה גרמניה",
// "אודי מכסיקו"). המדינה איננה חלק משם הדגם ונגזרת לפני החיפוש.
const COUNTRIES = new Set(['גרמניה', 'ארה"ב', 'ארהב', 'ארצות', 'הברית', 'מכסיקו', 'מקסיקו',
  'יפן', 'בלגיה', 'שוודיה', 'שבדיה', 'סין', 'איטליה', 'סלובקיה', 'בריטניה', 'אנגליה',
  'קנדה', 'ספרד', 'צרפת', 'אוסטריה', 'הונגריה', 'קוריאה', 'דרום', 'טורקיה', 'צכיה',
  "צ'כיה", 'פולין', 'הודו', 'תאילנד', 'רומניה', 'מרוקו', 'ברזיל', 'הולנד', 'סלובניה',
  'אוזבקיסטן', 'רוסיה', 'אינדונזיה', 'מלזיה', 'טיוואן', 'טייוואן', 'ויאטנם', 'וייטנאם',
  'פורטוגל', 'שוויץ', 'שווייץ', 'אירלנד', 'פינלנד', 'ארגנטינה', 'אוסטרליה', 'סינגפור'])

const sleep = ms => new Promise(r => setTimeout(r, ms))
const today = () => new Date().toISOString().slice(0, 10)
const daysSince = iso => {
  const t = Date.parse(iso || '')
  return Number.isFinite(t) ? (Date.now() - t) / 86400000 : Infinity
}

// ---------------------------------------------------------------------------
// שער קצב גלובלי. שומר מרווח מזערי בין תחילות בקשות, גם כשיש כמה עובדים.
// ---------------------------------------------------------------------------
let nextSlot = 0
async function pace() {
  const now = Date.now()
  const at = Math.max(now, nextSlot)
  nextSlot = at + MIN_GAP_MS
  if (at > now) await sleep(at - now)
}

class RateLimited extends Error {}

let blocked = 0          // כמה פעמים ויקימדיה החזירה 429 או 5xx
let consecutive = 0      // כשלי קצב רצופים
let aborted = false

async function wikiJson(url) {
  for (let attempt = 1; ; attempt++) {
    await pace()
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    } catch (e) {
      if (attempt >= MAX_RETRY) throw e
      await sleep(1000 * 2 ** attempt)
      continue
    }
    if (res.ok) { consecutive = 0; return res.json() }

    const throttled = res.status === 429 || res.status >= 500
    if (throttled) {
      blocked++
      if (attempt < MAX_RETRY) {
        const ra = Number(res.headers.get('retry-after'))
        await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(30000, 1000 * 2 ** attempt))
        continue
      }
      throw new RateLimited('HTTP ' + res.status)
    }
    throw new Error('HTTP ' + res.status + ' ' + url)
  }
}

// שנתון והספק אינם מזהי דגם ולכן יוצאים מהשאילתה
const stripQualifiers = m => m.toUpperCase()
  .replace(/\b20\d\d\b/g, '').replace(/\b\d+\s?KW\b/g, '').replace(/\s+/g, ' ').trim()

// ריכוך לניסיון שני: קודי גימור, מנוע והנעה שכמעט אף פעם לא מופיעים בשמות
// קבצים בוויקישיתוף. "CIVIC 5D 1.0" נכשל במעבר הראשון כי אין קובץ עם
// "5D" ו"1.0" בשם, אבל "CIVIC" לבדו מחזיר את התמונה הנכונה. מספרי דגם
// אמיתיים (500, 125, X5) נשארים, כדי לא לקבל אלימינייטור 125 במקום 500.
const softenModel = core => core
  .replace(/\b\d\.\d\b/g, '')                       // נפח מנוע: 1.0, 1.5, 2.0
  .replace(/\b\d{2}[DIE]\b/g, '')                   // קודי מנוע: 25D, 40I, 45E
  .replace(/\b[3-5]D\b/g, '')                       // מרכב: 3D, 4D, 5D
  .replace(/\b(XDRIVE|SDRIVE|4X4|4WD|AWD|TSI|TFSIE?|TDI|DSG|CRDI|DCI|HDI|MHEV|GDI|EHYBRID|PHEV|SB|HB)\b/g, '')
  .replace(/\s+/g, ' ').trim()

// חיפוש אחד מול ויקישיתוף, עם כללי ההתאמה:
//   שם היצרן חייב להופיע בשם הקובץ
//   כל מילות הדגם חייבות להופיע
//   כל מספר בשם הדגם חייב להופיע, אחרת מקבלים אלימינייטור 125 במקום 500
async function searchOnce(brandEn, core) {
  const api = 'https://commons.wikimedia.org/w/api.php'
    + '?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=14'
    + '&gsrsearch=' + encodeURIComponent(brandEn + ' ' + core)
    + '&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=480'
  const json = await wikiJson(api)
  const pages = Object.values(json?.query?.pages || {}).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))

  const B = brandEn.toUpperCase()
  const tokens = core.split(/\s+/).filter(Boolean)
  const nums = core.match(/\d+/g) || []
  const out = []
  for (const p of pages) {
    const title = (p.title || '').replace(/^File:/, '')
    const T = title.toUpperCase().replace(/[_\-()]/g, ' ')
    const ii = p.imageinfo?.[0]
    if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime || '')) continue
    if (!T.includes(B)) continue
    if (!tokens.every(t => T.includes(t.replace(/[-()]/g, ' ').trim()))) continue
    if (!nums.every(n => new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(T))) continue
    out.push({
      url: ii.thumburl,
      fileYear: Number((title.match(/\b(20\d\d)\b/) || [])[1]) || null,
      lead: T.trimStart().startsWith(B) ? 0 : 1,
    })
  }
  return out
}

// מחזיר את כל המועמדים. בחירת השנתון נעשית אחר כך, בלי בקשה נוספת.
// שני מעברים: קודם השם המלא, ואם אין כלום, גרסה מרוככת בלי קודי גימור.
// המעבר השני עולה בקשה נוספת, ולכן הוא רק כשהראשון חוזר ריק.
async function findCandidates(brandEn, model) {
  const core = stripQualifiers(model)
  if (!brandEn || !core) return []
  const first = await searchOnce(brandEn, core)
  if (first.length) return first
  const soft = softenModel(core)
  if (!soft || soft === core) return []
  return searchOnce(brandEn, soft)
}

// מתוך מועמדים של דגם אחד, הקובץ שהכי קרוב לשנתון המבוקש
function pickForYear(cands, year) {
  if (!cands.length) return null
  return [...cands].sort((a, b) => {
    const ga = a.fileYear && year ? Math.abs(a.fileYear - year) : 6
    const gb = b.fileYear && year ? Math.abs(b.fileYear - year) : 6
    return ga - gb || a.lead - b.lead
  })[0]
}

function split(name) {
  const he = BRAND_KEYS.find(k => name.startsWith(k))
  if (!he) return null
  let rest = name.slice(he.length).trim()
  // גזירת שם המדינה, עד שתי מילים ("דרום קוריאה", "ארצות הברית").
  // ההשוואה בלי גרשיים, כדי ש'ארה"ב' ייתפס גם כשהוא כתוב 'ארהב'
  for (let i = 0; i < 2; i++) {
    const w = rest.split(/\s+/)[0]
    if (w && (COUNTRIES.has(w) || COUNTRIES.has(w.replace(/["']/g, '')))) rest = rest.slice(w.length).trim()
    else break
  }
  const latin = (rest.match(/[A-Za-z0-9][A-Za-z0-9 .\-]*/g) || []).join(' ').trim()
  return latin ? { brandEn: BRANDS[he], model: latin } : null
}

async function loadCatalog() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('חסרים SUPABASE_URL או SUPABASE_ANON_KEY בסביבה')
  }
  const perKind = {}
  const rows = []
  for (const kind of ['car', 'moto']) {
    let from = 0
    for (;;) {
      // הדפדוף ממויין לפי name ואז year ואז id. id הוא ייחודי, ובלעדיו
      // OFFSET מעל 44,602 שורות עם שמות חוזרים מדלג ומכפיל שורות.
      const url = SUPABASE_URL + '/rest/v1/products?select=name,year,kind&kind=eq.' + kind
        + '&order=name.asc,year.asc,id.asc&limit=1000&offset=' + from
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
      })
      if (!res.ok) throw new Error('Supabase HTTP ' + res.status + ' עבור kind=' + kind)
      const batch = await res.json()
      rows.push(...batch)
      if (batch.length < 1000) break
      from += batch.length
    }
    perKind[kind] = rows.filter(r => r.kind === kind).length
    // משמר: סוג שמחזיר אפס שורות הוא תמיד תקלה, לא מצב תקין
    if (!perKind[kind]) throw new Error('הקטלוג החזיר אפס שורות עבור kind=' + kind)
  }
  return { rows, perKind }
}

// ---------------------------------------------------------------------------

const prev  = existsSync(OUT)   ? JSON.parse(readFileSync(OUT, 'utf8'))   : {}
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {}

const { rows, perKind } = await loadCatalog()
console.log('שורות בקטלוג: רכב', perKind.car, '· דו גלגלי', perKind.moto)

// קיבוץ לפי דגם. לכל דגם רשימת השנתונים שלו, וחיפוש אחד בלבד.
const byModel = new Map()
for (const r of rows) {
  const id = (r.kind === 'moto' ? 'm|' : 'c|') + r.name
  let e = byModel.get(id)
  if (!e) byModel.set(id, e = { kind: r.kind, name: r.name, years: new Set() })
  e.years.add(r.year)
}
console.log('דגמים ייחודיים: רכב',
  [...byModel.values()].filter(e => e.kind === 'car').length, '· דו גלגלי',
  [...byModel.values()].filter(e => e.kind === 'moto').length)

// אופנועים ראשונים. 93 דגמים בלבד, וברשימה משותפת הם תמיד בסוף.
const all = [...byModel.entries()].sort((a, b) => {
  if (a[1].kind !== b[1].kind) return a[1].kind === 'moto' ? -1 : 1
  return a[1].name.localeCompare(b[1].name, 'he')
})

const map = { ...prev }        // אף פעם לא מאבדים תמונה שכבר יש
const unknownBrand = []
const queue = []
let fresh = 0

for (const [id, e] of all) {
  const parts = split(e.name)
  if (!parts) { unknownBrand.push(e.name); continue }
  const st = state[id]
  const ttl = st?.r === 'hit' ? TTL_HIT : TTL_NONE
  // "אין תמונה" מגרסת חיפוש ישנה נבדק מחדש מיד. "יש תמונה" תקף תמיד
  const stale = st && st.r !== 'hit' && (st.v ?? 1) < SEARCH_VERSION
  if (st && !stale && daysSince(st.t) < ttl) { fresh++; continue }
  queue.push({ id, ...e, ...parts })
}

const work = queue.slice(0, BUDGET)
console.log('בתוקף מריצה קודמת:', fresh,
  '· יצרן לא מזוהה:', unknownBrand.length,
  '· ממתינים לחיפוש:', queue.length,
  '· נבדקים בריצה הזו:', work.length)

let hit = 0, none = 0, errors = 0, attempted = 0

let i = 0
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (;;) {
    if (aborted) return
    const item = work[i++]
    if (!item) return
    attempted++
    try {
      const cands = await findCandidates(item.brandEn, item.model)
      if (cands.length) {
        for (const y of item.years) {
          const best = pickForYear(cands, y)
          if (best) map[(item.kind === 'moto' ? 'm|' : '') + item.name + '|' + y] = best.url
        }
        hit++
        state[item.id] = { r: 'hit', t: today(), v: SEARCH_VERSION }
      } else {
        none++
        state[item.id] = { r: 'none', t: today(), v: SEARCH_VERSION }
      }
      consecutive = 0
    } catch (e) {
      errors++
      if (e instanceof RateLimited) {
        if (++consecutive >= ABORT_AFTER) {
          aborted = true
          return
        }
      }
      // בלי רישום state: הדגם יידגם שוב בריצה הבאה
    }
  }
}))

// ---------------------------------------------------------------------------

const sorted = Object.fromEntries(Object.keys(map).sort().map(k => [k, map[k]]))
writeFileSync(OUT, JSON.stringify(sorted, null, 0) + '\n')
writeFileSync(STATE, JSON.stringify(state, null, 0) + '\n')

const noImage = [...new Set([
  ...unknownBrand.map(n => n + ' (יצרן לא מזוהה)'),
  ...all.filter(([id]) => state[id]?.r === 'none').map(([, e]) => e.name),
])].sort()
writeFileSync(MISS, 'דגמים בלי תמונה, נוצר ' + today() + '\n\n' + noImage.join('\n') + '\n')

const done = [...all].filter(([id]) => state[id]).length
console.log('')
console.log('תוכננו:', work.length, '· נבדקו בפועל:', attempted,
  '· נמצאו:', hit, '· אין תמונה:', none, '· שגיאות:', errors)
console.log('הגבלת קצב מוויקימדיה:', blocked, 'פעמים')
console.log('מפתחות במפה:', Object.keys(sorted).length, '(היו', Object.keys(prev).length + ')')
console.log('כיסוי הקטלוג:', done, 'מתוך', all.length - unknownBrand.length,
  'דגמים ניתנים לחיפוש')

// שקט הוא באג. הריצה שהחזירה 143 תמונות עברה בירוק בזמן שהיא זרקה
// כמעט 6,000 בקשות חסומות לפח.
if (aborted) {
  console.error('\nעצירה: ויקימדיה חסמה אותנו ' + ABORT_AFTER + ' פעמים ברצף.')
  console.error('מה שנמצא עד כה נשמר. להוריד את IMAGE_BUDGET או להאט את MIN_GAP_MS.')
  process.exit(1)
}
if (attempted && errors / attempted > 0.2) {
  console.error('\nיותר מחמישית מהחיפושים נכשלו (' + errors + ' מתוך ' + attempted + ').')
  console.error('מה שנמצא עד כה נשמר, אבל הריצה מסומנת ככישלון בכוונה.')
  process.exit(1)
}
