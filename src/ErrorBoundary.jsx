// src/ErrorBoundary.jsx
// רשת ביטחון: שגיאת ריצה בקומפוננטה אחת לא תפיל יותר את כל האפליקציה
// למסך לבן, אלא תציג הודעה ידידותית עם כפתור רענון.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // לוג לקונסול בלבד; אין שירות טלמטריה
    console.error('שגיאה לא צפויה:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ maxWidth: 420, margin: '80px auto', direction: 'rtl', padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🐷💦</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>משהו השתבש</div>
        <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          קרתה שגיאה לא צפויה. החיסכון שלך שמור ובטוח, זו רק תקלת תצוגה.
        </div>
        <button
          className="btn-primary"
          style={{ padding: '10px 22px', borderRadius: 10, fontSize: 15 }}
          onClick={() => window.location.reload()}
        >
          רענון האפליקציה
        </button>
      </div>
    )
  }
}
