// src/lib/carImage.js
// תמונת דגם מוויקיפדיה האנגלית, עם סינון שמוודא שהערך שנמצא הוא באמת רכב
// ושהוא של הדגם הנכון. בלי זיהוי ודאי לא מציגים תמונה בכלל
// (עדיף אייקון מאשר מקלע MG3 או שדה התעופה JAC).

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
}

// ערכים שהם בוודאות לא רכב פרטי, גם אם השם דומה
const NOT_CAR = /machine.?gun|firearm|rifle|pistol|revolver|weapon|missile|torpedo|submarine|warship|frigate|artillery|airport|airfield|air base|airline|aircraft|helicopter|avionics|locomotive|railway|rail line|tram|motorcycle|scooter|manufacturer|automaker|marque|company|corporation|album|song|band|film|movie|video game/i

// עדות חיובית לכך שמדובר ברכב
const IS_CAR = /\b(car|automobile|suv|crossover|hatchback|sedan|saloon|supermini|subcompact|compact|minivan|van|pickup|mpv|roadster|coupe|cabriolet|convertible|station wagon|estate|electric vehicle|city car|kei car|microcar|off-road|4x4|light commercial vehicle)\b/i

// ולידציה לדו גלגלי: אותם פסולים, אבל אופנוע וקטנוע הם דווקא ההוכחה החיובית
const NOT_MOTO = /machine.?gun|firearm|rifle|pistol|revolver|weapon|missile|torpedo|submarine|warship|frigate|artillery|airport|airfield|air base|airline|aircraft|helicopter|avionics|locomotive|railway|rail line|tram|manufacturer|automaker|marque|company|corporation|album|song|band|film|movie|video game|\b(car|automobile|sedan|suv)\b/i

const IS_MOTO = /\b(motorcycle|scooter|maxi.?scooter|moped|motorbike|underbone|cruiser|sport bike|naked bike)\b/i

const cache = new Map()
const LS_KEY = 'carimg2_' // גרסת מטמון חדשה, מאפסת תוצאות שגויות שנשמרו בעבר

function lsGet(key) {
  try { return localStorage.getItem(LS_KEY + key) } catch { return null }
}

function lsSet(key, val) {
  try { localStorage.setItem(LS_KEY + key, val ?? '') } catch { /* מלא, לא נורא */ }
}

async function wikiSearch(q) {
  const api = 'https://en.wikipedia.org/w/api.php'
    + '?action=query&format=json&origin=*'
    + '&prop=pageimages%7Cdescription&piprop=thumbnail&pithumbsize=480'
    + '&generator=search&gsrlimit=4&gsrsearch=' + encodeURIComponent(q)
  const res = await fetch(api)
  const json = await res.json()
  return Object.values(json?.query?.pages || {}).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))
}

export async function fetchCarImage(v) {
  const name = v?.name || ''
  if (!name) return null
  const isMoto = v?.kind === 'moto'
  const key = (isMoto ? 'm|' : '') + name
  if (cache.has(key)) return cache.get(key)

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
    url = null
  }
  cache.set(key, url)
  lsSet(key, url)
  return url
}
