// src/SavingsChart.jsx
// גרף הדרך לרכב: קו מצטבר של החיסכון, כולל נקודת הפתיחה, מול מחיר היעד.
// SVG נקי בלי ספריות, בסגנון שאר האפליקציה.
export default function SavingsChart({ deposits, saved0, price, startedAt }) {
  if (!(price > 0)) return null
  const asc = [...(deposits || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  if (asc.length < 1) return null
  const t0 = startedAt ? new Date(startedAt).getTime() : new Date(asc[0].created_at).getTime()
  let cum = saved0
  const pts = [{ t: t0, v: saved0 }]
  for (const d of asc) {
    cum += Number(d.amount) || 0
    pts.push({ t: new Date(d.created_at).getTime(), v: cum })
  }
  pts.push({ t: Date.now(), v: cum })

  const W = 320, H = 150, PL = 8, PR = 8, PT = 18, PB = 22
  const tMin = pts[0].t
  const tMax = Math.max(pts[pts.length - 1].t, tMin + 86400000)
  const vMax = Math.max(price, cum) * 1.06
  const x = t => PL + ((t - tMin) / (tMax - tMin)) * (W - PL - PR)
  const y = v => H - PB - (Math.max(0, v) / vMax) * (H - PT - PB)
  const line = pts.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ')
  const area = line + ' L' + x(tMax).toFixed(1) + ' ' + y(0).toFixed(1) + ' L' + x(tMin).toFixed(1) + ' ' + y(0).toFixed(1) + ' Z'
  const yT = y(price)
  const fmtM = t => { const d = new Date(t); return (d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2) }

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '8px 6px 2px', marginBottom: 14, direction: 'ltr' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', display: 'block' }} role="img" aria-label="גרף החיסכון המצטבר">
        <line x1={PL} y1={yT} x2={W - PR} y2={yT} stroke="var(--color-warn)" strokeDasharray="5 4" strokeWidth="1.5" />
        <text x={W - PR - 2} y={yT - 5} textAnchor="end" fontSize="10" fill="var(--color-warn)">מחיר הרכב</text>
        <path d={area} fill="var(--color-primary)" opacity="0.13" />
        <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.slice(1, -1).map((p, i) => (
          <circle key={i} cx={x(p.t)} cy={y(p.v)} r="3" fill="var(--color-primary)" />
        ))}
        <text x={PL + 2} y={H - 7} fontSize="10" fill="var(--color-text-muted)">{fmtM(tMin)}</text>
        <text x={W - PR - 2} y={H - 7} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">{fmtM(tMax)}</text>
      </svg>
    </div>
  )
}
