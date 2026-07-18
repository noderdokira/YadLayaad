// מודל העלות החודשית M, מפוצל לרכיבים לפי רמת ודאות.
// עוגנים אומתו ביולי 2026. מקור בהערה ליד כל עוגן.

export const ANCHORS = {
  updated: '2026-07',

  // בנזין 95 שירות עצמי, מחיר מפוקח יולי 2026, משרד האנרגיה
  fuelPricePerLiter: 7.48,

  // אגרת רישוי שנתית לרכב חדש, שנתוני 2024 עד 2026,
  // דף אגרות משרד התחבורה בתוקף מ 01.04.2026
  agraGroups: [
    { maxPrice: 117000, fee: 1266 },
    { maxPrice: 141000, fee: 1610 },
    { maxPrice: 167000, fee: 1941 },
    { maxPrice: 188000, fee: 2315 },
    { maxPrice: 244000, fee: 2651 },
    { maxPrice: 347000, fee: 3764 },
    { maxPrice: Infinity, fee: 5364 },
  ],
  radioFee: 135, // העברה לרשות השידור, שנתי

  // טווחי ביטוח שנתיים לפי גיל, חובה ומקיף, טבלאות שוק 2026.
  // הערכה בלבד, לא הצעת מחיר.
  insuranceBands: [
    { maxAge: 21, chova: [2800, 4200], makif: [4500, 9000] },
    { maxAge: 24, chova: [2200, 3500], makif: [3500, 7000] },
    { maxAge: 35, chova: [1500, 2500], makif: [2500, 5000] },
    { maxAge: 200, chova: [1200, 2000], makif: [2000, 4000] },
  ],

  // תחזוקה שנתית לרכב חדש. העוגן החלש ביותר, טווח רחב בכוונה.
  maintenanceYearly: [1200, 3000],

  defaultKmPerYear: 15000,
  defaultConsumption: 7.0, // ליטר ל 100 קמ עד שיש נתון פר דגם

  // חשמל ביתי: 64.32 אגורות לקוט"ש כולל מע"מ, תעריף יולי 2026 (רשות החשמל).
  // טעינה ציבורית מהירה יקרה משמעותית; ההערכה כאן היא לטעינה ביתית.
  electricityPricePerKwh: 0.64,
  defaultEvConsumption: 15, // קוט"ש ל 100 קמ, ממוצע לרכב חשמלי קטן
}


// ---------- עוגני דו גלגלי (אומתו יולי 2026) ----------
export const MOTO_ANCHORS = {
  updated: '2026-07',

  // אגרת רישוי שנתית לאופנוע לפי נפח, דף האגרות של משרד התחבורה בתוקף מ 01.04.2026.
  // אין אגרת רדיו לאופנוע.
  agraGroups: [
    { maxCc: 50, fee: 106 },
    { maxCc: 150, fee: 194 },
    { maxCc: Infinity, fee: 357 },
  ],
  evFee: 52,

  // ביטוח חובה: תעריף הפול (המאגר הישראלי לביטוח רכב), ינואר 2026,
  // פרמיה ברוטו שנתית לפי נפח, בעלות פרטית, נהג נקוב.
  poolGross: [
    { maxCc: 50, gross: 3386 },
    { maxCc: 125, gross: 5131 },
    { maxCc: 250, gross: 5180 },
    { maxCc: 345, gross: 7387 },
    { maxCc: 590, gross: 7847 },
    { maxCc: Infinity, gross: 7988 },
  ],
  // מקדמי הפול: גיל (זכר עד 20: +22.5%) וותק (עד שנתיים: +10%), בקירוב.
  // צד ג' לרכוש: הערכת שוק שנתית, לא חלק מתעריף הפול.
  tsadGimelYearly: [1100, 2600],

  maintenanceYearlySmall: [800, 1800],   // עד 150 סמ"ק
  maintenanceYearlyBig: [1300, 2800],    // מעל 150 סמ"ק

  defaultKmPerYear: 10000,
  defaultConsumption: 3.0, // ליטר ל 100 קמ כשאין נתון פר דגם

  gearOnce: 2500, // ציוד מיגון בסיסי: קסדה, כפפות, מעיל. חד פעמי, להתמצאות בלבד
}

const round = (x) => Math.round(x)

// אגרה, מדויק, לפי קבוצת המחיר של הרכב
export function agraMonthly(price) {
  const g = ANCHORS.agraGroups.find((grp) => price <= grp.maxPrice)
  const yearly = g.fee + ANCHORS.radioFee
  return {
    key: 'agra',
    label: 'אגרת רישוי ורדיו',
    confidence: 'precise',
    monthly: round(yearly / 12),
    note: 'לפי דף האגרות של משרד התחבורה, אפריל 2026',
  }
}

// דלק או חשמל, מחושב. בלי צריכה פר דגם משתמשים בברירת מחדל מסומנת.
export function fuelMonthly({ kmPerYear, consumption, isEv } = {}) {
  const km = kmPerYear ?? ANCHORS.defaultKmPerYear
  if (isEv) {
    const kwh = consumption ?? ANCHORS.defaultEvConsumption
    const monthly = (km / 12) * (kwh / 100) * ANCHORS.electricityPricePerKwh
    return {
      key: 'fuel',
      label: 'חשמל (טעינה ביתית)',
      confidence: 'default',
      monthly: round(monthly),
      note: 'לפי כ 15 קוט"ש ל 100 קמ ותעריף ביתי של 64 אגורות. טעינה ציבורית יקרה יותר, ערוך לפי השימוש שלך',
    }
  }
  const cons = consumption ?? null
  const used = cons ?? ANCHORS.defaultConsumption
  const monthly = (km / 12) * (used / 100) * ANCHORS.fuelPricePerLiter
  return {
    key: 'fuel',
    label: 'דלק',
    confidence: cons != null ? 'calculated' : 'default',
    monthly: round(monthly),
    note: cons != null
      ? 'לפי צריכת הדגם ומחיר בנזין 95 המפוקח'
      : 'לפי צריכה ממוצעת של 7 ליטר ל 100 קמ, ערוך לפי הדגם שלך',
  }
}

// ביטוח, הערכה. טווח לפי גיל, ותק ושווי הרכב.
export function insuranceMonthly({ birthYear, licenseYear, carPrice } = {}) {
  const now = new Date().getFullYear()
  const age = birthYear ? now - birthYear : 30
  const seniority = licenseYear != null ? now - licenseYear : 10
  const band = ANCHORS.insuranceBands.find((b) => age <= b.maxAge)
  // המקיף מושפע משווי הרכב. הטבלה משקפת רכב משפחתי סביב 120 אלף.
  const valueFactor = Math.min(1.8, Math.max(0.7, (carPrice ?? 120000) / 120000))
  const lo = band.chova[0] + band.makif[0] * valueFactor
  const hi = band.chova[1] + band.makif[1] * valueFactor
  // ותק קצר מושך את האומדן לחלק העליון של הטווח
  const t = seniority < 2 ? 0.8 : seniority < 5 ? 0.55 : 0.35
  const point = lo + t * (hi - lo)
  return {
    key: 'insurance',
    label: 'ביטוח חובה ומקיף',
    confidence: 'estimate',
    monthly: round(point / 12),
    rangeMonthly: [round(lo / 12), round(hi / 12)],
    note: 'הערכה לפי גיל, ותק ושווי הרכב. לא הצעת מחיר. בדיקה אמיתית במחשבון רשות שוק ההון',
  }
}

// תחזוקה, הערכה גסה במוצהר
export function maintenanceMonthly() {
  const [lo, hi] = ANCHORS.maintenanceYearly
  return {
    key: 'maintenance',
    label: 'טיפולים ובלאי',
    confidence: 'estimate',
    monthly: round((lo + hi) / 2 / 12),
    rangeMonthly: [round(lo / 12), round(hi / 12)],
    note: 'הערכה גסה לרכב חדש, ערוך לפי הדגם והשימוש שלך',
  }
}

// אגרה לאופנוע, מדויק, לפי נפח המנוע
export function agraMotoMonthly(cc, isEv = false) {
  const g = MOTO_ANCHORS.agraGroups.find((grp) => (cc ?? 999) <= grp.maxCc)
  const yearly = isEv ? MOTO_ANCHORS.evFee : g.fee
  return {
    key: 'agra',
    label: 'אגרת רישוי',
    confidence: 'precise',
    monthly: round(yearly / 12),
    note: 'אגרת דו גלגלי לפי נפח, דף האגרות של משרד התחבורה, אפריל 2026. בלי אגרת רדיו',
  }
}

// ביטוח לאופנוע: חובה לפי תעריף הפול + הערכת צד ג'. רוב הרוכבים הצעירים מבוטחים בפול.
export function insuranceMotoMonthly({ birthYear, licenseYear, cc } = {}) {
  const now = new Date().getFullYear()
  const age = birthYear ? now - birthYear : 30
  const seniority = licenseYear != null ? now - licenseYear : 5

  const band = MOTO_ANCHORS.poolGross.find((b) => (cc ?? 999) <= b.maxCc)
  const ageF = age <= 20 ? 1.225 : age <= 24 ? 1.0 : age <= 39 ? 0.94 : age <= 49 ? 0.9 : 0.85
  const senF = seniority < 2 ? 1.1 : seniority < 3 ? 1.075 : seniority < 4 ? 1.05 : seniority < 8 ? 1.0 : 0.92
  const chova = band.gross * ageF * senF

  const [tgLo, tgHi] = MOTO_ANCHORS.tsadGimelYearly
  const lo = chova * 0.7 + tgLo   // עם השתתפות עצמית (הנחת 30% בפול) וצד ג' זול
  const hi = chova + tgHi
  const t = seniority < 2 ? 0.8 : seniority < 5 ? 0.55 : 0.35
  const point = lo + t * (hi - lo)
  return {
    key: 'insurance',
    label: 'ביטוח חובה וצד ג\'',
    confidence: 'estimate',
    monthly: round(point / 12),
    rangeMonthly: [round(lo / 12), round(hi / 12)],
    note: 'חובה לפי תעריף הפול, ינואר 2026, לפי גיל, ותק ונפח, בתוספת הערכת צד ג\'. לא הצעת מחיר',
  }
}

// תחזוקה לאופנוע, הערכה גסה לפי גודל
export function maintenanceMotoMonthly(cc) {
  const [lo, hi] = (cc ?? 999) <= 150 ? MOTO_ANCHORS.maintenanceYearlySmall : MOTO_ANCHORS.maintenanceYearlyBig
  return {
    key: 'maintenance',
    label: 'טיפולים, צמיגים ובלאי',
    confidence: 'estimate',
    monthly: round((lo + hi) / 2 / 12),
    rangeMonthly: [round(lo / 12), round(hi / 12)],
    note: 'הערכה גסה. צמיגים ורצועות מתחלפים תדיר יותר מברכב',
  }
}

// הרכבת עלות חודשית לאופנוע
function estimateMotoM(vehicle, user = {}, opts = { includeEstimates: true }) {
  const fuel = fuelMonthly({
    kmPerYear: user.kmPerYear ?? MOTO_ANCHORS.defaultKmPerYear,
    consumption: vehicle.consumption ?? MOTO_ANCHORS.defaultConsumption,
    isEv: false,
  })
  if (vehicle.consumption == null) {
    fuel.confidence = 'default'
    fuel.note = 'לפי צריכה ממוצעת של 3 ליטר ל 100 קמ לאופנוע, ערוך לפי הדגם שלך'
  } else {
    fuel.note = 'לפי צריכת היצרן לדגם, כ 10,000 קמ בשנה ומחיר בנזין 95 המפוקח'
  }
  const solid = [agraMotoMonthly(vehicle.cc, vehicle.isEv), fuel]
  const estimates = [
    insuranceMotoMonthly({ birthYear: user.birthYear, licenseYear: user.licenseYear, cc: vehicle.cc }),
    maintenanceMotoMonthly(vehicle.cc),
  ]
  const totalSolid = solid.reduce((s, c) => s + c.monthly, 0)
  const totalAll = totalSolid + estimates.reduce((s, c) => s + c.monthly, 0)
  return {
    components: opts.includeEstimates ? [...solid, ...estimates] : solid,
    excluded: opts.includeEstimates ? [] : estimates,
    totalCertain: totalSolid,
    total: opts.includeEstimates ? totalAll : totalSolid,
  }
}

// הרכבה. מחזיר את הרכיבים ואת הסכומים, עם או בלי ההערכות.
export function estimateM(vehicle, user = {}, opts = { includeEstimates: true }) {
  if (vehicle?.kind === 'moto') return estimateMotoM(vehicle, user, opts)
  const solid = [
    agraMonthly(vehicle.market_price ?? 0),
    fuelMonthly({ kmPerYear: user.kmPerYear, consumption: vehicle.consumption, isEv: vehicle.isEv }),
  ]
  const estimates = [
    insuranceMonthly({
      birthYear: user.birthYear,
      licenseYear: user.licenseYear,
      carPrice: vehicle.market_price,
    }),
    maintenanceMonthly(),
  ]
  const totalSolid = solid.reduce((s, c) => s + c.monthly, 0)
  const totalAll = totalSolid + estimates.reduce((s, c) => s + c.monthly, 0)
  return {
    components: opts.includeEstimates ? [...solid, ...estimates] : solid,
    excluded: opts.includeEstimates ? [] : estimates,
    totalCertain: totalSolid,
    total: opts.includeEstimates ? totalAll : totalSolid,
  }
}

// הגנת מחירים: מסמן רכב כחשוד אם מחירו נמוך מדי לשנתו
export function isPriceSuspect(v) {
  const price = v.market_price ?? 0
  const year  = v.year ?? 2000
  if (price <= 0) return false
  // שנה נוכחית אמיתית, כדי שהסף לא יקפא כשהשנה מתחלפת
  const age   = Math.max(0, new Date().getFullYear() - year)
  // סף: 25,000 + 6,000 לכל שנת גיל. מתחת לסף → חשוד
  return price < 25000 + age * 6000
}

// הערה לרכבים ישנים (לפני 2010): מחיר מקורי בלבד
export function isOriginalListPrice(v) {
  return (v.year ?? new Date().getFullYear()) < 2010
}
