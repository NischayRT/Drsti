'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const DEFAULTS = {
  // Timer durations (seconds)
  focusDuration:      25 * 60,
  shortBreakDuration:  5 * 60,
  longBreakDuration:  15 * 60,

  // AI sensitivity — affects thresholds in WebcamPreview
  // 'strict' = 15° yaw/10° pitch, 'balanced' = 25°/20°, 'relaxed' = 35°/30°
  sensitivity: 'balanced',

  // Audio
  soundEnabled: true,
  volume: 0.7,       // 0–1

  // Theme — dark only for now, reserved for future
  theme: 'dark',
}

const SENSITIVITY_THRESHOLDS = {
  strict:   { yaw: 15, pitch: 10 },
  balanced: { yaw: 25, pitch: 20 },
  relaxed:  { yaw: 35, pitch: 30 },
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded,   setLoaded]   = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('AttentionOS-settings')
      if (saved) {
        setSettings(s => ({ ...s, ...JSON.parse(saved) }))
      }
    } catch (_) {}
    setLoaded(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem('AttentionOS-settings', JSON.stringify(settings))
    } catch (_) {}
  }, [settings, loaded])

  function update(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  function reset() {
    setSettings(DEFAULTS)
  }

  const thresholds = SENSITIVITY_THRESHOLDS[settings.sensitivity] || SENSITIVITY_THRESHOLDS.balanced

  return (
    <SettingsContext.Provider value={{ settings, update, reset, thresholds }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}

export { SENSITIVITY_THRESHOLDS }