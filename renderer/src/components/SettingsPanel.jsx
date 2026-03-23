'use client'

import { useState } from 'react'
import { useSettings } from '../lib/settings'

function fmtDur(sec) {
  const m = Math.floor(sec / 60)
  return `${m}m`
}

function DurationStepper({ value, onChange, min = 60, max = 120 * 60, step = 60 }) {
  const mins = Math.floor(value / 60)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => onChange(Math.max(min, value - step))} style={{
        width: 24, height: 24, borderRadius: 6, border: '1px solid #1e1e1e',
        background: 'transparent', color: '#484848', cursor: 'pointer', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>−</button>
      <span style={{ fontSize: 13, color: '#c8f04a', minWidth: 32, textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace" }}>
        {mins}m
      </span>
      <button onClick={() => onChange(Math.min(max, value + step))} style={{
        width: 24, height: 24, borderRadius: 6, border: '1px solid #1e1e1e',
        background: 'transparent', color: '#484848', cursor: 'pointer', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
    </div>
  )
}

export default function SettingsPanel({ onClose }) {
  const { settings, update, reset } = useSettings()

  const row = (label, control) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid #111',
    }}>
      <span style={{ fontSize: 12, color: '#585858', letterSpacing: '0.1em' }}>{label}</span>
      {control}
    </div>
  )

  const toggle = (key) => (
    <button onClick={() => update(key, !settings[key])} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: settings[key] ? '#c8f04a' : '#1e1e1e',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: settings[key] ? 19 : 3,
        transition: 'left 0.2s',
      }}/>
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 14, color: '#5f5f5f', letterSpacing: '0.18em' }}>SETTINGS</span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#383838', fontSize: 24, lineHeight: 1, padding: 2,
        }}>×</button>
      </div>

      {/* Durations */}
      <div style={{ fontSize: 12, color: '#303030', letterSpacing: '0.14em', marginBottom: 6 }}>DURATIONS</div>
      {row('Focus', <DurationStepper value={settings.focusDuration} onChange={v => update('focusDuration', v)} min={60} max={120*60} step={5*60}/>)}
      {row('Short break', <DurationStepper value={settings.shortBreakDuration} onChange={v => update('shortBreakDuration', v)} min={60} max={30*60} step={60}/>)}
      {row('Long break', <DurationStepper value={settings.longBreakDuration} onChange={v => update('longBreakDuration', v)} min={60} max={60*60} step={5*60}/>)}

      {/* Sensitivity */}
      <div style={{ fontSize: 12, color: '#303030', letterSpacing: '0.14em', marginTop: 14, marginBottom: 6 }}>AI SENSITIVITY</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {['strict', 'balanced', 'relaxed'].map(s => (
          <button key={s} onClick={() => update('sensitivity', s)} style={{
            flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer',
            fontSize: 10, letterSpacing: '0.1em',
            fontFamily: "'JetBrains Mono', monospace",
            background: settings.sensitivity === s ? '#161616' : 'transparent',
            color: settings.sensitivity === s ? '#c8f04a' : '#303030',
            border: settings.sensitivity === s ? '1px solid #c8f04a20' : '1px solid #161616',
            transition: 'all 0.15s',
          }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#252525', letterSpacing: '0.06em', marginBottom: 4 }}>
        {settings.sensitivity === 'strict'   && 'Flags small head movements — best for deep work'}
        {settings.sensitivity === 'balanced' && 'Default — ignores minor glances'}
        {settings.sensitivity === 'relaxed'  && 'Only flags large head turns'}
      </div>

      {/* Sound */}
      <div style={{ fontSize: 12, color: '#303030', letterSpacing: '0.14em', marginTop: 14, marginBottom: 6 }}>AUDIO</div>
      {row('Sound alerts', toggle('soundEnabled'))}
      {settings.soundEnabled && (
        <div style={{ padding: '10px 0', borderBottom: '1px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#585858', letterSpacing: '0.1em' }}>Volume</span>
            <span style={{ fontSize: 11, color: '#c8f04a', fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <input type="range" min="0" max="1" step="0.05"
            value={settings.volume}
            onChange={e => update('volume', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#c8f04a', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Theme */}
      <div style={{ fontSize: 12, color: '#303030', letterSpacing: '0.14em', marginTop: 14, marginBottom: 6 }}>THEME</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {['dark'].map(t => (
          <button key={t} onClick={() => update('theme', t)} style={{
            flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer',
            fontSize: 10, letterSpacing: '0.1em',
            fontFamily: "'JetBrains Mono', monospace",
            background: settings.theme === t ? '#161616' : 'transparent',
            color: settings.theme === t ? '#c8f04a' : '#303030',
            border: settings.theme === t ? '1px solid #c8f04a20' : '1px solid #161616',
          }}>
            {t.toUpperCase()}
          </button>
        ))}
        <button style={{
          flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'not-allowed',
          fontSize: 10, letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono', monospace",
          background: 'transparent', color: '#1e1e1e', border: '1px solid #141414',
        }}>
          LIGHT ✦
        </button>
      </div>

      {/* Reset */}
      <button onClick={reset} style={{
        marginTop: 18, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
        background: 'transparent', border: '1px solid #1a1a1a',
        color: '#303030', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.12em', transition: 'all 0.15s',
        width: '100%',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#f06a4a30'; e.currentTarget.style.color = '#f06a4a' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#303030' }}
      >
        RESET TO DEFAULTS
      </button>
    </div>
  )
}
