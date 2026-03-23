'use client'

import { useEffect, useState } from 'react'
import { getUserSessions } from '../lib/supabase'
import SettingsPanel from './SettingsPanel'

function fmtFocusTime(s) {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  return `${sec}s`
}

function fmtSessionTime(s) {
  if (!s) return '0m'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Sidebar({ sessions, running, mode, user, totalFocusTime = 0 }) {
  const [history,      setHistory]      = useState([])
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserSessions().then(({ data }) => { if (data) setHistory(data.slice(0, 5)) })
  }, [user])

  if (showSettings) {
    return <SettingsPanel onClose={() => setShowSettings(false)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>

      {/* Today stats */}
      <div>
        <div style={{ fontSize: 14, color: '#5f5f5f', letterSpacing: '0.18em', marginBottom: 12 }}>TODAY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'SESSIONS',   val: sessions || '—', color: '#c8f04a' },
            { label: 'FOCUS TIME', val: fmtFocusTime(totalFocusTime), color: '#c8f04a' },
            { label: 'STATUS',     val: running ? mode.toUpperCase() : 'IDLE', color: running ? '#c8f04a' : '#505050' },
            { label: 'STREAK',     val: sessions >= 4 ? '🔥' : `${sessions}/4`, color: '#c8f04a' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: '#0d0d0d', border: '1px solid #181818',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 12, color: '#5f5f5f', letterSpacing: '0.14em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 15, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: '#141414' }}/>

      {/* History */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: '#5f5f5f', letterSpacing: '0.18em', marginBottom: 12 }}>
          {user ? 'RECENT SESSIONS' : 'HISTORY'}
        </div>

        {!user && (
          <div style={{
            background: '#0d0d0d', border: '1px solid #181818',
            borderRadius: 10, padding: '18px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: '#303030', letterSpacing: '0.1em', lineHeight: 2 }}>
              SIGN IN TO SAVE<br/>& VIEW HISTORY
            </div>
          </div>
        )}

        {user && history.length === 0 && (
          <div style={{ fontSize: 14, color: '#303030', letterSpacing: '0.1em' }}>NO SESSIONS YET</div>
        )}

        {user && history.map((s) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid #111',
          }}>
            <div>
              <div style={{ fontSize: 14, color: '#505050', letterSpacing: '0.06em' }}>
                {fmtDate(s.created_at)} · {fmtSessionTime(s.duration)}
              </div>
              <div style={{ fontSize: 14, color: '#303030', marginTop: 3 }}>
                {fmtSessionTime(s.focus_time)} focused
              </div>
            </div>
            <div style={{
              fontSize: 15,
              color: s.focus_pct >= 70 ? '#c8f04a' : s.focus_pct >= 50 ? '#f0c84a' : '#f06a4a',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {s.focus_pct}%
            </div>
          </div>
        ))}
      </div>

      {/* Settings button */}
      <button onClick={() => setShowSettings(true)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: '#0d0d0d', border: '1px solid #181818',
        color: '#383838', width: '100%', transition: 'all 0.15s',
        fontFamily: "'JetBrains Mono', monospace",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#505050' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#181818'; e.currentTarget.style.color = '#383838' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span style={{ fontSize: 14, letterSpacing: '0.14em' }}>SETTINGS</span>
      </button>

    </div>
  )
}