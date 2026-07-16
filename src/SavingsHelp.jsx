// src/SavingsHelp.jsx
// עזרה בחיסכון: מנוע התאמה אישית של אפיקי חיסכון, שיטות התנהגותיות
// וטיפים לצמצום הוצאות, לפי ציון הצנע, סגנון המוטיבציה והאופק של המשתמש.
// מבוסס על מחקר אפיקי חיסכון בישראל, יולי 2026. אינפורמציה בלבד, לא ייעוץ השקעות.
import { useMemo, useState } from 'react'
import { SAVINGS, PLAN_MIX, RATE_ANCHOR } from './lib/savingsData'

const fmt = n => Number(n || 0).toLocaleString('he-IL')

const BAND_LABEL = { low: 'נמוכה', mid: 'בינונית', high: 'גבוהה' }
const HBAND_LABEL = { short: 'קצר (עד שנה)', mid: 'בינוני (שנה עד 3)', long: 'ארוך (3 עד 5 שנים)' }
const STYLE_LABEL = { automation: 'אוטומציה', gamification: 'גיימיפיקציה', deadline: 'דדליין' }
const HKEY = { short: 'short_horizon', mid: 'mid_horizon', long: 'long_horizon' }

function sigmaBandOf(sigma100) {
  return sigma100 < 34 ? 'low' : sigma100 < 67 ? 'mid' : 'high'
}

// חודשי אופק: מהיעד הפעיל, ואם אין יעד, ברירת מחדל של אופק בינוני
function horizonMonths(profile) {
  const g = profile?.goal
  if (!g || g.months_est == null) return null
  const started = g.started_at ? new Date(g.started_at) : new Date()
  const now = new Date()
  const elapsed = Math.max(0, (now.getFullYear() - started.getFullYear()) * 12 + (now.getMonth() - started.getMonth()))
  return Math.max(0, g.months_est - elapsed)
}

function Dots({ value, max = 5, color = 'var(--color-warn)' }) {
  return (
    <span style={{ letterSpacing: 2, whiteSpace: 'nowrap' }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? color : 'var(--color-border)' }}>●</span>
      ))}
    </span>
  )
}

function Chip({ children, color = 'var(--color-text-muted)' }) {
  return (
    <span style={{ fontSize: 11, color, border: '1px solid ' + color, borderRadius: 8, padding: '1px 7px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function PlanCard({ plan, score, maxScore, warn }) {
  const [open, setOpen] = useState(false)
  const stars = Math.max(1, Math.round((score / maxScore) * 5))
  const r = plan.expected_annual_return_pct
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 10, cursor: 'pointer' }}
      onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{plan.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip>{plan.type}</Chip>
            <Chip>נזילות: {plan.liquidity}</Chip>
            {plan.lock_strength >= 4 && <Chip color="var(--color-info)">נעילה חזקה</Chip>}
            {warn && <Chip color="var(--color-danger)">לא לאופק שלך</Chip>}
          </div>
        </div>
        <div style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{r.min}%–{r.max}%</div>
          <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>בשנה, לפני מס</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>
            התאמה <Dots value={stars} color="var(--color-primary)" />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11.5, color: 'var(--color-text-muted)' }}>
        <span>סיכון <Dots value={plan.risk} /></span>
        <span>נעילה <Dots value={plan.lock_strength} color="var(--color-info)" /></span>
        <span style={{ marginInlineStart: 'auto' }}>{open ? 'סגור ▲' : 'פרטים ▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10, fontSize: 13, lineHeight: 1.55, cursor: 'default' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ marginBottom: 8 }}>{plan.description}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-primary)', marginBottom: 3 }}>יתרונות</div>
              {plan.pros.map((p, i) => <div key={i} style={{ fontSize: 12 }}>✓ {p}</div>)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-warn)', marginBottom: 3 }}>חסרונות</div>
              {plan.cons.map((c, i) => <div key={i} style={{ fontSize: 12 }}>✗ {c}</div>)}
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>איך פותחים</div>
          {plan.how_to_open.map((s, i) => <div key={i} style={{ fontSize: 12 }}>{i + 1}. {s}</div>)}
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 8 }}>מיסוי: {plan.tax_note}</div>
          <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 4 }}>מקורות: {plan.sources.join(' · ')}</div>
        </div>
      )}
    </div>
  )
}

function StrategyCard({ s }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 8, cursor: 'pointer' }}
      onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{open ? 'סגור ▲' : 'איך? ▼'}</div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 3 }}>{s.description}</div>
      {open && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
          {s.steps.map((st, i) => <div key={i} style={{ fontSize: 12.5, marginBottom: 3 }}>{i + 1}. {st}</div>)}
        </div>
      )}
    </div>
  )
}

export default function SavingsHelp({ profile, onBack }) {
  const sigma100 = Math.round((profile?.sigma ?? 0.5) * 100)
  const band = sigmaBandOf(sigma100)
  const style = profile?.motivation_style || 'automation'
  const months = horizonMonths(profile)
  const hband = months == null ? 'mid' : months <= 12 ? 'short' : months <= 36 ? 'mid' : 'long'
  const cap = profile?.monthly_capacity

  const [tipsSel, setTipsSel] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sav_tips') || '[]') } catch { return [] }
  })

  const ranked = useMemo(() => {
    const maxScore = 5 * 1.2 + 5 + 5 * 1.1
    return SAVINGS.plans
      .map(p => {
        const f = p.fit
        const score = f['sigma_' + band] * 1.2 + (f[style] ?? 2) + f[HKEY[hband]] * 1.1
        return { plan: p, score, maxScore, warn: p.type === 'מדדים' && hband !== 'long' }
      })
      .sort((a, b) => b.score - a.score)
  }, [band, style, hband])

  const strategies = useMemo(
    () => SAVINGS.strategies.filter(s => s.style === style && sigma100 >= (s.min_sigma || 0)),
    [style, sigma100]
  )

  const tipsByCat = useMemo(() => {
    const m = new Map()
    SAVINGS.tips.forEach((t, i) => {
      if (!m.has(t.category)) m.set(t.category, [])
      m.get(t.category).push({ ...t, i })
    })
    return [...m.entries()]
  }, [])

  const tipsSum = tipsSel.reduce((s, i) => s + (SAVINGS.tips[i]?.est_monthly_saving_ils || 0), 0)
  let monthsSaved = null
  if (tipsSum > 0 && cap > 0 && months != null && months > 1) {
    monthsSaved = months - Math.ceil((cap * months) / (cap + tipsSum))
  }

  function toggleTip(i) {
    setTipsSel(prev => {
      const next = prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
      try { localStorage.setItem('sav_tips', JSON.stringify(next)) } catch { /* לא קריטי */ }
      return next
    })
  }

  const mix = PLAN_MIX[band][hband]

  return (
    <div className="page-wrap page-wrap--mid">
      <button onClick={onBack} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
      <div className="page-title" style={{ marginBottom: 2 }}>עזרה בחיסכון 💡</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        מסלול חיסכון מותאם אישית לפי הפרופיל שלך
      </div>

      {/* הפרופיל שזוהה */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Chip color="var(--color-primary)">משמעת חיסכון: {BAND_LABEL[band]}</Chip>
        <Chip color="var(--color-info)">סגנון: {STYLE_LABEL[style]}</Chip>
        <Chip>{months != null ? 'אופק: ' + HBAND_LABEL[hband] + ' · כ־' + months + ' חודשים ליעד' : 'אין יעד פעיל, הנחנו אופק בינוני'}</Chip>
      </div>

      {/* גילוי נאות */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-warn)', borderRadius: 10, padding: 10, fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
        ⚠️ המידע כאן הוא אינפורמציה בלבד ואינו ייעוץ השקעות או ייעוץ פנסיוני. הנתונים נכונים ל{SAVINGS.updated === '2026-07' ? 'יולי 2026' : SAVINGS.updated}, בסביבה של {RATE_ANCHOR.note} — הריביות במגמת {RATE_ANCHOR.direction}, ולכן בדוק תנאים עדכניים לפני כל החלטה.
      </div>

      {/* התמהיל המומלץ */}
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>התמהיל המוצע לפרופיל שלך</div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', borderRadius: 12, padding: 12, marginBottom: 6 }}>
        {mix.parts.map(([label, pct], i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
              <span>{label}</span>
              <span style={{ fontWeight: 800 }}>~{pct}%</span>
            </div>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: 'var(--color-primary)', opacity: 0.5 + 0.5 * (pct / 100) }} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: 'var(--color-info)', marginTop: 6 }}>{mix.note}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
          כלל ברזל: תמיד להשאיר 5% עד 15% נזילים לחירום. נעילה בלי כרית נזילה מתפוצצת בפרצוף.
        </div>
      </div>
      {cap > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 14 }}>
          לפי יכולת ההפרשה שלך ({fmt(cap)} ₪ בחודש), למשל: {mix.parts.map(([l, p], i) => fmt(Math.round(cap * p / 100)) + ' ₪ ל' + l.split(' ')[0] + (i < mix.parts.length - 1 ? ', ' : '')).join('')}
        </div>
      )}

      {/* האפיקים מדורגים */}
      <div style={{ fontSize: 16, fontWeight: 800, margin: '16px 0 8px' }}>האפיקים, מדורגים בשבילך</div>
      {ranked.map(({ plan, score, maxScore, warn }) => (
        <PlanCard key={plan.id} plan={plan} score={score} maxScore={maxScore} warn={warn} />
      ))}

      {/* שיטות לפי סגנון */}
      <div style={{ fontSize: 16, fontWeight: 800, margin: '18px 0 4px' }}>שיטות שמתאימות לסגנון ה{STYLE_LABEL[style]} שלך</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        נבחרו לפי סגנון המוטיבציה שענית עליו בשאלון
      </div>
      {strategies.map(s => <StrategyCard key={s.id} s={s} />)}

      {/* טיפים אינטראקטיביים */}
      <div style={{ fontSize: 16, fontWeight: 800, margin: '18px 0 4px' }}>איפה אפשר לחתוך בהוצאות</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        סמן טיפים שתאמץ, ונחשב כמה זה שווה (הסכומים הם הערכות)
      </div>
      {tipsByCat.map(([cat, tips]) => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: 'var(--color-primary)' }}>{cat}</div>
          {tips.map(t => (
            <label key={t.i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', cursor: 'pointer', fontSize: 12.5, lineHeight: 1.45 }}>
              <input type="checkbox" checked={tipsSel.includes(t.i)} onChange={() => toggleTip(t.i)} style={{ marginTop: 2 }} />
              <span style={{ flex: 1 }}>{t.tip}</span>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--color-primary)' }}>~{fmt(t.est_monthly_saving_ils)} ₪</span>
            </label>
          ))}
        </div>
      ))}

      {/* סיכום הטיפים */}
      {tipsSum > 0 && (
        <div style={{ position: 'sticky', bottom: 10, background: 'var(--color-surface)', border: '1px solid var(--color-primary)', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow)', marginTop: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            בחרת טיפים ששווים כ־{fmt(tipsSum)} ₪ בחודש 💰
          </div>
          {monthsSaved != null && monthsSaved > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--color-primary)', marginTop: 3 }}>
              אם תוסיף אותם לקצב החיסכון, תגיע ליעד כ־{monthsSaved} חודשים מוקדם יותר!
            </div>
          )}
          {monthsSaved != null && monthsSaved === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 3 }}>
              זה מוסיף מרווח נשימה, גם אם לא מקצר חודש שלם.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
