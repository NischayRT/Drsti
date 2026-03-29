'use client'

import { useState, useEffect } from 'react'
import Timer from '../components/Timer'
import WebcamPreview from '../components/WebcamPreview'
import Sidebar from '../components/Sidebar'
import ReportOverlay from '../components/ReportOverlay'
import AuthButton from '../components/AuthButton'
import Onboarding from '../components/Onboarding'
import { SettingsProvider, useSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'

function App() {
  const { settings, thresholds } = useSettings()
  const [sessions,       setSessions]       = useState(0)
  const [timerRunning,   setTimerRunning]   = useState(false)
  const [focusData,      setFocusData]      = useState(null)
  const [report,         setReport]         = useState(null)
  const [user,           setUser]           = useState(null)
  const [onboarded,      setOnboarded]      = useState(true)
  const [totalFocusTime, setTotalFocusTime] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('Drsti-onboarded')
    setOnboarded(!!done)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = (e) => setTimerRunning(e.detail.running)
    window.addEventListener('timer-state', handler)
    return () => window.removeEventListener('timer-state', handler)
  }, [])

  function handleSessionComplete(count, sessionReport) {
    setSessions(count)
    setReport({ ...sessionReport, distractions: 0 })
    setTotalFocusTime(t => t + (sessionReport.focusTime || 0))
  }

  const isDistracted = focusData ? (!focusData.face_detected || focusData.looking_away) : false
  const dotColor = timerRunning
    ? (isDistracted ? 'var(--yellow)' : 'var(--accent)')
    : 'var(--red)'

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', overflow: 'hidden',
      fontFamily: "'JetBrains Mono', monospace",
      color: 'var(--text)',
    }}>

      {!onboarded && <Onboarding onDone={() => setOnboarded(true)} />}

      {/* Navbar */}
      <div style={{
        height: 56, minHeight: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
        WebkitAppRegion: 'drag',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'no-drag' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            border: `1px solid ${dotColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.5s', flexShrink: 0,
          }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: dotColor,
              boxShadow: timerRunning ? `0 0 10px ${dotColor}` : 'none',
              transition: 'all 0.5s',
            }}/>
          </div>
          <span style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '0.2em' }}>Drsti</span>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {timerRunning && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: 20,
              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: dotColor, boxShadow: `0 0 6px ${dotColor}`,
                animation: 'blink 2s ease-in-out infinite',
              }}/>
              <span style={{ fontSize: 14, color: 'var(--text-3)', letterSpacing: '0.14em' }}>
                {isDistracted ? 'DISTRACTED' : 'IN FOCUS'}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center' }}>
          <AuthButton />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', overflowX: 'hidden', minHeight: 0 }}>
        
        {/* TIMER CONTAINER WITH BACKGROUND */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 40px', minWidth: 300, overflow: 'hidden', maxHeight: 600,
          position: 'relative', /* <-- Added relative positioning */
        }}>
          
          
          {/* Glowing Radial Gradient */}
          <div style={{ 
            position: 'absolute', top: '43%', left: '50%', transform: 'translate(-50%, -50%)', 
            width: 350, height: 300, borderRadius: '50%', 
            background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 75%)', 
            pointerEvents: 'none' 
          }}/>

          {/* Wrapper to keep Timer on top of the background */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Timer
              onSessionComplete={handleSessionComplete}
              onRunningChange={setTimerRunning}
              focusScore={focusData?.focus_score ?? null}
              isDistracted={isDistracted}
              defaultDuration={settings.focusDuration}
              defaultShortBreak={settings.shortBreakDuration}
              defaultLongBreak={settings.longBreakDuration}
              soundEnabled={settings.soundEnabled}
              volume={settings.volume}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: 280, minWidth: 280, flexShrink: 0,
          borderLeft: '1px solid var(--border)', background: 'var(--bg-2)',
          display: 'flex', flexDirection: 'column',
          padding: '20px 18px', gap: 18, overflowY: 'auto',
        }} className="sideBar">
          <WebcamPreview
            active={timerRunning}
            onScoreUpdate={setFocusData}
            thresholds={thresholds}
            soundEnabled={settings.soundEnabled}
            volume={settings.volume}
          />
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />
          <Sidebar
            sessions={sessions}
            running={timerRunning}
            mode="focus"
            user={user}
            totalFocusTime={totalFocusTime}
          />
        </div>
      </div>

      {report && (
        <ReportOverlay
          report={report} user={user}
          onClose={() => setReport(null)}
          onExtend={() => setReport(null)}
        />
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <SettingsProvider>
      <App />
    </SettingsProvider>
  )
}