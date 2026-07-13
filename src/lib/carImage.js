// src/lib/carImage.js
// תמונת דגם מתוך ויקיפדיה האנגלית, לפי יצרן ודגם. אין תמונה, אין בעיה, מחזיר null.
// התוצאות נשמרות גם ב-localStorage כדי לא לפנות שוב לרשת על אותו דגם.

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
  'ביואיד': 'BYD', "אם ג'י": 'MG', 'אם גי': 'MG', 'לנדרובר': 'Land Rover',
  'רובר': 'Land Rover', "ג'יפ": 'Jeep', 'גיפ': 'Jeep', 'דייהטסו': 'Daihatsu',
  'סאנגיונג': 'SsangYong', 'איסוזו': 'Isuzu', 'אלפא': 'Alfa Romeo',
}

const cache = new Map()
const LS_KEY = 'carimg_'

function lsGet(key) {
  try { return localStorage.getItem(LS_KEY + key) } catch { return null }
}

function lsSet(key, val) {
  try { localStorage.setItem(LS_KEY + key, val ?? '') } catch { /* מלא, לא נורא */ }
}

export async function fetchCarImage(v) {
  const name = v?.name || ''
  if (!name) return null
  if (cache.has(name)) return cache.get(name)

  const stored = lsGet(name)
  if (stored != null) {
    const url = stored === '' ? null : stored
    cache.set(name, url)
    return url
  }

  let url = null
  try {
    const latin = (name.match(/[A-Za-z0-9][A-Za-z0-9 .\-]*/g) || []).join(' ').trim()
    const brandHe = Object.keys(BRANDS).find(b => name.includes(b))
    const q = ((brandHe ? BRANDS[brandHe] + ' ' : '') + latin).trim() || name
    const api = 'https://en.wikipedia.org/w/api.php'
      + '?action=query&format=json&origin=*'
      + '&prop=pageimages&piprop=thumbnail&pithumbsize=480'
      + '&generator=search&gsrlimit=1&gsrsearch=' + encodeURIComponent(q)
    const res = await fetch(api)
    const json = await res.json()
    const pages = json?.query?.pages
    if (pages) url = Object.values(pages)[0]?.thumbnail?.source || null
  } catch {
    url = null
  }
  cache.set(name, url)
  lsSet(name, url)
  return url
}
