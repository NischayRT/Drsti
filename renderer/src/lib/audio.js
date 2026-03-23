// audio.js — FocusGuard sound effects
// Each function fires once; caller manages state to prevent repeats.

function ctx() {
  return new (window.AudioContext || window.webkitAudioContext)()
}

// Low descending tone — signals distraction
export function playDistractionBeep() {
  try {
    const c = ctx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, c.currentTime)
    osc.frequency.linearRampToValueAtTime(280, c.currentTime + 0.3)
    gain.gain.setValueAtTime(0.22, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.5)
  } catch (_) {}
}

// Bright ascending two-tone — signals refocus
export function playRefocusBeep() {
  try {
    const c = ctx()
    ;[440, 660].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, c.currentTime + i * 0.14)
      gain.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.14 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.14 + 0.28)
      osc.start(c.currentTime + i * 0.14)
      osc.stop(c.currentTime + i * 0.14 + 0.3)
    })
  } catch (_) {}
}

// Three-note ascending chime — session complete
export function playSessionChime() {
  try {
    const c = ctx()
    ;[523, 659, 784].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, c.currentTime + i * 0.2)
      gain.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.2 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 0.6)
      osc.start(c.currentTime + i * 0.2)
      osc.stop(c.currentTime + i * 0.2 + 0.7)
    })
  } catch (_) {}
}
