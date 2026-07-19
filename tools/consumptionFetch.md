# רענון צריכת הדלק פר דגם

הנתונים ב־`src/lib/consumptionBook.js` נגזרים ממאגר ה־WLTP של משרד התחבורה.
המאגר לא חושף צריכת דלק, רק פליטת CO2, ולכן הצריכה מחושבת מהפליטה.

ההרצה היא בקונסולת הדפדפן ולא בסביבת פיתוח, כי `data.gov.il` פותח CORS
לדפדפן אבל חוסם את נקודת הקצה של ה־SQL, ולכן האגרגציה נעשית בצד הלקוח.

## השלבים

פותחים את האתר החי, קונסולה, ומדביקים:

```js
const RES = '142afde2-6228-49f9-8a29-9b6c3a0cbe40'
const F = 'tozar,kinuy_mishari,delek_nm,CO2_WLTP,shnat_yitzur'
const acc = new Map()
let off = 0
for (let i = 0; i < 5; i++) {
  const u = 'https://data.gov.il/api/3/action/datastore_search?resource_id=' + RES
    + '&limit=32000&offset=' + off + '&fields=' + encodeURIComponent(F)
  const j = await (await fetch(u)).json()
  const recs = j.result.records
  off += recs.length
  for (const r of recs) {
    const y = +r.shnat_yitzur, co2 = +r.CO2_WLTP
    if (!(y >= 2017) || !(co2 > 0)) continue
    const br = (r.tozar || '').trim(), md = (r.kinuy_mishari || '').trim()
    if (!br || !md) continue
    const k = br + '|' + md.toUpperCase() + '|' + (r.delek_nm || '').trim()
    if (!acc.has(k)) acc.set(k, [])
    acc.get(k).push(co2)
  }
  if (recs.length < 32000) break
}

// ליטר בנזין = כ-2,392 גרם CO2, ליטר סולר = כ-2,640 גרם
const FAC = f => /דיזל/.test(f) ? 26.40 : 23.92
const per = new Map()
for (const [k, arr] of acc) {
  const [b, m, f] = k.split('|')
  if (f === 'חשמל') continue            // חשמלי מטופל במודל נפרד
  const key = b + '|' + m
  if (!per.has(key)) per.set(key, [])
  for (const c of arr) per.get(key).push(c / FAC(f))
}
const med = a => { const s = [...a].sort((x, y) => x - y); const i = s.length >> 1
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2 }
const out = {}
for (const [k, v] of per) {
  const c = Math.round(med(v) * 10) / 10
  if (c >= 3.5 && c <= 11) out[k] = c   // מסנן ארטיפקטים של פלאג אין וכלים כבדים
}
copy(out)
```

## למה הסף התחתון 3.5

פלאג אין נמדד בתקן WLTP עם זיכוי סוללה ויוצא סביב 45 גרם לק"מ, כלומר
כ־2 ליטר ל 100 ק"מ. זה לא מייצג נהיגה בלי הטענה יומית, ולכן עדיף שדגמים
כאלה ייפלו לברירת המחדל מאשר יציגו מספר שמטעה כלפי מטה.
היברידי רגיל (קורולה 4.3) כן נשאר, כי זו באמת הצריכה שלו.

## מה מעדכנים בקובץ

מעדכנים רק את הדגמים שכבר ברשימה, ומוסיפים דגמים חדשים שנכנסו לקטלוג.
אין צורך להכניס את כל 1,486 הצירופים שבמאגר: רובם רמות גימור וכלים מסחריים
ששם הדגם שלהם לא תואם לשמות בקטלוג ממילא.

בסיום מעדכנים את `CONSUMPTION_UPDATED`.
