// Prozedurale Soundeffekte per Web Audio API – keine Audio-Dateien, kein Login.
// Alles wird zur Laufzeit synthetisiert (Motor, Münze, Boost, Drift, Countdown, Ziel).

const STORAGE_KEY = 'kart-pets-sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true
let noiseBuf: AudioBuffer | null = null

// Motor-Knoten (dauerhaft während des Rennens)
let engine: { osc: OscillatorNode; sub: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null
// Drift-Rausch (dauerhaft während des Driftens)
let drift: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null

// --- Musik: komplett aus Code erzeugt, keine Audio-Dateien, keine Lizenzfragen ---
export type Mood = 'menu' | 'race'
let music: { mood: Mood; gain: GainNode; timer: number; next: number; step: number } | null = null

// Vier Akkorde (I – vi – IV – V in C-Dur): [Bass, Terz/Quinte, Oberstimme]
const CHORDS = [
  [130.81, 261.63, 329.63], // C
  [110.0, 220.0, 261.63], // Am
  [87.31, 174.61, 220.0], // F
  [98.0, 196.0, 246.94], // G
]
const STEPS_PER_CHORD = 8 // Achtelnoten je Akkord -> 32 Schritte pro Schleife

function loadEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}
enabled = loadEnabled()

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = enabled ? 0.9 : 0
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  noiseBuf = buf
  return buf
}

// Kurzer Ton mit Hüllkurve.
function blip(freq: number, dur: number, type: OscillatorType, vol: number, glideTo?: number) {
  const c = ensure()
  if (!c || !master) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

// Ein Ton mit weicher Hüllkurve, direkt in den Musik-Bus.
function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType, bus: GainNode) {
  const c = ctx
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(bus)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

// Kurzes Rausch-Zischen (Hi-Hat) für den Renn-Beat.
function hat(at: number, vol: number, bus: GainNode) {
  const c = ctx
  if (!c) return
  const src = c.createBufferSource()
  src.buffer = noise(c)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 7000
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05)
  src.connect(hp).connect(g).connect(bus)
  src.start(at)
  src.stop(at + 0.07)
}

// Plant die nächsten Schritte im Voraus (Web-Audio-Uhr, nicht setInterval-Timing).
function scheduleMusic() {
  const c = ctx
  if (!c || !music) return
  const fast = music.mood === 'race'
  const bpm = fast ? 132 : 92
  const stepDur = 60 / bpm / 2 // Achtelnoten
  const bus = music.gain

  while (music.next < c.currentTime + 0.15) {
    const s = music.step
    const at = music.next
    const chord = CHORDS[Math.floor(s / STEPS_PER_CHORD) % CHORDS.length]
    const inChord = s % STEPS_PER_CHORD

    // Bass auf Zählzeit 1 und 3
    if (inChord === 0 || inChord === 4) {
      tone(chord[0], at, fast ? 0.28 : 0.5, fast ? 0.14 : 0.1, 'triangle', bus)
    }
    // Melodie: wechselnd Terz/Oberstimme, im Rennen dichter
    if (fast || inChord % 2 === 0) {
      const mel = chord[1 + (s % 2)]
      tone(mel, at, fast ? 0.16 : 0.34, fast ? 0.055 : 0.045, 'square', bus)
    }
    // Beat nur im Rennen
    if (fast) hat(at, inChord % 2 === 0 ? 0.035 : 0.018, bus)

    music.next += stepDur
    music.step = (s + 1) % (CHORDS.length * STEPS_PER_CHORD)
  }
}

export const sfx = {
  isEnabled: () => enabled,

  // --- Musik: 'menu' ruhig, 'race' treibend, 'off' aus. Folgt dem Mute-Schalter. ---
  music(mood: Mood | 'off') {
    const c = ensure()
    if (!c || !master) return
    if (mood === 'off') return this.stopMusic()
    if (music?.mood === mood) return // läuft schon
    this.stopMusic()
    const gain = c.createGain()
    gain.gain.value = 0
    gain.connect(master)
    gain.gain.setTargetAtTime(mood === 'race' ? 0.5 : 0.34, c.currentTime, 0.6)
    music = { mood, gain, timer: 0, next: c.currentTime + 0.06, step: 0 }
    scheduleMusic()
    music.timer = window.setInterval(scheduleMusic, 25)
  },

  stopMusic() {
    if (!music) return
    const m = music
    music = null
    window.clearInterval(m.timer)
    try {
      const c = ctx!
      m.gain.gain.setTargetAtTime(0, c.currentTime, 0.15)
      window.setTimeout(() => m.gain.disconnect(), 900)
    } catch {
      /* ignore */
    }
  },

  // Muss nach einer Nutzer-Geste laufen (Autoplay-Policy).
  resume() {
    ensure()
  },

  setEnabled(on: boolean) {
    enabled = on
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
    const c = ensure()
    if (master && c) master.gain.setTargetAtTime(on ? 0.9 : 0, c.currentTime, 0.02)
    if (!on) {
      this.stopEngine()
      this.driftStop()
    }
  },

  toggle() {
    this.setEnabled(!enabled)
    return enabled
  },

  // --- Motor: dauerhafter Klang, Tonhöhe/Helligkeit steigt mit Tempo (0..1) ---
  startEngine() {
    const c = ensure()
    if (!c || !master || engine) return
    const osc = c.createOscillator()
    const sub = c.createOscillator()
    const filter = c.createBiquadFilter()
    const gain = c.createGain()
    osc.type = 'sawtooth'
    sub.type = 'square'
    filter.type = 'lowpass'
    filter.frequency.value = 500
    osc.frequency.value = 60
    sub.frequency.value = 30
    gain.gain.value = 0.0
    osc.connect(filter)
    sub.connect(filter)
    filter.connect(gain).connect(master)
    osc.start()
    sub.start()
    engine = { osc, sub, filter, gain }
  },

  engineIntensity(v: number) {
    const c = ctx
    if (!engine || !c) return
    const x = Math.max(0, Math.min(1, v))
    const base = 55 + x * 150
    const now = c.currentTime
    engine.osc.frequency.setTargetAtTime(base, now, 0.08)
    engine.sub.frequency.setTargetAtTime(base * 0.5, now, 0.08)
    engine.filter.frequency.setTargetAtTime(400 + x * 2600, now, 0.08)
    engine.gain.gain.setTargetAtTime(0.04 + x * 0.05, now, 0.1)
  },

  stopEngine() {
    if (!engine) return
    const e = engine
    engine = null
    try {
      const c = ctx!
      e.gain.gain.setTargetAtTime(0, c.currentTime, 0.05)
      e.osc.stop(c.currentTime + 0.2)
      e.sub.stop(c.currentTime + 0.2)
    } catch {
      /* ignore */
    }
  },

  // --- Münze: heller Zwei-Ton-Ping (Arcade) ---
  coin() {
    blip(880, 0.09, 'square', 0.14)
    window.setTimeout(() => blip(1320, 0.12, 'square', 0.14), 60)
  },

  // --- Boost: aufsteigendes Whoosh + Ton ---
  boost() {
    const c = ensure()
    if (!c || !master) return
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = noise(c)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(400, t)
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.4)
    bp.Q.value = 0.8
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    src.connect(bp).connect(g).connect(master)
    src.start(t)
    src.stop(t + 0.55)
    blip(220, 0.45, 'sawtooth', 0.12, 660)
  },

  // --- Drift: dauerhaftes Reifen-Quietschen ---
  driftStart() {
    const c = ensure()
    if (!c || !master || drift) return
    const src = c.createBufferSource()
    src.buffer = noise(c)
    src.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    bp.Q.value = 6
    const g = c.createGain()
    g.gain.value = 0
    src.connect(bp).connect(g).connect(master)
    src.start()
    g.gain.setTargetAtTime(0.06, c.currentTime, 0.05)
    drift = { src, filter: bp, gain: g }
  },

  driftStop() {
    if (!drift) return
    const d = drift
    drift = null
    try {
      const c = ctx!
      d.gain.gain.setTargetAtTime(0, c.currentTime, 0.05)
      d.src.stop(c.currentTime + 0.2)
    } catch {
      /* ignore */
    }
  },

  // --- Countdown-Piepser (go = heller Startton) ---
  beep(go = false) {
    if (go) {
      blip(880, 0.35, 'square', 0.2, 1200)
    } else {
      blip(560, 0.16, 'square', 0.16)
    }
  },

  // --- Ziel-Fanfare (kleiner Arpeggio-Jubel) ---
  finish() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'square', 0.16), i * 110))
  },

  // --- Schleudern (Banane): absackender Ton + kurzes Rutsch-Rauschen ---
  spinOut() {
    blip(520, 0.5, 'sawtooth', 0.16, 90)
    const c = ensure()
    if (!c || !master) return
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = noise(c)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(2400, t)
    bp.frequency.exponentialRampToValueAtTime(600, t + 0.45)
    bp.Q.value = 3
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    src.connect(bp).connect(g).connect(master)
    src.start(t)
    src.stop(t + 0.55)
  },

  // --- UI-Klick ---
  click() {
    blip(320, 0.05, 'square', 0.08)
  },

  // --- Pet-Power: tierspezifischer Klang beim Auslösen (Jubel-Leiste voll) ---
  power(type: 'fire' | 'jump' | 'invincible' | 'scare') {
    const c = ensure()
    if (!c || !master) return
    if (type === 'fire') {
      // Feuer-Grollen: absackender Ton + gefiltertes Rauschen
      blip(150, 0.55, 'sawtooth', 0.16, 70)
      const t = c.currentTime
      const src = c.createBufferSource()
      src.buffer = noise(c)
      const bp = c.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(1200, t)
      bp.frequency.exponentialRampToValueAtTime(300, t + 0.5)
      bp.Q.value = 1.2
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
      src.connect(bp).connect(g).connect(master)
      src.start(t)
      src.stop(t + 0.6)
    } else if (type === 'jump') {
      // „Boing": schnell hoch, dann zurück
      blip(300, 0.18, 'square', 0.18, 900)
      window.setTimeout(() => blip(760, 0.16, 'square', 0.14, 320), 130)
    } else if (type === 'invincible') {
      // schimmernder Aufwärts-Arpeggio
      ;[660, 880, 1100, 1320].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'sine', 0.13), i * 70))
    } else {
      // 'scare': greller, absackender Schreck-Ton
      blip(760, 0.42, 'sawtooth', 0.17, 180)
      window.setTimeout(() => blip(520, 0.2, 'square', 0.1, 160), 90)
    }
  },
}
