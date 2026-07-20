// כלי בדיקה מקומי (לא נכנס לאפליקציה): מוודא שכל דגם בספר האופנועים
// נתפס על ידי הכלל שלו ולא נבלע על ידי כלל רחב שקודם לו, ומייצר את ה־SQL
// להכנסת השורות לסופבייס. הרצה: node tools/motoCheck.mjs
import { MOTO_BOOK, motoEntry, licenseFor, normalizeMotos } from '../src/lib/motoBook.js'

// השם כפי שהוא נשמר ב־DB: יצרן בעברית, רווח, ואז החלק הלטיני.
// חייב להיות זהה למה שהרגקס מצפה לו.
const NAMES = [
  ['הונדה', 'PCX 125'], ['הונדה', 'FORZA 350'], ['הונדה', 'ADV 350'],
  ['הונדה', 'CB750 HORNET'], ['הונדה', 'CBR650R'], ['הונדה', 'XL750 TRANSALP'],
  ['הונדה', 'CBR500R'], ['הונדה', 'NX500'], ['הונדה', 'CB500 HORNET'],
  ['הונדה', 'CMX500 REBEL'],

  ['ימאהה', 'NMAX 125'], ['ימאהה', 'XMAX 125'], ['ימאהה', 'XMAX 125 TECH MAX'],
  ['ימאהה', 'XMAX 300'], ['ימאהה', 'XMAX 300 TECH MAX'], ['ימאהה', 'RAYZR 125'],
  ['ימאהה', 'TRICITY 125'], ['ימאהה', 'TRICITY 300'], ['ימאהה', 'TMAX 560'],
  ['ימאהה', 'TMAX 560 TECH MAX'],

  ['ימאהה', 'YZF-R125'], ['ימאהה', 'MT-125'], ['ימאהה', 'XSR 125'],
  ['ימאהה', 'MT-03'], ['ימאהה', 'YZF-R3'], ['ימאהה', 'MT-07'],
  ['ימאהה', 'MT-07 Y-AMT'], ['ימאהה', 'YZF-R7'], ['ימאהה', 'TRACER 7'],
  ['ימאהה', 'TRACER 7 35KW'], ['ימאהה', 'TRACER 7 Y-AMT'], ['ימאהה', 'TENERE 700'],
  ['ימאהה', 'MT-09'], ['ימאהה', 'MT-09 SP'], ['ימאהה', 'MT-09 SP 35KW'],
  ['ימאהה', 'MT-09 Y-AMT'], ['ימאהה', 'XSR900'], ['ימאהה', 'XSR900 GP'],
  ['ימאהה', 'R9'], ['ימאהה', 'TRACER 9'], ['ימאהה', 'TRACER 9 GT'],
  ['ימאהה', 'MT-10'], ['ימאהה', 'MT-10 SP'], ['ימאהה', 'YZF-R1'], ['ימאהה', 'YZF-R1M'],

  ['קוואסאקי', 'NINJA 500'], ['קוואסאקי', 'NINJA 500 SE'], ['קוואסאקי', 'Z500'],
  ['קוואסאקי', 'Z500 SE'], ['קוואסאקי', 'ELIMINATOR 500'], ['קוואסאקי', 'ELIMINATOR 500 SE'],
  ['קוואסאקי', 'KLE500'], ['קוואסאקי', 'KLE500 SE'], ['קוואסאקי', 'NINJA ZX-4R'],
  ['קוואסאקי', 'NINJA ZX-4RR'], ['קוואסאקי', 'NINJA 650'], ['קוואסאקי', 'Z650'],
  ['קוואסאקי', 'VERSYS 650'], ['קוואסאקי', 'VULCAN 650 S'], ['קוואסאקי', 'Z900'],
  ['קוואסאקי', 'Z900 SE'], ['קוואסאקי', 'Z900 2025 35KW'], ['קוואסאקי', 'NINJA ZX-6R'],
  ['קוואסאקי', 'VERSYS 1100'], ['קוואסאקי', 'VERSYS 1100 S'], ['קוואסאקי', 'VERSYS 1100 SE'],
  ['קוואסאקי', 'NINJA 1100 SX'], ['קוואסאקי', 'NINJA 1100 SX SE'], ['קוואסאקי', 'Z1100'],
  ['קוואסאקי', 'Z1100 SE'], ['קוואסאקי', 'Z H2'], ['קוואסאקי', 'NINJA ZX-10R'],
  ['קוואסאקי', 'NINJA ZX-10RR'], ['קוואסאקי', 'NINJA H2 SX'],

  ['וספה', 'PRIMAVERA 125'], ['וספה', 'GTS 300'],

  ['סאן יאנג', 'MIO 125'], ['סאן יאנג', 'DUKE 125'], ['סאן יאנג', 'JET 14 EVO 125'],
  ['סאן יאנג', 'JET 14 EVO 200'], ['סאן יאנג', 'JET X 125'], ['סאן יאנג', 'SYMPHONY SR 125'],
  ['סאן יאנג', 'JOYRIDE 125'], ['סאן יאנג', 'JOYRIDE 200'], ['סאן יאנג', 'JOYRIDE 300'],
  ['סאן יאנג', 'JOYMAX Z+ 125'], ['סאן יאנג', 'JOYMAX Z+ 250'], ['סאן יאנג', 'JOYMAX Z+ 300'],
  ['סאן יאנג', 'ADX 125'], ['סאן יאנג', 'ADX 300'], ['סאן יאנג', 'ADXTG 400'],
  ['סאן יאנג', 'CRUISYM 125'], ['סאן יאנג', 'CRUISYM 300'], ['סאן יאנג', 'MAXSYM TL 508'],
  ['סאן יאנג', 'MAXSYM 400 GT'],

  ['רויאל אנפילד', 'CLASSIC 350'], ['רויאל אנפילד', 'HUNTER 350'],
]

let bad = 0
const seen = new Set()
const rows = []

for (const [brand, model] of NAMES) {
  const name = brand + ' ' + model
  if (seen.has(name)) { console.log('כפילות בשם:', name); bad++; continue }
  seen.add(name)

  const e = motoEntry(name)
  if (!e) { console.log('לא נמצאה התאמה:', name); bad++; continue }
  if (e.b !== brand) { console.log('התאמה ליצרן שגוי:', name, '->', e.b); bad++; continue }

  const lic = licenseFor(e.cc, e.kw, e.lic)
  if (!lic) { console.log('אין דרגת רישיון:', name); bad++ }

  // שנתונים: הדגם הנוכחי, ועוד שניים אחורה אם הדגם כבר היה קיים אז
  for (const y of [2026, 2024, 2022]) {
    if ((e.since ?? 2000) <= y) rows.push({ name, year: y, price: e.base })
  }
}

// בדיקת בליעה: כל ערך בספר חייב להיות נגיש לפחות לשם אחד
const reached = new Set()
for (const [brand, model] of NAMES) {
  const e = motoEntry(brand + ' ' + model)
  if (e) reached.add(e)
}
for (const e of MOTO_BOOK) {
  if (!reached.has(e)) { console.log('ערך שאף שם לא מגיע אליו (נבלע?):', e.b, String(e.m)); bad++ }
}

// דוגמאות לסיווג רישיון, לעין אנושית
const sample = normalizeMotos(rows.filter(r => r.year === 2026).map((r, i) => ({
  id: 'x' + i, name: r.name, year: r.year, market_price: r.price,
})))
const byLic = sample.reduce((a, v) => { a[v.license] = (a[v.license] || 0) + 1; return a }, {})

console.log('---')
console.log('דגמים בספר:', MOTO_BOOK.length, '· שמות שנבדקו:', NAMES.length, '· שורות ל־DB:', rows.length)
console.log('פילוח דרגות רישיון (שנתון 2026):', byLic)
console.log('בלי דרגה:', sample.filter(v => !v.license).map(v => v.name))
console.log('בלי צריכת דלק מאומתת:', sample.filter(v => v.consumption == null).length)
console.log('בלי רמז תמונה (wiki):', sample.filter(v => !v.wiki).length)
console.log(bad === 0 ? 'תקין: אין שגיאות' : 'נמצאו ' + bad + ' בעיות')

// ---- ייצור ה־SQL ----
const CAT = 'b5479b37-42fd-410a-949e-39c81050f39d'
const esc = s => s.replace(/'/g, "''")
const values = rows.map(r => `('${esc(r.name)}', ${r.year}, ${r.price}, 'moto', '${CAT}')`).join(',\n  ')
const sql = `-- הכנסת דגמי דו גלגלי לקטלוג. בטוח להרצה חוזרת: מדלג על שורות שכבר קיימות.
-- נוצר על ידי tools/motoCheck.mjs
insert into products (name, year, market_price, kind, category_id)
select v.name, v.year, v.price, v.kind, v.cat::uuid
from (values
  ${values}
) as v(name, year, price, kind, cat)
where not exists (
  select 1 from products p
  where p.name = v.name and p.year = v.year and p.kind = v.kind
);
`
const { writeFileSync } = await import('node:fs')
const out = process.cwd() + '/supabase/insert_motos.sql'
writeFileSync(out, sql)
console.log('נכתב:', out)
