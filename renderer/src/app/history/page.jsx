'use client'

import { useState, useEffect } from 'react'
import { supabase, getUserSessions, deleteSession } from '../../lib/supabase'

function fmtTime(sec) {
  if (!sec) return '0s'
  const m = Math.floor(sec / 60), s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtClock(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryPage() {
  const [user,     setUser]     = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadSessions()
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

  // Group by date
  const grouped = sessions.reduce((acc, s) => {
    const day = new Date(s.created_at).toDateString()
    if (!acc[day]) acc[day] = []
    acc[day].push(s)
    return acc
  }, {})

  const gradeColor = (pct) =>
    pct >= 90 ? '#c8f04a' : pct >= 70 ? '#4af0d4' : pct >= 50 ? '#f0c84a' : '#f06a4a'

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      fontFamily: "'JetBrains Mono', monospace", color: '#e8e8e8',
    }}>

      {/* Nav */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 28px', borderBottom: '1px solid #141414',
        background: '#0a0a0a',
      }}>
        <button onClick={() => {
          if (window.location.protocol === 'file:') {
            const base = window.location.href.split('/').slice(0, -2).join('/')
            window.location.href = base + '/index.html'
          } else {
            window.location.href = '/'
          }
        }} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', color: '#484848',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          <span style={{ fontSize: 14, letterSpacing: '0.14em' }}>BACK</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#c1c1c1', letterSpacing: '0.2em' }}>SESSION HISTORY</span>
        </div>
        {user && (
          <span style={{ fontSize: 14, color: '#5f5f5f' }}>
            {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', maxWidth: 900, margin: '0 auto', padding: 28, gap: 20, minHeight: 'calc(100vh - 56px)' }}>

        {/* Left: session list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#626161', fontSize: 12, letterSpacing: '0.14em' }}>
              LOADING...
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#626161', letterSpacing: '0.14em', lineHeight: 2 }}>
                NO SESSIONS YET<br/>
                <span style={{ color: '#626161' }}>Complete a focus session to see your history</span>
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([day, daySessions]) => (
            <div key={day} style={{ marginBottom: 28 }}>
              {/* Day header */}
              <div style={{
                fontSize: 12, color: '#626161', letterSpacing: '0.18em',
                marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {day.toUpperCase()}
                <div style={{ flex: 1, height: 1, background: '#141414' }}/>
                <span style={{ color: '#626161' }}>{daySessions.length} sessions</span>
              </div>

              {daySessions.map(s => {
                const isSelected = selected?.id === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelected(isSelected ? null : s)}
                    style={{
                      padding: '14px 18px', borderRadius: 12, marginBottom: 6, cursor: 'pointer',
                      background: isSelected ? '#111' : '#0d0d0d',
                      border: `1px solid ${isSelected ? '#1e1e1e' : '#141414'}`,
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}
                  >
                    {/* Focus % circle */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${gradeColor(s.focus_pct)}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 13, color: gradeColor(s.focus_pct), fontWeight: 300 }}>
                        {s.focus_pct}%
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#c8c8c8' }}>
                          {fmtTime(s.duration)} session
                        </span>
                        <span style={{ fontSize: 12, color: '#282828' }}>·</span>
                        <span style={{ fontSize: 14, color: '#5f5f5f' }}>{fmtClock(s.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span style={{ fontSize: 14, color: '#c8f04a' }}>{fmtTime(s.focus_time)} focused</span>
                        <span style={{ fontSize: 14, color: '#5f5f5f' }}>
                          {fmtTime(Math.max(0, s.duration - s.focus_time))} away
                        </span>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                      disabled={deleting === s.id}
                      style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'transparent', border: '1px solid #1a1a1a',
                        color: deleting === s.id ? '#626161' : '#5f5f5f',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f06a4a30'; e.currentTarget.style.color = '#f06a4a' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#5f5f5f' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
        <div style={{ width: 260, flexShrink: 0 }}>
          {selected ? (
            <div style={{
              position: 'sticky', top: 28,
              background: '#0d0d0d', border: '1px solid #181818',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #141414' }}>
                <div style={{ fontSize: 12, color: '#626161', letterSpacing: '0.16em', marginBottom: 6 }}>DETAILS</div>
                <div style={{ fontSize: 12, color: '#484848', marginBottom: 2 }}>{fmtDate(selected.created_at)}</div>
                <div style={{ fontSize: 12, color: '#5f5f5f' }}>{fmtClock(selected.created_at)}</div>
              </div>

              {/* Big score */}
              <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #141414' }}>
                <div style={{ fontSize: 52, color: gradeColor(selected.focus_pct), fontWeight: 300, lineHeight: 1 }}>
                  {selected.focus_pct}%
                </div>
                <div style={{ fontSize: 14, color: gradeColor(selected.focus_pct), opacity: 0.6, letterSpacing: '0.14em', marginTop: 6 }}>
                  {selected.focus_pct >= 90 ? 'EXCELLENT' : selected.focus_pct >= 70 ? 'GOOD' : selected.focus_pct >= 50 ? 'FAIR' : 'KEEP GOING'}
                </div>
              </div>

              {/* Stats */}
              <div style={{ padding: '16px 20px' }}>
                {[
                  { label: 'DURATION',  value: fmtTime(selected.duration) },
                  { label: 'FOCUSED',   value: fmtTime(selected.focus_time), color: '#c8f04a' },
                  { label: 'AWAY',      value: fmtTime(Math.max(0, selected.duration - selected.focus_time)), color: '#f06a4a' },
                ].map(({ label, value, color: c }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid #111',
                  }}>
                    <span style={{ fontSize: 14, color: '#5f5f5f', letterSpacing: '0.12em' }}>{label}</span>
                    <span style={{ fontSize: 13, color: c || '#c8c8c8' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {selected.timeline?.length > 0 && (
                <div style={{ padding: '0 20px 20px' }}>
                  <div style={{ fontSize: 12, color: '#626161', letterSpacing: '0.14em', marginBottom: 8 }}>MINUTE BY MINUTE</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
                    {selected.timeline.map(({ minute, focus_pct }) => (
                      <div key={minute} title={`Min ${minute + 1}: ${focus_pct}%`} style={{
                        flex: 1, borderRadius: 2,
                        height: `${Math.max(focus_pct, 5)}%`,
                        background: focus_pct >= 70 ? '#c8f04a' : focus_pct >= 40 ? '#f0c84a' : '#f06a4a',
                        opacity: 0.8,
                      }}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: 24, background: '#0d0d0d', border: '1px solid #141414',
              borderRadius: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: '#626161', letterSpacing: '0.1em', lineHeight: 2 }}>
                SELECT A SESSION<br/>TO SEE DETAILS
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}