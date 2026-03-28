'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'Drsti-onboarded'

const slides = [
  {
    id: 'what',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c8f04a" strokeWidth="1">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Focus smarter, not harder',
    body: 'Drsti combines a Pomodoro timer with AI-powered gaze detection. Your webcam watches whether you\'re actually looking at your screen — not to record you, but to measure real focus time.',
    points: [
      'Timer tracks your work sessions',
      'AI detects when you look away',
      'Reports show your actual focus vs away time',
      'All data stays on your device or your account',
    ],
  },
  {
    id: 'demo',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c8f04a" strokeWidth="1">
        <path d="M23 7l-7 5 7 5V7z"/>
        <rect x="1" y="5" width="15" height="14" rx="2"/>
      </svg>
    ),
    title: 'Here\'s how it works',
    demo: true,
  },
]

function DemoPreview() {
  const [step, setStep] = useState(0)
  const steps = [
    { label: 'Start the timer', sub: 'Click play to begin a focus session', color: '#c8f04a', icon: '▶' },
    { label: 'Camera activates', sub: 'AI watches your gaze every 2 seconds', color: '#4af0d4', icon: '◉' },
    { label: 'Look away — beep', sub: 'One alert when you drift, one when you return', color: '#f0c84a', icon: '◎' },
    { label: 'Session ends', sub: 'Report shows focused time vs away time', color: '#c8f04a', icon: '✓' },
  ]

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 16px', borderRadius: 10,
          background: i === step ? '#111' : '#0a0a0a',
          border: `1px solid ${i === step ? s.color + '30' : '#161616'}`,
          transition: 'all 0.4s',
          opacity: i === step ? 1 : 0.4,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: i === step ? s.color + '15' : 'transparent',
            border: `1px solid ${i === step ? s.color + '40' : '#1e1e1e'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: s.color,
            transition: 'all 0.4s',
          }}>
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, color: i === step ? '#e8e8e8' : '#484848', letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#383838', marginTop: 2, letterSpacing: '0.04em' }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Onboarding({ onDone }) {
  const [slide,   setSlide]   = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setTimeout(() => setVisible(true), 300)
  }, [])

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    setTimeout(onDone, 300)
  }

  if (!visible) return null

  const current = slides[slide]
  const isLast  = slide === slides.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0e0e0e',
        border: '1px solid #1e1e1e',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
        animation: 'slideUp 0.3s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '28px 28px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16,
        }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: i === slide ? 20 : 6, height: 6, borderRadius: 3,
                background: i === slide ? '#c8f04a' : '#1e1e1e',
                transition: 'all 0.3s',
              }}/>
            ))}
          </div>

          {current.icon}

          <div>
            <h2 style={{
              fontSize: 22, color: '#e8e8e8', fontWeight: 400,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em',
              marginBottom: 8,
            }}>
              {current.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 28px' }}>
          {current.body && (
            <p style={{
              fontSize: 13, color: '#585858', lineHeight: 1.8, marginBottom: 20,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {current.body}
            </p>
          )}

          {current.points && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {current.points.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8f04a', flexShrink: 0 }}/>
                  <span style={{ fontSize: 12, color: '#585858', fontFamily: "'JetBrains Mono', monospace" }}>{p}</span>
                </div>
              ))}
            </div>
          )}

          {current.demo && <DemoPreview />}
        </div>

        {/* Actions */}
        <div style={{
          padding: '0 28px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={finish} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#303030', fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.12em',
          }}>
            SKIP
          </button>

          <button
            onClick={() => isLast ? finish() : setSlide(s => s + 1)}
            style={{
              padding: '10px 28px', borderRadius: 10, cursor: 'pointer',
              background: '#c8f04a', color: '#080808', border: 'none',
              fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.12em', fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            {isLast ? 'GET STARTED' : 'NEXT →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
