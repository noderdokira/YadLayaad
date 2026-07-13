// src/DepositFx.jsx
// אנימציית הפקדה בסגנון מצויר: מטבע זהב משוגר משדה הסכום, עף בקשת
// מסתובבת ונכנס לחריץ של קופת החזירון, שקופצת בשמחה עם ניצוצות והסכום.
// מופעלת אחרי כל הפקדה מוצלחת במסך מעקב החיסכון.
import { forwardRef } from 'react'

export const PiggyBank = forwardRef(function PiggyBank({ width = 130 }, ref) {
  return (
    <svg ref={ref} width={width} viewBox="100 76 250 224" xmlns="http://www.w3.org/2000/svg"
      aria-label="קופת חיסכון" style={{ display: 'block' }}>
      <ellipse cx="222" cy="292" rx="112" ry="8" fill="var(--color-surface-2)" />
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
          <circle cx="184" cy="178" r="6.5" fill="#46342e" />
          <circle cx="256" cy="176" r="6.5" fill="#46342e" />
        </g>
        <g className="pigEyeH" fill="none" stroke="#46342e" strokeWidth="6" strokeLinecap="round">
          <path d="M 174,180 q 10,-11 20,0" />
          <path d="M 246,178 q 10,-11 20,0" />
        </g>
        <circle cx="163" cy="206" r="9" fill="#f77fae" opacity=".55" />
        <circle cx="277" cy="204" r="9" fill="#f77fae" opacity=".55" />
        <ellipse cx="220" cy="210" rx="31" ry="22" fill="#fbc7db" stroke="#46342e" strokeWidth="6" />
        <ellipse cx="210" cy="210" rx="3.8" ry="6.8" fill="#46342e" />
        <ellipse cx="230" cy="210" rx="3.8" ry="6.8" fill="#46342e" />
        <rect x="192" y="115" width="56" height="12" rx="6" fill="#46342e" transform="rotate(-3 220 121)" />
      </g>
    </svg>
  )
})

// מיקום החריץ ביחס לגבולות ה־SVG (לפי ה־viewBox שלמעלה)
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

let liveOverlay = null

export function flyCoin({ fromEl, pigEl, amount }) {
  if (!pigEl || typeof document === 'undefined') return
  try {
    if (liveOverlay) { liveOverlay.remove(); liveOverlay = null }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canFly = !!fromEl && !reduce
      && typeof CSS !== 'undefined' && CSS.supports && CSS.supports('offset-distance', '0%')

    const p = pigEl.getBoundingClientRect()
    const x2 = p.left + p.width * SLOT_X
    const y2 = p.top + p.height * SLOT_Y

    const ov = document.createElement('div')
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
    document.body.appendChild(ov)
    liveOverlay = ov

    const flyMs = canFly ? 1050 : 0

    if (canFly) {
      const r = fromEl.getBoundingClientRect()
      const x1 = r.left + r.width / 2
      const y1 = r.top + 4
      const arc = 'M ' + x1 + ',' + y1
        + ' Q ' + ((x1 + x2) / 2 + 46) + ',' + (Math.min(y1, y2) - 110)
        + ' ' + x2 + ',' + y2
      const coin = document.createElement('div')
      coin.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;opacity:0;'
        + 'offset-path:path("' + arc + '");offset-rotate:0deg'
      coin.innerHTML = COIN_SVG
      ov.appendChild(coin)
      coin.animate([
        { offsetDistance: '0%', transform: 'scale(.3)', opacity: 0 },
        { offsetDistance: '6%', transform: 'scale(1.07)', opacity: 1, offset: 0.1 },
        { offsetDistance: '100%', transform: 'scale(1)', opacity: 1 },
      ], { duration: flyMs, easing: 'cubic-bezier(.42,.08,.48,1)', fill: 'forwards' })
      coin.firstElementChild.animate(
        [{ transform: 'rotate(-40deg)' }, { transform: 'rotate(430deg)' }],
        { duration: flyMs, easing: 'ease-out', fill: 'forwards' }
      )
      setTimeout(() => {
        coin.animate([
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.25,.08)', opacity: 0 },
        ], { duration: 190, easing: 'ease-in', fill: 'forwards' })
      }, flyMs - 30)
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
