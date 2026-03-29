'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, getUserSessions } from '../../lib/supabase'
import { SettingsProvider } from '../../lib/settings'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(sec) {
  if (!sec || sec === 0) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function gradeColor(pct) {
  if (pct >= 90) return 'var(--accent)'
  if (pct >= 70) return 'var(--teal)'
  if (pct >= 50) return 'var(--yellow)'
  return 'var(--red)'
}

function gradeLabel(pct) {
  if (pct >= 90) return 'Excellent'
  if (pct >= 70) return 'Good'
  if (pct >= 50) return 'Fair'
  return 'Poor'
}

function dayOfWeek(iso)  { return new Date(iso).getDay() }
function hourOfDay(iso)  { return new Date(iso).getHours() }
function weekKey(iso) {
  const d = new Date(iso)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().slice(0, 10)
}

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0)  return '12a'
  if (i < 12)   return `${i}a`
  if (i === 12) return '12p'
  return `${i - 12}p`
})

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ text }) {
  return (
    <div style={{
      padding: '40px 0', textAlign: 'center',
      color: 'var(--text-3)', fontSize: 14, letterSpacing: '0.1em',
      background: 'var(--bg-2)', borderRadius: 12, border: '1px dashed var(--border-2)',
    }}>
      {text}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, sub, children }) {
  return (
    <div className="chart-section" style={{
      background: 'var(--bg-3)', border: '1px solid var(--border-2)',
      borderRadius: 16, padding: '24px 28px 42px',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)', letterSpacing: '0.18em', fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{
      background: 'var(--bg-3)', border: '1px solid var(--border-2)',
      borderRadius: 14, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'transform 0.2s, border-color 0.2s',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.16em', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{
        fontSize: 'clamp(26px, 3.5vw, 34px)',
        color: color || 'var(--text)',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 300, lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 12, color: color || 'var(--text-3)',
          opacity: 0.8, letterSpacing: '0.08em',
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Weekly trend ──────────────────────────────────────────────────────────────
function WeeklyTrendChart({ sessions }) {
  const weeks = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      const k = weekKey(s.created_at)
      if (!map[k]) map[k] = { focusTime: 0, count: 0, totalPct: 0 }
      map[k].focusTime += s.focus_time || 0
      map[k].count++
      map[k].totalPct += s.focus_pct || 0
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([k, v]) => ({
        label: new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        focusTime: v.focusTime,
        avgPct: Math.round(v.totalPct / v.count),
        count: v.count,
      }))
  }, [sessions])

  if (weeks.length === 0) return <EmptyState text="No weekly data yet" />

  const maxTime = Math.max(...weeks.map(w => w.focusTime), 1)

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, marginBottom: 14 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 12, color: gradeColor(w.avgPct), fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
              {w.avgPct}%
            </div>
            <div
              title={`${fmtTime(w.focusTime)} · ${w.count} session${w.count > 1 ? 's' : ''}`}
              style={{
                width: '100%', borderRadius: 6,
                height: `${Math.max((w.focusTime / maxTime) * 100, 6)}px`,
                background: gradeColor(w.avgPct),
                opacity: 0.85, transition: 'height 0.4s ease', cursor: 'default',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em', fontWeight: 500 }}>
            {w.label.split(' ')[1]}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Focus distribution ────────────────────────────────────────────────────────
function DistributionChart({ sessions }) {
  const dist = useMemo(() => {
    const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 }
    sessions.forEach(s => {
      if (s.focus_pct >= 90) buckets.excellent++
      else if (s.focus_pct >= 70) buckets.good++
      else if (s.focus_pct >= 50) buckets.fair++
      else buckets.poor++
    })
    return buckets
  }, [sessions])

  const total = sessions.length
  if (total === 0) return <EmptyState text="No sessions yet" />

  const bars = [
    { label: 'Excellent', range: '90%+',  key: 'excellent', color: 'var(--accent)' },
    { label: 'Good',      range: '70–89%', key: 'good',      color: 'var(--teal)' },
    { label: 'Fair',      range: '50–69%', key: 'fair',      color: 'var(--yellow)' },
    { label: 'Poor',      range: '<50%',   key: 'poor',      color: 'var(--red)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {bars.map(({ label, range, key, color }) => {
        const pct = Math.round((dist[key] / total) * 100) || 0
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{range}</span>
              </div>
              <span style={{ fontSize: 14, color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                {dist[key]}
                <span style={{ color: 'var(--text-4)', fontSize: 12, marginLeft: 4 }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 4, transition: 'width 0.6s ease', opacity: pct > 0 ? 0.9 : 0,
              }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Scatter: session length vs focus % ───────────────────────────────────────
function ScatterChart({ sessions }) {
  if (sessions.length === 0) return <EmptyState text="No sessions yet" />

  // Use a larger viewBox so SVG text renders at readable sizes
  const W = 400, H = 260
  const pad = { t: 20, r: 20, b: 40, l: 50 }

  const maxDur = Math.max(...sessions.map(s => s.duration), 1)

  const yLabels = [0, 25, 50, 75, 100]
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map(f => fmtTime(Math.round(f * maxDur)))

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>

        {/* Grid lines + Y labels */}
        {yLabels.map(y => {
          const cy = pad.t + ((100 - y) / 100) * (H - pad.t - pad.b)
          return (
            <g key={y}>
              <line
                x1={pad.l} y1={cy} x2={W - pad.r} y2={cy}
                stroke="var(--border-2)" strokeWidth="0.8" strokeDasharray="3 3"
              />
              <text x={pad.l - 8} y={cy}
                textAnchor="end" dominantBaseline="middle"
                style={{ fontSize: 8, fill: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                {y}%
              </text>
            </g>
          )
        })}

        {/* X axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const cx = pad.l + f * (W - pad.l - pad.r)
          return (
            <text key={i} x={cx} y={H - 8}
              textAnchor="middle"
              style={{ fontSize: 8, fill: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtTime(Math.round(f * maxDur))}
            </text>
          )
        })}

        {/* Axis lines */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="var(--border-2)" strokeWidth="1"/>
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="var(--border-2)" strokeWidth="1"/>

        {/* Points */}
        {sessions.map((s, i) => {
          const cx = pad.l + (s.duration / maxDur) * (W - pad.l - pad.r)
          const cy = pad.t + ((100 - s.focus_pct) / 100) * (H - pad.t - pad.b)
          return (
            <circle key={i} cx={cx} cy={cy} r="4"
              fill={gradeColor(s.focus_pct)} opacity="0.8"
              style={{ cursor: 'pointer', transition: 'r 0.15s' }}
              onMouseEnter={e => e.target.setAttribute('r', '6')}
              onMouseLeave={e => e.target.setAttribute('r', '4')}>
              <title>{`${fmtTime(s.duration)} · ${s.focus_pct}% focus`}</title>
            </circle>
          )
        })}

        {/* Axis labels */}
        <text x={(W + pad.l) / 2} y={H+10} textAnchor="middle"
          style={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
          Session length →
        </text>
        <text
          x={12} y={(H + pad.t) / 2}
          textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90, 12, ${(H + pad.t) / 2})`}
          style={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
          Focus %
        </text>
      </svg>
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function HeatmapChart({ sessions }) {
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ count: 0, totalPct: 0 }))
    )
    sessions.forEach(s => {
      const d = dayOfWeek(s.created_at)
      const h = hourOfDay(s.created_at)
      g[d][h].count++
      g[d][h].totalPct += s.focus_pct || 0
    })
    return g
  }, [sessions])

  if (sessions.length === 0) return <EmptyState text="No sessions yet" />

  const maxCount = Math.max(...grid.flat().map(c => c.count), 1)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6am–11pm

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `44px repeat(${hours.length}, 1fr)`, gap: 3, minWidth: 520 }}>

        {/* Header */}
        <div/>
        {hours.map(h => (
          <div key={h} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", paddingBottom: 6 }}>
            {HOUR_LABELS[h]}
          </div>
        ))}

        {/* Day rows */}
        {DAY_LABELS.map((day, d) => (
          <>
            <div key={`label-${d}`} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', paddingRight: 8, fontWeight: 500 }}>
              {day}
            </div>
            {hours.map(h => {
              const cell = grid[d][h]
              const intensity = cell.count / maxCount
              const avgPct = cell.count > 0 ? Math.round(cell.totalPct / cell.count) : 0
              const col = cell.count > 0 ? gradeColor(avgPct) : 'var(--bg-2)'
              return (
                <div key={`${d}-${h}`}
                  title={cell.count > 0 ? `${day} ${HOUR_LABELS[h]}: ${cell.count} session${cell.count > 1 ? 's' : ''}, avg ${avgPct}%` : ''}
                  style={{
                    height: 18, borderRadius: 4,
                    background: col,
                    opacity: cell.count > 0 ? 0.2 + intensity * 0.8 : 1,
                    border: `1px solid ${cell.count > 0 ? 'transparent' : 'var(--border)'}`,
                    cursor: cell.count > 0 ? 'pointer' : 'default',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => { if (cell.count > 0) e.target.style.transform = 'scale(1.12)' }}
                  onMouseLeave={e => { if (cell.count > 0) e.target.style.transform = 'scale(1)' }}
                />
              )
            })}
          </>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Less</span>
        {[0.2, 0.4, 0.6, 0.8, 1].map(o => (
          <div key={o} style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--accent)', opacity: o }}/>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>More</span>
      </div>
    </div>
  )
}

// ── Streak cards ──────────────────────────────────────────────────────────────
function StreakStats({ sessions }) {
  const { current, longest, totalDays } = useMemo(() => {
    if (sessions.length === 0) return { current: 0, longest: 0, totalDays: 0 }

    const days = [...new Set(
      sessions.map(s => new Date(s.created_at).toDateString())
    )].map(d => new Date(d)).sort((a, b) => b - a)

    let current = 0, longest = 0, streak = 1
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const latest = new Date(days[0]); latest.setHours(0, 0, 0, 0)
    const diff = Math.round((today - latest) / 86400000)

    if (diff <= 1) {
      current = 1
      for (let i = 1; i < days.length; i++) {
        const d1 = new Date(days[i - 1]); d1.setHours(0,0,0,0)
        const d2 = new Date(days[i]);     d2.setHours(0,0,0,0)
        if (Math.round((d1 - d2) / 86400000) === 1) current++
        else break
      }
    }

    for (let i = 1; i < days.length; i++) {
      const d1 = new Date(days[i - 1]); d1.setHours(0,0,0,0)
      const d2 = new Date(days[i]);     d2.setHours(0,0,0,0)
      if (Math.round((d1 - d2) / 86400000) === 1) { streak++; longest = Math.max(longest, streak) }
      else streak = 1
    }
    longest = Math.max(longest, current)

    return { current, longest, totalDays: days.length }
  }, [sessions])

  return (
    <div className="streak-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      {[
        { label: 'CURRENT STREAK', value: `${current}d`, color: current >= 3 ? 'var(--accent)' : 'var(--text)', sub: current >= 3 ? '🔥 On a roll' : current > 0 ? 'Keep going' : 'Start today' },
        { label: 'LONGEST STREAK', value: `${longest}d`, color: 'var(--teal)', sub: 'Personal best' },
        { label: 'ACTIVE DAYS',    value: totalDays,     color: 'var(--text)',  sub: 'Total days worked' },
      ].map(({ label, value, color, sub }) => (
        <div key={label} style={{
          background: 'var(--bg-3)', border: '1px solid var(--border-2)',
          borderRadius: 14, padding: '20px 18px',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.16em', marginBottom: 10, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 300, marginBottom: 6 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Daily chart ───────────────────────────────────────────────────────────────
function DailyAvgChart({ sessions }) {
  const days = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      const k = new Date(s.created_at).toDateString()
      if (!map[k]) map[k] = { focusTime: 0, count: 0 }
      map[k].focusTime += s.focus_time || 0
      map[k].count++
    })
    return Object.entries(map)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-14)
      .map(([k, v]) => ({
        label: new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        focusTime: v.focusTime,
        count: v.count,
      }))
  }, [sessions])

  if (days.length === 0) return <EmptyState text="No data yet" />

  const maxTime = Math.max(...days.map(d => d.focusTime), 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 12 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
            <div
              title={`${d.label}: ${fmtTime(d.focusTime)} · ${d.count} session${d.count > 1 ? 's' : ''}`}
              style={{
                width: '100%', borderRadius: 4,
                height: `${Math.max((d.focusTime / maxTime) * 100, 4)}px`,
                background: 'var(--accent)', opacity: 0.85,
                transition: 'height 0.4s ease',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            {d.label.split(' ')[1]}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AnalyticsContent() {
  const [user,     setUser]     = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [range,    setRange]    = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadSessions()
  }, [])

  async function loadSessions() {
    setLoading(true)
    const { data } = await getUserSessions(500)
    setSessions(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const now = Date.now()
    return sessions.filter(s => {
      const age = now - new Date(s.created_at).getTime()
      if (range === 'week')  return age < 7  * 86400000
      if (range === 'month') return age < 30 * 86400000
      return true
    })
  }, [sessions, range])

  const stats = useMemo(() => {
    if (filtered.length === 0) return null
    const totalFocus = filtered.reduce((a, s) => a + (s.focus_time || 0), 0)
    const totalDur   = filtered.reduce((a, s) => a + (s.duration   || 0), 0)
    const avgPct     = Math.round(filtered.reduce((a, s) => a + (s.focus_pct || 0), 0) / filtered.length)
    const best       = filtered.reduce((b, s) => s.focus_pct > (b?.focus_pct || 0) ? s : b, null)
    const avgSession = Math.round(totalDur / filtered.length)
    return { totalFocus, totalDur, avgPct, best, avgSession }
  }, [filtered])

  function goBack() {
    if (window.location.protocol === 'file:') {
      const base = window.location.href.split('/').slice(0, -2).join('/')
      window.location.href = base + '/index.html'
    } else {
      window.location.href = '/'
    }
  }

  function goHistory() {
    if (window.location.protocol === 'file:') {
      const base = window.location.href.split('/').slice(0, -2).join('/')
      window.location.href = base + '/history/index.html'
    } else {
      window.location.href = '/history'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif", color: 'var(--text)', paddingBottom: 60 }}>

      {/* ── Nav ── */}
      <div className="nav-header" style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 32px', borderBottom: '1px solid var(--border-2)',
        background: 'var(--bg-2)', gap: 20, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={goBack} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: '1px solid var(--border-2)', borderRadius: 8,
          cursor: 'pointer', color: 'var(--text-2)',
          padding: '6px 14px', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          <span style={{ fontSize: 13, letterSpacing: '0.12em', fontWeight: 500 }}>HOME</span>
        </button>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10, border: '1px solid var(--border-2)' }}>
          {[
            { label: 'ANALYTICS', active: true,  onClick: null },
            { label: 'HISTORY',   active: false, onClick: goHistory },
          ].map(({ label, active, onClick }) => (
            <button key={label} onClick={onClick} style={{
              padding: '7px 18px', borderRadius: 7, cursor: onClick ? 'pointer' : 'default',
              background: active ? 'var(--surface)' : 'transparent',
              border: active ? '1px solid var(--border-3)' : '1px solid transparent',
              color: active ? 'var(--text)' : 'var(--text-3)',
              fontSize: 13, letterSpacing: '0.12em', fontWeight: 600, transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Range filter */}
        <div className="range-filter" style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10, border: '1px solid var(--border-2)' }}>
          {[['all', 'ALL TIME'], ['month', '30 DAYS'], ['week', '7 DAYS']].map(([v, l]) => (
            <button key={v} onClick={() => setRange(v)} style={{
              padding: '7px 16px', borderRadius: 7, cursor: 'pointer',
              background: range === v ? 'var(--surface)' : 'transparent',
              border: range === v ? '1px solid var(--border-3)' : '1px solid transparent',
              color: range === v ? 'var(--text)' : 'var(--text-3)',
              fontSize: 13, letterSpacing: '0.08em', fontWeight: 500, transition: 'all 0.15s',
            }}>
              {l}
            </button>
          ))}
        </div>

        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 10px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border-2)',
          }}>
            {user.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: 6 }}/>
              : <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--bg)', fontWeight: 600 }}>
                  {(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </div>
            }
            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="analytics-body" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {loading && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)', fontSize: 15, letterSpacing: '0.14em', fontWeight: 500 }}>
            LOADING INSIGHTS...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 80, textAlign: 'center', background: 'var(--bg-3)', borderRadius: 16, border: '1px solid var(--border-2)' }}>
            <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 500, marginBottom: 10 }}>No sessions for this period.</div>
            <div style={{ fontSize: 15, color: 'var(--text-3)' }}>Complete focus sessions to build your analytics dashboard.</div>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stat cards */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <StatCard label="TOTAL SESSIONS"   value={filtered.length}           color="var(--text)" />
              <StatCard label="TOTAL FOCUS TIME" value={fmtTime(stats.totalFocus)} />
              <StatCard label="AVG FOCUS SCORE"  value={`${stats.avgPct}%`}        color={gradeColor(stats.avgPct)} sub={gradeLabel(stats.avgPct)} />
              <StatCard label="AVG SESSION"       value={fmtTime(stats.avgSession)} color="var(--teal)" />
              {stats.best && (
                <StatCard label="BEST SESSION" value={`${stats.best.focus_pct}%`} color={gradeColor(stats.best.focus_pct)}
                  sub={new Date(stats.best.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              )}
            </div>

            {/* Streaks */}
            <StreakStats sessions={filtered} />

            {/* 2-col charts */}
            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Section title="WEEKLY FOCUS TREND">
                <WeeklyTrendChart sessions={filtered} />
              </Section>
              <Section title="FOCUS DISTRIBUTION">
                <DistributionChart sessions={filtered} />
              </Section>
            </div>

            <Section title="DAILY FOCUS TIME — LAST 14 DAYS">
              <DailyAvgChart sessions={filtered} />
            </Section>

            <Section title="SESSION LENGTH VS FOCUS %" sub="Each dot is one session. Hover for details.">
              <ScatterChart sessions={filtered} />
            </Section>

            <Section title="BEST HOURS HEATMAP" sub="Discover when you focus best. Color = avg focus %, opacity = session count.">
              <HeatmapChart sessions={filtered} />
            </Section>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .charts-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .nav-header {
            padding: 12px 16px !important;
            height: auto !important;
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .analytics-body { padding: 20px 16px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .streak-grid { grid-template-columns: 1fr !important; }
          .chart-section { padding: 18px 16px !important; }
          .range-filter { width: 100%; }
          .range-filter button { flex: 1; text-align: center; }
        }
        .stat-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-3) !important;
        }
      `}</style>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <SettingsProvider>
      <AnalyticsContent />
    </SettingsProvider>
  )
}