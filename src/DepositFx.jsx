// src/DepositFx.jsx
// אנימציות החיסכון בסגנון מצויר:
// 1. מטבע זהב משוגר משדה הסכום אל קופת החזירון בכל הפקדה.
// 2. החזירון נהיה שמח יותר ככל שמתקרבים ליעד, ומ־75% מקבל עיני כוכבים.
// 3. בהגעה ל־100% בתוך הסשן: פיצוץ עשיר עם גשם של שטרות ומטבעות ונצנוצים,
//    ובמקומו נשאר אוצר: שק כסף, חבילות שטרות וטורים של מטבעות זהב.
//    בכניסה חוזרת לדף כשהיעד כבר הושלם מוצג האוצר בלבד, בלי פיצוץ.
import { forwardRef, useEffect, useRef, useState } from 'react'

// משתמשים שביקשו פחות אנימציות במערכת ההפעלה מקבלים חוויה שקטה
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- ציור החזירון, ההבעה משתנה לפי אחוז ההתקדמות ----------

const SMILES = [
  null,
  'M 202,240 q 18,8 36,0',
  'M 197,239 q 23,14 46,0',
  'M 192,238 q 28,19 56,0',
]

// כוכב חמש קצוות, ממורכז ב־0,0
const STAR_D = 'M0,-13 L3.2,-4.5 L12.4,-4 L5.2,1.7 L7.6,10.5 L0,5.5 L-7.6,10.5 L-5.2,1.7 L-12.4,-4 L-3.2,-4.5 Z'

function PigDrawing({ pct = 0 }) {
  const stage = pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0
  const blushR = [8, 9, 10, 11.5][stage]
  const blushO = [0.35, 0.5, 0.65, 0.85][stage]
  const body = (
    <g className="pigBody">
      <rect x="156" y="256" width="21" height="34" rx="9" fill="#f9a9c7" stroke="#46342e" strokeWidth="6" />
      <rect x="196" y="260" width="21" height="32" rx="9" fill="#f9a9c7" stroke="#46342e" strokeWidth="6" />
      <rect x="236" y="260" width="21" height="32" rx="9" fill="#f9a9c7" stroke="#46342e" strokeWidth="6" />
      <rect x="272" y="256" width="21" height="34" rx="9" fill="#f9a9c7" stroke="#46342e" strokeWidth="6" />
      <path d="M 320,198 c 18,-4 24,8 14,15 c -9,6 -18,-1 -10,-9" fill="none" stroke="#46342e" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M 154,134 C 144,110 154,94 172,92 C 181,104 181,120 172,131 Z" fill="#f38fb6" stroke="#46342e" strokeWidth="6" strokeLinejoin="round" />
      <path d="M 286,132 C 296,108 286,92 268,90 C 259,102 259,118 268,129 Z" fill="#f38fb6" stroke="#46342e" strokeWidth="6" strokeLinejoin="round" />
      <path d="M 118,198 C 113,152 152,119 220,117 C 289,115 329,151 325,199 C 321,244 285,274 219,274 C 153,276 123,243 118,198 Z"
        fill="#f9a9c7" stroke="#46342e" strokeWidth="6.5" strokeLinejoin="round" />
      <path d="M 148,152 l 15,-11 M 141,167 l 17,-12 M 137,183 l 15,-11" stroke="#ef8fb4" strokeWidth="4" strokeLinecap="round" />
      <g className="pigEyeO">
        {stage < 3 && <circle cx="184" cy="178" r="6.5" fill="#46342e" />}
        {stage < 3 && <circle cx="256" cy="176" r="6.5" fill="#46342e" />}
        {stage >= 3 && (
          <g className="starEye">
            <path transform="translate(184,177) scale(1.2)" d={STAR_D} fill="#ffd24d" stroke="#46342e" strokeWidth="2.8" strokeLinejoin="round" />
            <circle cx="180" cy="171" r="2" fill="#fff" />
          </g>
        )}
        {stage >= 3 && (
          <g className="starEye se2">
            <path transform="translate(256,175) scale(1.2)" d={STAR_D} fill="#ffd24d" stroke="#46342e" strokeWidth="2.8" strokeLinejoin="round" />
            <circle cx="252" cy="169" r="2" fill="#fff" />
          </g>
        )}
      </g>
      <g className="pigEyeH" fill="none" stroke="#46342e" strokeWidth="6" strokeLinecap="round">
        <path d="M 174,180 q 10,-11 20,0" />
        <path d="M 246,178 q 10,-11 20,0" />
      </g>
      <circle cx="163" cy="206" r={blushR} fill="#f77fae" opacity={blushO} />
      <circle cx="277" cy="204" r={blushR} fill="#f77fae" opacity={blushO} />
      <ellipse cx="220" cy="210" rx="31" ry="22" fill="#fbc7db" stroke="#46342e" strokeWidth="6" />
      <ellipse cx="210" cy="210" rx="3.8" ry="6.8" fill="#46342e" />
      <ellipse cx="230" cy="210" rx="3.8" ry="6.8" fill="#46342e" />
      {SMILES[stage] && <path d={SMILES[stage]} fill="none" stroke="#46342e" strokeWidth="5" strokeLinecap="round" />}
      <rect x="192" y="115" width="56" height="12" rx="6" fill="#46342e" transform="rotate(-3 220 121)" />
    </g>
  )
  return stage >= 3 ? <g className="pigIdle">{body}</g> : body
}

// ---------- האוצר: שק כסף, חבילות שטרות וטורי מטבעות ----------

function BillPack({ x, y, rot = 0 }) {
  return (
    <g transform={'translate(' + x + ',' + y + ') rotate(' + rot + ')'}>
      <rect x="-34" y="-11" width="68" height="22" rx="4" fill="#8bc34a" stroke="#3c5a2a" strokeWidth="4.5" />
      <rect x="-34" y="-11" width="68" height="7" rx="3" fill="#a5d16f" stroke="none" />
      <rect x="-9" y="-11" width="18" height="22" fill="#e8f2d8" stroke="#3c5a2a" strokeWidth="3" />
    </g>
  )
}

function CoinStack({ x, count }) {
  const coins = []
  for (let i = 0; i < count; i++) {
    coins.push(
      <g key={i}>
        <ellipse cx={x} cy={288 - i * 10} rx="17" ry="7.5" fill={i === count - 1 ? '#ffd35c' : '#f8c94b'} stroke="#46342e" strokeWidth="4" />
        {i === count - 1 && <ellipse cx={x} cy={288 - i * 10 - 1.5} rx="11" ry="4" fill="none" stroke="#dfa716" strokeWidth="2" />}
      </g>
    )
  }
  return <g>{coins}</g>
}

function TreasureDrawing() {
  return (
    <g className="treasureBody">
      {/* חבילות שטרות מאחור משמאל */}
      <BillPack x={150} y={276} rot={-4} />
      <BillPack x={144} y={254} rot={3} />
      <BillPack x={154} y={232} rot={-2} />
      <BillPack x={130} y={284} rot={6} />
      {/* שק הכסף */}
      <path d="M 174,290 C 160,240 192,200 213,193 L 241,193 C 264,202 292,244 280,290 Z"
        fill="#d9a066" stroke="#46342e" strokeWidth="6" strokeLinejoin="round" />
      <path d="M 205,190 l -10,-17 l 15,7 Z" fill="#c88a4e" stroke="#46342e" strokeWidth="5" strokeLinejoin="round" />
      <path d="M 248,190 l 12,-15 l -17,5 Z" fill="#c88a4e" stroke="#46342e" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="227" cy="191" rx="19" ry="8" fill="#c88a4e" stroke="#46342e" strokeWidth="5" />
      <path d="M 186,262 q 4,-34 22,-52" stroke="#f3c68f" strokeWidth="5" strokeLinecap="round" fill="none" />
      <text x="228" y="262" textAnchor="middle" fontSize="46" fontWeight="bold" fill="#2f6b33"
        fontFamily="Segoe Print, Comic Sans MS, cursive">₪</text>
      {/* טורי מטבעות מימין */}
      <CoinStack x={300} count={5} />
      <CoinStack x={330} count={3} />
      {/* מטבע עומד עם ברק */}
      <circle cx="185" cy="274" r="15" fill="#ffd35c" stroke="#46342e" strokeWidth="4.5" />
      <text x="185" y="280" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#8d6a0c">₪</text>
      {/* נצנוצים */}
      <path className="glint g1" transform="translate(160,205)" d="M0,-9 L2.5,-2.5 L9,0 L2.5,2.5 L0,9 L-2.5,2.5 L-9,0 L-2.5,-2.5 Z" fill="#fff" stroke="#46342e" strokeWidth="2" />
      <path className="glint g2" transform="translate(305,236)" d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill="#ffe9a8" stroke="#46342e" strokeWidth="2" />
      <path className="glint g3" transform="translate(258,180)" d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill="#fff" stroke="#46342e" strokeWidth="2" />
    </g>
  )
}

// ---------- הפיצוץ: הבזק, התפרצות, גשם שטרות ומטבעות ונצנוצים ----------

const coinPiece = s => '<svg width="' + s + '" height="' + s + '" viewBox="-13 -13 26 26">'
  + '<circle r="11" fill="#f8c94b" stroke="#46342e" stroke-width="3"/>'
  + '<text y="4.5" font-size="11" text-anchor="middle" font-weight="bold" fill="#8d6a0c">₪</text></svg>'

const billPiece = () => '<svg width="42" height="22" viewBox="0 0 42 22">'
  + '<rect x="1.5" y="1.5" width="39" height="19" rx="3.5" fill="#8bc34a" stroke="#3c5a2a" stroke-width="2.5"/>'
  + '<circle cx="21" cy="11" r="6" fill="#a5d16f" stroke="#3c5a2a" stroke-width="1.8"/>'
  + '<text x="21" y="15" font-size="9" text-anchor="middle" font-weight="bold" fill="#2d461f">₪</text></svg>'

const sparklePiece = s => '<svg width="' + s * 2 + '" height="' + s * 2 + '" viewBox="-10 -10 20 20">'
  + '<path d="M0,-9 L1.8,-1.8 L9,0 L1.8,1.8 L0,9 L-1.8,1.8 L-9,0 L-1.8,-1.8 Z" fill="#fff"/></svg>'

function goldBurst(svgEl) {
  if (!svgEl || reducedMotion()) return
  try {
    const r = svgEl.getBoundingClientRect()
    const x0 = r.left + r.width / 2
    const y0 = r.top + r.height * 0.5
    const vw = window.innerWidth
    const vh = window.innerHeight
    const ov = document.createElement('div')
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
    document.body.appendChild(ov)

    // הבזק וגלי הדף
    for (const [color, delay, max] of [['#ffd24d', 0, 5], ['#ffffff', 130, 6.5]]) {
      const ring = document.createElement('div')
      ring.style.cssText = 'position:fixed;left:' + x0 + 'px;top:' + y0 + 'px;width:70px;height:70px;'
        + 'margin:-35px 0 0 -35px;border:6px solid ' + color + ';border-radius:50%;opacity:0'
      ov.appendChild(ring)
      ring.animate([
        { transform: 'scale(.15)', opacity: 0.95 },
        { transform: 'scale(' + max + ')', opacity: 0 },
      ], { duration: 620, delay, easing: 'ease-out', fill: 'both' })
    }

    // התפרצות רדיאלית מהחזירון
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('div')
      el.style.cssText = 'position:fixed;left:0;top:0;opacity:0'
      el.innerHTML = i % 3 === 2 ? billPiece() : coinPiece(16 + Math.round(Math.random() * 12))
      ov.appendChild(el)
      const ang = (-90 + (Math.random() * 260 - 130)) * Math.PI / 180
      const sp = 110 + Math.random() * 170
      const vx = Math.cos(ang) * sp
      const vy = Math.sin(ang) * sp
      const rot = Math.random() * 900 - 450
      el.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (x0 + vx) + 'px,' + (y0 + vy) + 'px) rotate(' + rot * 0.6 + 'deg)', opacity: 1, offset: 0.5 },
        { transform: 'translate(' + (x0 + vx * 1.3) + 'px,' + (y0 + vy + 150) + 'px) rotate(' + rot + 'deg)', opacity: 0 },
      ], { duration: 1350, delay: i * 10, easing: 'cubic-bezier(.18,.6,.45,1)', fill: 'both' })
    }

    // גשם של שטרות ומטבעות מלמעלה
    for (let i = 0; i < 38; i++) {
      const el = document.createElement('div')
      el.style.cssText = 'position:fixed;left:0;top:0;opacity:0'
      el.innerHTML = i % 2 === 0 ? billPiece() : coinPiece(15 + Math.round(Math.random() * 11))
      ov.appendChild(el)
      const x = Math.min(vw - 30, Math.max(10, x0 + (Math.random() * 640 - 320)))
      const sway = Math.random() * 70 - 35
      const endY = Math.min(vh - 30, y0 + 260 + Math.random() * 160)
      const rot = Math.random() * 540 - 270
      el.animate([
        { transform: 'translate(' + x + 'px,-40px) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (x + sway) + 'px,' + ((endY - 40) * 0.55) + 'px) rotate(' + rot * 0.6 + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (x + sway * 1.6) + 'px,' + endY + 'px) rotate(' + rot + 'deg)', opacity: 0 },
      ], { duration: 1500 + Math.random() * 800, delay: 150 + Math.random() * 850, easing: 'cubic-bezier(.3,.4,.6,1)', fill: 'both' })
    }

    // נצנוצים לבנים מהבהבים
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('div')
      const s = 6 + Math.round(Math.random() * 8)
      el.style.cssText = 'position:fixed;left:' + (x0 + (Math.random() * 560 - 280)) + 'px;top:'
        + Math.max(10, y0 + (Math.random() * 480 - 300)) + 'px;opacity:0'
      el.innerHTML = sparklePiece(s)
      ov.appendChild(el)
      el.animate([
        { transform: 'scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'scale(1.2) rotate(20deg)', opacity: 1, offset: 0.4 },
        { transform: 'scale(0) rotate(45deg)', opacity: 0 },
      ], { duration: 750, delay: Math.random() * 1700, fill: 'both' })
    }

    setTimeout(() => ov.remove(), 3200)
  } catch { /* קישוט בלבד */ }
}

// ---------- הקומפוננטה הראשית ----------

export const PiggyBank = forwardRef(function PiggyBank({ width = 130, pct = 0 }, ref) {
  const inner = useRef(null)
  const done = pct >= 100
  // בטעינה ראשונה עם יעד שכבר הושלם מציגים אוצר מיד, בלי פיצוץ
  const [phase, setPhase] = useState(done ? 'treasure' : 'pig')
  const prevDone = useRef(done)
  const fromBoom = useRef(false)

  useEffect(() => {
    if (done && !prevDone.current) {
      prevDone.current = true
      if (reducedMotion()) {
        fromBoom.current = false
        setPhase('treasure')
        return
      }
      fromBoom.current = true
      setPhase('boom')
      const b = setTimeout(() => goldBurst(inner.current), 930)
      const t = setTimeout(() => setPhase('treasure'), 1120)
      return () => { clearTimeout(b); clearTimeout(t) }
    }
    if (!done && prevDone.current) {
      prevDone.current = false
      fromBoom.current = false
      setPhase('pig')
    }
  }, [done])

  const setRefs = el => {
    inner.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  return (
    <svg ref={setRefs} width={width} viewBox="100 76 250 224" xmlns="http://www.w3.org/2000/svg"
      aria-label="קופת חיסכון" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="222" cy="292" rx="112" ry="8" fill="var(--color-surface-2)" />
      {phase !== 'treasure' && (
        <g className={phase === 'boom' ? 'pigBoom' : undefined}>
          <PigDrawing pct={pct} />
        </g>
      )}
      {phase === 'treasure' && (
        <g className={fromBoom.current ? 'treasurePop' : undefined}>
          <TreasureDrawing />
        </g>
      )}
    </svg>
  )
})

// ---------- מעוף המטבע מהטופס אל הקופה ----------

const SLOT_X = (220 - 100) / 250
const SLOT_Y = (121 - 76) / 224

const COIN_SVG = '<svg width="44" height="44" viewBox="-26 -26 52 52" xmlns="http://www.w3.org/2000/svg">'
  + '<circle r="23" fill="#f8c94b" stroke="#46342e" stroke-width="5"/>'
  + '<circle r="15.5" fill="none" stroke="#dfa716" stroke-width="2.5" stroke-dasharray="6 5"/>'
  + '<path d="M -12,-12 q 8,-8 16,-5" stroke="#ffe9a8" stroke-width="4.5" stroke-linecap="round" fill="none"/>'
  + '<text y="8" text-anchor="middle" font-family="Segoe Print, Comic Sans MS, cursive" font-size="19" font-weight="bold" fill="#8d6a0c">₪</text>'
  + '</svg>'

const starSvg = (s, c) => '<svg width="' + s * 2 + '" height="' + s * 2 + '" viewBox="-12 -12 24 24">'
  + '<path d="M0,-11 L3,-3 L11,0 L3,3 L0,11 L-3,3 L-11,0 L-3,-3 Z" fill="' + c + '" stroke="#46342e" stroke-width="2"/></svg>'

// נקודות לאורך קשת בזייה ריבועית, בלי תלות ב־offset-path של הדפדפן
function arcFrames(x1, y1, x2, y2, n) {
  const cx = (x1 + x2) / 2 + 46
  const cy = Math.min(y1, y2) - 110
  const frames = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const mt = 1 - t
    const px = mt * mt * x1 + 2 * mt * t * cx + t * t * x2
    const py = mt * mt * y1 + 2 * mt * t * cy + t * t * y2
    frames.push({
      transform: 'translate(' + px + 'px,' + py + 'px) scale(' + (i === 0 ? 0.3 : 1) + ')',
      opacity: i === 0 ? 0 : 1,
      offset: t,
    })
  }
  return frames
}

let liveOverlay = null

export function flyCoin({ fromEl, pigEl, amount }) {
  if (!pigEl || typeof document === 'undefined' || reducedMotion()) return
  try {
    if (liveOverlay) { liveOverlay.remove(); liveOverlay = null }

    const p = pigEl.getBoundingClientRect()
    const x2 = p.left + p.width * SLOT_X
    const y2 = p.top + p.height * SLOT_Y

    const ov = document.createElement('div')
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
    document.body.appendChild(ov)
    liveOverlay = ov

    const flyMs = fromEl ? 1050 : 0

    if (fromEl) {
      const r = fromEl.getBoundingClientRect()
      const x1 = r.left + r.width / 2
      const y1 = r.top + 4
      const coin = document.createElement('div')
      coin.style.cssText = 'position:fixed;left:-22px;top:-22px;width:44px;height:44px;opacity:0'
      coin.innerHTML = COIN_SVG
      ov.appendChild(coin)
      coin.animate(arcFrames(x1, y1, x2, y2, 16),
        { duration: flyMs, easing: 'cubic-bezier(.45,.08,.5,1)', fill: 'forwards' })
      coin.firstElementChild.animate(
        [{ transform: 'rotate(-40deg)' }, { transform: 'rotate(430deg)' }],
        { duration: flyMs, easing: 'ease-out', fill: 'forwards' }
      )
      setTimeout(() => {
        coin.animate([
          { transform: 'translate(' + x2 + 'px,' + y2 + 'px) scale(1)', opacity: 1 },
          { transform: 'translate(' + x2 + 'px,' + (y2 + 3) + 'px) scale(1.25,.08)', opacity: 0 },
        ], { duration: 190, easing: 'ease-in', fill: 'forwards' })
      }, flyMs - 40)
    }

    setTimeout(() => {
      pigEl.classList.add('pig-go')
      setTimeout(() => pigEl.classList.remove('pig-go'), 1450)

      const stars = [
        { dx: -56, dy: -4, s: 11, c: '#f8c94b', d: 0 },
        { dx: 52, dy: -14, s: 9, c: '#ff9ec2', d: 90 },
        { dx: 32, dy: -50, s: 8, c: '#f8c94b', d: 170 },
        { dx: -40, dy: -46, s: 8, c: '#9ccb7f', d: 250 },
      ]
      for (const st of stars) {
        const el = document.createElement('div')
        el.style.cssText = 'position:fixed;left:' + (x2 + st.dx - st.s) + 'px;top:' + (y2 + st.dy - st.s) + 'px;opacity:0'
        el.innerHTML = starSvg(st.s, st.c)
        ov.appendChild(el)
        el.animate([
          { transform: 'scale(0) rotate(0deg)', opacity: 0 },
          { transform: 'scale(1.35) rotate(16deg)', opacity: 1, offset: 0.35 },
          { transform: 'scale(1) rotate(26deg)', opacity: 1, offset: 0.6 },
          { transform: 'scale(0) rotate(40deg)', opacity: 0 },
        ], { duration: 620, delay: st.d, fill: 'both' })
      }

      const plus = document.createElement('div')
      plus.textContent = '+' + Number(amount || 0).toLocaleString('he-IL') + ' ₪'
      plus.style.cssText = 'position:fixed;left:' + x2 + 'px;top:' + (y2 - 16) + 'px;opacity:0;'
        + "font-family:'Segoe Print','Comic Sans MS',cursive;font-weight:700;font-size:22px;color:#43a047;"
        + 'text-shadow:0 0 8px var(--color-bg),0 0 3px var(--color-bg);white-space:nowrap'
      ov.appendChild(plus)
      plus.animate([
        { transform: 'translateX(-50%) translateY(10px)', opacity: 0 },
        { transform: 'translateX(-50%) translateY(-12px)', opacity: 1, offset: 0.22 },
        { transform: 'translateX(-50%) translateY(-30px)', opacity: 1, offset: 0.68 },
        { transform: 'translateX(-50%) translateY(-48px)', opacity: 0 },
      ], { duration: 1200, delay: 60, easing: 'ease-out', fill: 'both' })
    }, flyMs)

    setTimeout(() => { ov.remove(); if (liveOverlay === ov) liveOverlay = null }, flyMs + 1700)
  } catch {
    // האנימציה היא קישוט, היא לעולם לא מפילה את זרימת ההפקדה
  }
}
