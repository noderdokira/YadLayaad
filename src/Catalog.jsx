import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const fmt = n => (n == null || n === '' ? '—' : Number(n).toLocaleString('he-IL'))

export default function Catalog() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  async function search(q) {
    setLoading(true)
    let req = supabase
      .from('products')
      .select('id, name, year, market_price, addons_once, monthly_cost, attrs')
      .eq('kind', 'car')
      .limit(50)
    if (q && q.trim()) {
      req = req.ilike('name', `%${q.trim()}%`).order('market_price', { ascending: true })
    } else {
      req = req.order('year', { ascending: false }).order('market_price', { ascending: true })
    }
    const { data, error } = await req
    setLoading(false)
    if (!error) setRows(data || [])
  }

  useEffect(() => { search('') }, [])

  const wrap = { maxWidth: 480, margin: '20px auto', fontFamily: 'sans-serif', direction: 'rtl', padding: 16 }
  const input = { width: '100%', padding: 10, marginBottom: 12, boxSizing: 'border-box', fontSize: 15 }
  const row = { padding: 12, borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10 }

  if (selected) {
    const a = selected.attrs || {}
    return (
      <div style={wrap}>
        <button onClick={() => setSelected(null)} style={{ marginBottom: 14, padding: '6px 10px' }}>חזרה</button>
        <h2 style={{ marginBottom: 4 }}>{selected.name}</h2>
        <div style={{ color: '#777', marginBottom: 16 }}>שנת {selected.year} · {a.importer || ''}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{fmt(selected.market_price)} ₪</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.9 }}>
          <div>מחיר שוק P: {fmt(selected.market_price)} ₪</div>
          <div>תוספות חד פעמיות K: לא זמין עדיין</div>
          <div>עלות חודשית M: לא זמין עדיין</div>
          {a.model_tech && <div style={{ marginTop: 10, color: '#999' }}>קוד יצרן: {a.model_tech}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <input
        style={input}
        placeholder="חפש לפי יצרן או דגם, למשל טויוטה"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') search(query) }}
      />
      <button onClick={() => search(query)} style={{ padding: '8px 14px', marginBottom: 12 }}>חיפוש</button>
      {loading && <div style={{ color: '#999' }}>טוען</div>}
      {!loading && rows.length === 0 && <div style={{ color: '#999' }}>לא נמצאו תוצאות</div>}
      {rows.map(v => (
        <div key={v.id} style={row} onClick={() => setSelected(v)}>
          <div>
            <div style={{ fontWeight: 700 }}>{v.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>שנת {v.year}</div>
          </div>
          <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(v.market_price)} ₪</div>
        </div>
      ))}
    </div>
  )
}
