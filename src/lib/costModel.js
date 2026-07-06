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

// דלק, מחושב. בלי צריכה פר דגם משתמשים בברירת מחדל מסומנת.
export function fuelMonthly({ kmPerYear, consumption } = {}) {
  const km = kmPerYear ?? ANCHORS.defaultKmPerYear
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

// הרכבה. מחזיר את הרכיבים ואת הסכומים, עם או בלי ההערכות.
export function estimateM(vehicle, user = {}, opts = { includeEstimates: true }) {
  const solid = [
    agraMonthly(vehicle.market_price ?? 0),
    fuelMonthly({ kmPerYear: user.kmPerYear, consumption: vehicle.consumption }),
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
