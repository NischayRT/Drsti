'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const DEFAULTS = {
  focusDuration:   25,   // minutes
  shortBreak:       5,   // minutes
  longBreak:       15,   // minutes
  sensitivity:  'balanced',   // 'strict' | 'balanced' | 'relaxed'
  soundEnabled:  true,
  volume:          70,   // 0-100
  theme:        'dark',  // dark only for now
}

const SENSITIVITY_THRESHOLDS = {
  strict:   { yaw: 15, pitch: 12 },
  balanced: { yaw: 25, pitch: 20 },
  relaxed:  { yaw: 38, pitch: 32 },
}

const SettingsContext = createContext(DEFAULTS)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fg-settings')
      if (saved) setSettings({ ...DEFAULTS, ...JSON.parse(saved) })
    } catch (_) {}
  }, [])

  function updateSetting(key, value) {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem('fg-settings', JSON.stringify(next)) } catch (_) {}
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, SENSITIVITY_THRESHOLDS }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
