def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (p, s.count(old), old[:60])
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)
    print('OK', p)

# ---------- Goal.jsx: תזכורת הפקדה חודשית + קישור יומן ----------
patch('src/Goal.jsx', [
(
"""export function GoalProgress({ profile, onBack, asTab = false }) {""",
"""// קישור ליצירת תזכורת חודשית ביומן גוגל, ליום השני בכל חודש (אחרי משכורת)
function calReminderUrl() {
  const d = new Date()
  if (d.getDate() > 2) d.setMonth(d.getMonth() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const start = y + m + '02'
  const end = y + m + '03'
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent('הפקדה לחיסכון לרכב 🚗')
    + '&details=' + encodeURIComponent('הרגע הכי טוב לחסוך: יום אחרי המשכורת. פותחים את יד ליעד ומפקידים.')
    + '&dates=' + start + '/' + end
    + '&recur=' + encodeURIComponent('RRULE:FREQ=MONTHLY;BYMONTHDAY=2')
}

export function GoalProgress({ profile, onBack, asTab = false }) {"""
),
(
"""  for (let k = monthsWithDeposit.has(nowKey) ? nowKey : nowKey - 1; monthsWithDeposit.has(k); k--) streak++""",
"""  for (let k = monthsWithDeposit.has(nowKey) ? nowKey : nowKey - 1; monthsWithDeposit.has(k); k--) streak++
  const thisMonthDeposit = monthsWithDeposit.has(nowKey)"""
),
(
"""      {streak >= 2 && !done && (""",
"""      {loaded && !done && !thisMonthDeposit && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-warn)', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12.5, lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 180 }}>🔔 עוד לא הפקדת החודש. שמירה על הרצף שווה יותר מגובה הסכום.</span>
          <a href={calReminderUrl()} target="_blank" rel="noreferrer" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
            קבע תזכורת חודשית ביומן
          </a>
        </div>
      )}
      {streak >= 2 && !done && ("""
),
])

# ---------- Auth.jsx: כניסת אורח ----------
patch('src/Auth.jsx', [
(
"""export default function Auth() {""",
"""export default function Auth({ onDemo }) {"""
),
(
"""      <button onClick={signUp} disabled={loading} style={{ width: '100%', padding: 8 }}>
        הרשמה
      </button>""",
"""      <button onClick={signUp} disabled={loading} style={{ width: '100%', padding: 8 }}>
        הרשמה
      </button>
      {onDemo && (
        <button onClick={onDemo} disabled={loading} style={{ width: '100%', padding: 8, marginTop: 6 }}>
          👀 להציץ בקטלוג בלי חשבון
        </button>
      )}"""
),
])

# ---------- App.jsx: מצב אורח ----------
patch('src/App.jsx', [
(
"""  const [recovery, setRecovery] = useState(false)""",
"""  const [recovery, setRecovery] = useState(false)
  const [demo, setDemo] = useState(false)"""
),
(
"""  if (!session) return <><Auth /><InstallPrompt /></>""",
"""  if (!session && demo) {
    return (
      <div className="app-shell">
        <div style={{ maxWidth: 1080, margin: '10px auto 0', padding: '0 16px', direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="wordmark">יד ליעד 🚗</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>מצב אורח</span>
            <button className="btn-primary" style={{ padding: '7px 14px' }} onClick={() => setDemo(false)}>
              הרשמה / התחברות
            </button>
          </div>
        </div>
        <Catalog profile={null} onProfileSaved={() => {}} demo onRequestAuth={() => setDemo(false)} />
        <InstallPrompt />
      </div>
    )
  }
  if (!session) return <><Auth onDemo={() => setDemo(true)} /><InstallPrompt /></>"""
),
])

# ---------- Catalog.jsx: התנהגות אורח ----------
patch('src/Catalog.jsx', [
(
"""export default function Catalog({ profile, onProfileSaved }) {""",
"""export default function Catalog({ profile, onProfileSaved, demo = false, onRequestAuth }) {"""
),
(
"""  async function toggleFav(id) {
    const prev = favIds""",
"""  async function toggleFav(id) {
    if (demo) { onRequestAuth?.(); return }
    const prev = favIds"""
),
(
"""        onStartGoal={total => setGoalDraft({ v: selected, m: total })}""",
"""        onStartGoal={total => { if (demo) { onRequestAuth?.(); return } setGoalDraft({ v: selected, m: total }) }}
        demo={demo}"""
),
(
"""function Detail({ v, profile, onBack, onProfileSaved, onStartGoal, compareSel = [], onToggleCompare }) {""",
"""function Detail({ v, profile, onBack, onProfileSaved, onStartGoal, compareSel = [], onToggleCompare, demo = false }) {"""
),
(
"""      {!hasDriver && (""",
"""      {!hasDriver && !demo && ("""
),
(
"""      <MatchTest
        profile={profile}
        onBack={() => setMode('list')}""",
"""      <MatchTest
        profile={profile}
        demo={demo}
        onBack={() => setMode('list')}"""
),
])

# ---------- MatchTest.jsx: בלי שמירה במצב אורח ----------
patch('src/MatchTest.jsx', [
(
"""export default function MatchTest({ profile, onPick, onBack }) {""",
"""export default function MatchTest({ profile, onPick, onBack, demo = false }) {"""
),
(
"""    else runMatch(a, true)""",
"""    else runMatch(a, !demo && !!profile)"""
),
])
print('PATCH8 ALL OK')
