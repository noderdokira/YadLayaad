// src/lib/carImage.js
// תמונת דגם מתוך ויקיפדיה האנגלית, לפי יצרן ודגם. אין תמונה, אין בעיה, מחזיר null.

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
}

const cache = new Map()

export async function fetchCarImage(v) {
  const key = v?.id ?? v?.name
  if (cache.has(key)) return cache.get(key)
  let url = null
  try {
    const name = v?.name || ''
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
  cache.set(key, url)
  return url
}
