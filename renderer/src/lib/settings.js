'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const DEFAULTS = {
  focusDuration:      25 * 60,
  shortBreakDuration:  5 * 60,
  longBreakDuration:  15 * 60,
  sensitivity: 'balanced',
  soundEnabled: true,
  volume: 0.7,
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('drsti-settings')
      if (saved) setSettings(s => ({ ...s, ...JSON.parse(saved) }))
    } catch (_) {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem('drsti-settings', JSON.stringify(settings)) } catch (_) {}
  }, [settings, loaded])

  // Apply theme to document
  useEffect(() => {
    if (!loaded) return
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme, loaded])

  function update(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  function reset() { setSettings(DEFAULTS) }

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