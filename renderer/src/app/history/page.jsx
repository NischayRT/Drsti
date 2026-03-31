'use client'

import { useState, useEffect } from 'react'
import { supabase, getUserSessions, deleteSession } from '../../lib/supabase'
import { SettingsProvider } from '../../lib/settings'
import AuthButton from '@/components/AuthButton'

// ── Routing ───────────────────────────────────────────────────────────────────
function navigate(path) {
  if (window.location.protocol === 'file:') {
    let href = window.location.href
    href = href
      .replace('/history/index.html', '')
      .replace('/analytics/index.html', '')
      .replace(/\/index\.html$/, '')
    if (path === '/') window.location.href = href + '/index.html'
    else window.location.href = href + '/' + path + '/index.html'
  } else {
    window.location.href = path === '/' ? '/' : '/' + path
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(sec) {
  if (!sec) return '0s'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtClock(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function HistoryContent() {
  const [user,     setUser]     = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    loadSessions()
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadSessions() {
    setLoading(true)
    const { data } = await getUserSessions(100)
    setSessions(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    setDeleting(id)
    await deleteSession(id)
    setSessions(s => s.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
    setDeleting(null)
  }

  // Compute streak for navbar pill
  const dayStreak = (() => {
    if (!sessions.length) return 0
    const days = [...new Set(sessions.map(s => new Date(s.created_at).toDateString()))].map(d => new Date(d)).sort((a, b) => b - a)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const latest = new Date(days[0]); latest.setHours(0, 0, 0, 0)
    if (Math.round((today - latest) / 86400000) > 1) return 0
    let current = 1
    for (let i = 1; i < days.length; i++) {
      const d1 = new Date(days[i - 1]); d1.setHours(0,0,0,0)
      const d2 = new Date(days[i]);     d2.setHours(0,0,0,0)
      if (Math.round((d1 - d2) / 86400000) === 1) current++
      else break
    }
    return current
  })()

  // Group by date
  const grouped = sessions.reduce((acc, s) => {
    const day = new Date(s.created_at).toDateString()
    if (!acc[day]) acc[day] = []
    acc[day].push(s)
    return acc
  }, {})

  const gradeColor = (pct) =>
    pct >= 90 ? 'var(--accent)' : pct >= 70 ? 'var(--teal)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', paddingBottom: 60 }}>

      {/* ── Navbar (matches page.js) ── */}
      <div className="nav-header" style={{
        height: 56, minHeight: 56,
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Left: back arrow + logo dot + wordmark + divider + page label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/')}
            title="Back to home"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border-2)',
              cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--red)' }}/>
            </div>
            <span style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '0.2em' }}>Drsti</span>
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border-2)' }}/>
          <span style={{ fontSize: 13, color: 'var(--text-3)', letterSpacing: '0.18em' }}>MY SESSIONS</span>
        </div>

        {/* Right: streak pill + AuthButton */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {user && (
            <div title="Current Streak" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 20 }}>
              🔥
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                {dayStreak} <span style={{ color: 'var(--text-4)', fontSize: 12 }}>Day{dayStreak !== 1 ? 's' : ''}</span>
              </span>
            </div>
          )}
          <AuthButton />
        </div>
      </div>

      <div className="history-container" style={{ display: 'flex', maxWidth: 1000, margin: '0 auto', padding: '36px 32px', gap: 24, minHeight: 'calc(100vh - 56px)' }}>

        {/* Left: session list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && (
            <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)', fontSize: 14, letterSpacing: '0.14em', fontWeight: 500 }}>
              LOADING HISTORY...
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div style={{ padding: 80, textAlign: 'center', background: 'var(--bg-3)', borderRadius: 16, border: '1px solid var(--border-2)' }}>
              <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 500, marginBottom: 10 }}>No sessions found.</div>
              <div style={{ fontSize: 15, color: 'var(--text-3)' }}>Complete focus sessions to see your history here.</div>
            </div>
          )}

          {Object.entries(grouped).map(([day, daySessions]) => (
            <div key={day} style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', letterSpacing: '0.18em', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                {day.toUpperCase()}
                <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }}/>
                <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{daySessions.length} sessions</span>
              </div>

              {daySessions.map(s => {
                const isSelected = selected?.id === s.id
                return (
                  <div
                    key={s.id}
                    className="session-item"
                    onClick={() => setSelected(isSelected ? null : s)}
                    style={{
                      padding: '16px 20px', borderRadius: 14, marginBottom: 8, cursor: 'pointer',
                      background: isSelected ? 'var(--surface)' : 'var(--bg-3)',
                      border: `1px solid ${isSelected ? 'var(--border-3)' : 'var(--border-2)'}`,
                      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 16,
                    }}
                  >
                    {/* Focus % circle */}
                    <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, border: `2px solid ${gradeColor(s.focus_pct)}`, opacity: isSelected ? 1 : 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 14, color: gradeColor(s.focus_pct), fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.focus_pct}%</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{fmtTime(s.duration)} session</span>
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>·</span>
                        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{fmtClock(s.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>{fmtTime(s.focus_time)} focused</span>
                        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{fmtTime(Math.max(0, s.duration - s.focus_time))} away</span>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                      disabled={deleting === s.id}
                      style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'transparent', border: '1px solid var(--border-3)', color: deleting === s.id ? 'var(--text-4)' : 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.color = 'var(--text-3)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Right: detail panel */}
        <div className={`detail-panel ${selected ? 'open' : ''}`} style={{ width: 300, flexShrink: 0 }} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          {selected ? (
            <div className="detail-content" style={{ position: 'sticky', top: 84, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.16em', marginBottom: 8, fontWeight: 600 }}>DETAILS</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2, fontWeight: 500 }}>{fmtDate(selected.created_at)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{fmtClock(selected.created_at)}</div>
                </div>
                <button className="mobile-close-btn" onClick={() => setSelected(null)} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-2)', cursor: 'pointer', borderRadius: 8, color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: '4px 8px' }}>×</button>
              </div>

              <div style={{ padding: '28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 56, color: gradeColor(selected.focus_pct), fontWeight: 300, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{selected.focus_pct}%</div>
                <div style={{ fontSize: 14, color: gradeColor(selected.focus_pct), opacity: 0.8, letterSpacing: '0.14em', marginTop: 10, fontWeight: 600 }}>
                  {selected.focus_pct >= 90 ? 'EXCELLENT' : selected.focus_pct >= 70 ? 'GOOD' : selected.focus_pct >= 50 ? 'FAIR' : 'KEEP GOING'}
                </div>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {[
                  { label: 'DURATION', value: fmtTime(selected.duration) },
                  { label: 'FOCUSED',  value: fmtTime(selected.focus_time), color: 'var(--accent)' },
                  { label: 'AWAY',     value: fmtTime(Math.max(0, selected.duration - selected.focus_time)), color: 'var(--red)' },
                ].map(({ label, value, color: c }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-2)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-3)', letterSpacing: '0.12em', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 14, color: c || 'var(--text)', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {selected.timeline?.length > 0 && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.14em', marginBottom: 10, fontWeight: 600 }}>MINUTE BY MINUTE</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 44 }}>
                    {selected.timeline.map(({ minute, focus_pct }) => (
                      <div key={minute} title={`Min ${minute + 1}: ${focus_pct}%`} style={{ flex: 1, borderRadius: 2, height: `${Math.max(focus_pct, 5)}%`, background: focus_pct >= 70 ? 'var(--accent)' : focus_pct >= 40 ? 'var(--yellow)' : 'var(--red)', opacity: 0.85 }}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder-panel" style={{ position: 'sticky', top: 84, padding: 32, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-3)', letterSpacing: '0.1em', lineHeight: 2, fontWeight: 500 }}>
                SELECT A SESSION<br/>TO SEE DETAILS
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        .mobile-close-btn { display: none; }
        @media (max-width: 768px) {
          .nav-header { padding: 0 12px !important; }
          .history-container { flex-direction: column; padding: 20px 16px !important; gap: 16px !important; }
          .session-item { padding: 12px 14px !important; }
          .detail-panel { width: 100% !important; display: none; }
          .detail-panel.open {
            display: flex; position: fixed; inset: 0; z-index: 200;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
            padding: 20px; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
          }
          .detail-content {
            width: 100% !important; max-width: 440px;
            position: relative !important; top: 0 !important;
            max-height: 85vh; overflow-y: auto;
            box-shadow: 0 24px 80px rgba(0,0,0,0.3);
            animation: scaleUp 0.2s ease;
          }
          .placeholder-panel { display: none !important; }
          .mobile-close-btn { display: block; }
        }
        @keyframes fadeIn  { from { opacity: 0; }            to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
      `}</style>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <SettingsProvider>
      <HistoryContent />
    </SettingsProvider>
  )
}