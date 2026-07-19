// src/lib/carImage.js
// תמונת דגם מוויקיפדיה האנגלית, עם סינון שמוודא שהערך שנמצא הוא באמת רכב
// ושהוא של הדגם הנכון. בלי זיהוי ודאי לא מציגים תמונה בכלל
// (עדיף אייקון מאשר מקלע MG3 או שדה התעופה JAC).

// מפה סטטית שנבנית שבועית על ידי tools/fetchImages.mjs. זה המקור המהיר והיציב:
// אין קריאת רשת, אין הגבלת קצב, והתמונה מופיעה מיד. חיפוש חי נשאר רק לדגמים
// שנוספו לקטלוג אחרי הריצה האחרונה של הסקריפט.
import IMAGE_MAP from './imageMap.json'

const BRANDS = {
  'טויוטה': 'Toyota', 'קיה': 'Kia', 'יונדאי': 'Hyundai', 'שברולט': 'Chevrolet',
  'סיטרואן': 'Citroen', 'מאזדה': 'Mazda', 'סקודה': 'Skoda', 'סוזוקי': 'Suzuki',
  'ניסאן': 'Nissan', 'פורד': 'Ford', 'פולקסווגן': 'Volkswagen', 'רנו': 'Renault',
  'פיגו': 'Peugeot', "פיג'ו": 'Peugeot', 'הונדה': 'Honda', 'מיצובישי': 'Mitsubishi',
  'סובארו': 'Subaru', 'אאודי': 'Audi', 'במוו': 'BMW', 'ב.מ.וו': 'BMW',
  'מרצדס': 'Mercedes-Benz', 'ליפמוטור': 'Leapmotor', 'סיאט': 'Seat', 'סאט': 'Seat',
  'דאציה': 'Dacia', "דאצ'יה": 'Dacia', 'אופל': 'Opel', 'פיאט': 'Fiat',
  'וולוו': 'Volvo', 'טסלה': 'Tesla', 'צרי': 'Chery', "צ'רי": 'Chery',
  'גילי': 'Geely', "ג'ילי": 'Geely', 'לקסוס': 'Lexus', 'מיני': 'Mini',
  'סנטרו': 'Cenntro', 'דונגפנג': 'Dongfeng', "ג'אק": 'JAC', 'גאק': 'JAC',
  'ביואיד': 'BYD', 'בי ווי די': 'BYD', "אם ג'י": 'MG', 'אם גי': 'MG', 'מ.ג': 'MG',
  'לנדרובר': 'Land Rover', 'רובר': 'Land Rover', "ג'יפ": 'Jeep', 'גיפ': 'Jeep',
  'דייהטסו': 'Daihatsu', 'סאנגיונג': 'SsangYong', 'איסוזו': 'Isuzu',
  'אלפא': 'Alfa Romeo', "ג'אקו": 'Jaecoo', 'אומודה': 'Omoda', 'דיפאל': 'Deepal',
  'אורה': 'Ora', 'איון': 'Aion', 'גי.אי.סי': 'GAC', 'קיי גי מוביליט': 'KGM',
  // דו גלגלי
  'וספה': 'Vespa', 'קוואסאקי': 'Kawasaki', 'רויאל אנפילד': 'Royal Enfield', 'סאן יאנג': 'SYM',
  'ימאהה': 'Yamaha',
  // נוספו אחרי שהתגלה שהם נופלים בלי ניסיון חיפוש כלל.
  // "גיאיוואן" ו"לינקסיס" מופיעים גם הם בקטלוג אך לא זוהה בוודאות
  // מיהו היצרן, ולכן לא נוספו כאן. עדיף חסר על פני מיפוי שגוי.
  'מרוטי-סוזוקי': 'Maruti Suzuki', 'דאיון': 'Dayun', 'סמארט': 'Smart',
  'גיי.איי.סי': 'GAC',
}

// ערכים שהם בוודאות לא רכב פרטי, גם אם השם דומה
const NOT_CAR = /machine.?gun|firearm|rifle|pistol|revolver|weapon|missile|torpedo|submarine|warship|frigate|artillery|airport|airfield|air base|airline|aircraft|helicopter|avionics|locomotive|railway|rail line|tram|motorcycle|scooter|manufacturer|automaker|marque|company|corporation|album|song|band|film|movie|video game/i

// עדות חיובית לכך שמדובר ברכב
const IS_CAR = /\b(car|automobile|suv|crossover|hatchback|sedan|saloon|supermini|subcompact|compact|minivan|van|pickup|mpv|roadster|coupe|cabriolet|convertible|station wagon|estate|electric vehicle|city car|kei car|microcar|off-road|4x4|light commercial vehicle)\b/i

// ולידציה לדו גלגלי: אותם פסולים, אבל אופנוע וקטנוע הם דווקא ההוכחה החיובית
const NOT_MOTO = /machine.?gun|firearm|rifle|pistol|revolver|weapon|missile|torpedo|submarine|warship|frigate|artillery|airport|airfield|air base|airline|aircraft|helicopter|avionics|locomotive|railway|rail line|tram|manufacturer|automaker|marque|company|corporation|album|song|band|film|movie|video game|\b(car|automobile|sedan|suv)\b/i

const IS_MOTO = /\b(motorcycle|scooter|maxi.?scooter|moped|motorbike|underbone|cruiser|sport bike|naked bike)\b/i

const cache = new Map()
// גרסה 4: הועלתה כשנוסף חיפוש בויקישיתוף והתאמה לפי שנתון. מאפסת תוצאות
// שנשמרו לפני כן, כולל דגמים שנשמרו בטעות בלי תמונה בכלל.
const LS_KEY = 'carimg4_'

function lsGet(key) {
  try { return localStorage.getItem(LS_KEY + key) } catch { return null }
}

function lsSet(key, val) {
  try { localStorage.setItem(LS_KEY + key, val ?? '') } catch { /* מלא, לא נורא */ }
}

// מגביל מקביליות. בקטלוג יש מאות כרטיסים, וירי של מאות בקשות בו זמנית
// גורם לוויקיפדיה ולוויקישיתוף להחזיר שגיאה. תור עם ארבע בקשות במקביל
// לוקח קצת יותר זמן אבל מחזיר תוצאות במקום כלום.
const MAX_PARALLEL = 4
let active = 0
const queue = []

function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    const job = queue.shift()
    active++
    job.fn().then(job.resolve, job.reject).finally(() => { active--; pump() })
  }
}

function schedule(fn) {
  return new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump() })
}

async function getJson(url) {
  const res = await schedule(() => fetch(url))
  if (!res.ok) throw new Error('HTTP ' + res.status)   // חשוב: לא בולעים שגיאת קצב
  return res.json()
}

// שליפה לפי שם ערך מדויק. זה המסלול המהיר והוודאי: כשיש רמז wiki בספר הדגמים
// אין צורך לנחש דרך מנוע החיפוש, ולכן גם אין סיכון להביא תמונה של דגם אחר.
async function wikiByTitle(title) {
  const api = 'https://en.wikipedia.org/w/api.php'
    + '?action=query&format=json&origin=*&redirects=1'
    + '&prop=pageimages&piprop=thumbnail&pithumbsize=480'
    + '&titles=' + encodeURIComponent(title)
  const json = await getJson(api)
  const pages = Object.values(json?.query?.pages || {})
  return pages[0]?.thumbnail?.source || null
}

// ויקישיתוף (Wikimedia Commons) מכיל הרבה יותר תמונות רכב מאשר יש ערכים
// בוויקיפדיה האנגלית, ושמות הקבצים שם תיאוריים ("Honda CB750 Hornet 2025.jpg").
// זה מאפשר לאמת את ההתאמה מול שם הקובץ במקום לסמוך על דירוג החיפוש.
function stripQualifiers(model) {
  return model.toUpperCase()
    .replace(/\b20\d\d\b/g, '')      // שנתון אינו מזהה דגם
    .replace(/\b\d+\s?KW\b/g, '')    // וגם לא קיצור הספק כמו 35KW
    .replace(/\s+/g, ' ')
    .trim()
}

async function commonsImage(brandEn, model, year) {
  if (!brandEn || !model) return null
  const core = stripQualifiers(model)
  if (!core) return null
  const api = 'https://commons.wikimedia.org/w/api.php'
    + '?action=query&format=json&origin=*'
    + '&generator=search&gsrnamespace=6&gsrlimit=14&gsrsearch=' + encodeURIComponent(brandEn + ' ' + core)
    + '&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=480'
  const json = await getJson(api)
  const pages = Object.values(json?.query?.pages || {}).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))

  const B = brandEn.toUpperCase()
  const tokens = core.split(/\s+/).filter(Boolean)
  // כל מספר בשם הדגם חייב להופיע בשם הקובץ. בלי זה חיפוש "ELIMINATOR 500"
  // מחזיר תמונה של ELIMINATOR 125, שזה דגם אחר לגמרי.
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
    // שנתון מתוך שם הקובץ. דגם 2022 ודגם 2026 נראים שונה, ולכן מעדיפים
    // את התמונה הקרובה ביותר לשנתון המבוקש. קובץ בלי שנה מקבל קנס בינוני
    // כדי שלא יעקוף תמונה מתוארכת שמתאימה.
    const fy = (title.match(/\b(20\d\d)\b/) || [])[1]
    const gap = fy && year ? Math.abs(Number(fy) - year) : 6
    // קובץ ששמו פותח בשם היצרן הוא בדרך כלל תמונת דגם נקייה ולא צילום מאירוע
    hits.push({ url: ii.thumburl, lead: T.trimStart().startsWith(B) ? 0 : 1, gap })
  }
  hits.sort((a, b) => a.gap - b.gap || a.lead - b.lead)
  return hits[0]?.url || null
}

async function wikiSearch(q) {
  const api = 'https://en.wikipedia.org/w/api.php'
    + '?action=query&format=json&origin=*'
    + '&prop=pageimages%7Cdescription&piprop=thumbnail&pithumbsize=480'
    + '&generator=search&gsrlimit=4&gsrsearch=' + encodeURIComponent(q)
  const json = await getJson(api)
  return Object.values(json?.query?.pages || {}).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))
}

export async function fetchCarImage(v) {
  const name = v?.name || ''
  if (!name) return null
  const isMoto = v?.kind === 'moto'
  // השנה חלק מהמפתח: אותו דגם בשנתון אחר הוא תמונה אחרת
  const key = (isMoto ? 'm|' : '') + name + '|' + (v?.year ?? '')
  if (cache.has(key)) return cache.get(key)

  const mapped = IMAGE_MAP[key]
  if (mapped) { cache.set(key, mapped); return mapped }

  const stored = lsGet(key)
  if (stored != null) {
    const url = stored === '' ? null : stored
    cache.set(key, url)
    return url
  }

  let url = null
  try {
    const latin = (name.match(/[A-Za-z0-9][A-Za-z0-9 .\-]*/g) || []).join(' ').trim()
    const brandHe = Object.keys(BRANDS).find(b => name.includes(b))
    const brandEn = brandHe ? BRANDS[brandHe] : ''
    let tokens = latin.split(/\s+/).filter(t => t.length >= 2 && t.toUpperCase() !== brandEn.toUpperCase())

    // שכבה ראשונה: ויקישיתוף. מכסה דגמים שאין להם ערך ויקיפדיה משלהם,
    // ההתאמה מאומתת מול שם הקובץ, וזה המקור היחיד שממנו אפשר לגזור שנתון.
    url = await commonsImage(brandEn, latin, v?.year)
    if (url) { cache.set(key, url); lsSet(key, url); return url }

    // שכבה שנייה: רמז מפורש לערך ויקיפדיה מספר הדגמים. תמונה אחת לכל הדגם,
    // בלי הבחנה בין שנתונים, ולכן היא באה רק אחרי ויקישיתוף.
    if (v?.wiki) {
      url = await wikiByTitle(v.wiki)
      if (url) { cache.set(key, url); lsSet(key, url); return url }
    }

    // דגם דו גלגלי שנבדק ידנית ואין לו ערך ויקיפדיה: עוצרים כאן.
    // חיפוש טקסט חופשי היה מוצא דגם דומה בשם מדור אחר, וזה גרוע מאייקון.
    if (v?.wikiChecked && !v?.wiki) {
      cache.set(key, null); lsSet(key, null); return null
    }

    const suffix = isMoto ? '' : ' car'
    let pages = await wikiSearch((brandEn + ' ' + latin + suffix).replace(/\s+/g, ' ').trim())
    if (!pages.length && tokens.length) {
      // אין תוצאות? מרככים סיומת גרסה ישראלית, למשל T03D הופך ל־T03
      const soft = tokens.map(t => t.replace(/(\d)[A-Za-z]$/, '$1'))
      if (soft.join(' ') !== tokens.join(' ')) {
        pages = await wikiSearch((brandEn + ' ' + soft.join(' ') + suffix).replace(/\s+/g, ' ').trim())
        tokens = soft
      }
    }

    for (const p of pages) {
      const title = p.title || ''
      const txt = title + ' · ' + (p.description || '')
      if ((isMoto ? NOT_MOTO : NOT_CAR).test(txt)) continue
      const tl = title.toLowerCase()
      const words = tl.split(/[^a-z0-9]+/).filter(Boolean)
      const brandInTitle = brandEn && tl.includes(brandEn.toLowerCase())
      const modelInTitle = tokens.some(t => {
        const k = t.toLowerCase()
        return tl.includes(k) || words.some(w => w.length >= 3 && k.startsWith(w))
      })
      // חייבים את שם הדגם בכותרת, בתוספת עדות שזה רכב או לפחות שם המותג
      const isKind = isMoto ? IS_MOTO : IS_CAR
      const ok = tokens.length === 0
        ? (isKind.test(txt) && brandInTitle)
        : (modelInTitle && (isKind.test(txt) || brandInTitle))
      if (ok && p.thumbnail?.source) { url = p.thumbnail.source; break }
    }
  } catch {
    // שגיאת רשת או הגבלת קצב. מחזירים בלי לשמור, כדי שהניסיון הבא יצליח.
    // שמירה כאן הייתה מקבעת "אין תמונה" לדגם תקין עד לניקוי המטמון.
    return null
  }
  cache.set(key, url)
  lsSet(key, url)
  return url
}
