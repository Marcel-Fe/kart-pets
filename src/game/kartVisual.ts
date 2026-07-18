// Rein optische Ableitungen für das Kart-Modell – ohne React/Three, damit
// deterministisch testbar (siehe scripts/test-kartvisual.ts). Die Fahrphysik
// (raceSim.ts) bleibt unberührt; hier wird nur aus vorhandenen KartState-Werten
// (visualTilt, speed) die Rad- und Nickstellung berechnet.

export const MAX_STEER = 0.5 // maximaler Radeinschlag in rad (~28°)
export const TILT_REF = 0.12 // visualTilt bei vollem Einschlag ohne Drift (raceSim.applyCommon)
export const MAX_DIVE = 0.055 // maximaler Nickwinkel in rad
export const DIVE_GAIN = 0.0016 // rad pro (m/s²)

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/**
 * Radeinschlag aus der Karosserie-Neigung. `visualTilt` trägt bereits die
 * Lenkrichtung (raceSim.applyCommon setzt `steer * 0.12`, im Drift `* 0.35`),
 * daher ist die Ableitung bildraten- und dt-unabhängig. Im Drift schlägt das
 * Rad voll ein (clamp auf ±1).
 */
export function steerFromTilt(visualTilt: number): number {
  return clamp(visualTilt / TILT_REF, -1, 1) * MAX_STEER
}

/**
 * Nickwinkel aus der Beschleunigung (m/s²): bremsen (accel < 0) taucht die Nase
 * ein (Ergebnis > 0), beschleunigen hebt sie (Ergebnis < 0). `accel` muss über
 * den ECHTEN Frame-Delta gebildet werden, nicht über das auf 0.05 geklemmte dt.
 */
export function diveFromAccel(accel: number): number {
  return clamp(-accel * DIVE_GAIN, -MAX_DIVE, MAX_DIVE)
}

// --- Jubel-Geste („winken wie bei Mario") ---
// Marcels Artwork hat keine Arm-Teile, deshalb winkt der ganze Oberkörper: der
// Fahrer richtet sich im Sitz auf und kippt rhythmisch hin und her.

export const CHEER_OVERTAKE = 1.3 // Sekunden Winken nach einem Überholvorgang
export const CHEER_FINISH = 4 // Sekunden Jubel nach der Zielankunft
export const CHEER_COOLDOWN = 5 // Sperre, damit enger Positionskampf kein Dauerwinken auslöst
export const CHEER_FADE = 0.5 // in dieser Restzeit klingt die Geste weich aus
export const WAVE_RATE = 12 // rad/s der Kippbewegung (~2 Hz, natürliche Winkfrequenz)

export interface CheerState {
  remaining: number // Restdauer der Geste
  cooldown: number // Restsperre für Überhol-Auslöser
  prevRank: number
  wasFinished: boolean
}

export function initCheer(rank: number, finished = false): CheerState {
  return { remaining: 0, cooldown: 0, prevRank: rank, wasFinished: finished }
}

/**
 * Schreibt `state` fort und liefert die Stärke der Geste (0..1). Auslöser sind
 * ein verbesserter Rang (kurz, mit Sperre) und die Zielankunft (ausgiebig).
 * Rein rechnerisch – keine Three.js-Abhängigkeit, damit testbar.
 */
export function updateCheer(state: CheerState, rank: number, finished: boolean, dt: number): number {
  state.remaining = Math.max(0, state.remaining - dt)
  state.cooldown = Math.max(0, state.cooldown - dt)

  if (rank < state.prevRank && state.cooldown <= 0 && !finished) {
    state.remaining = CHEER_OVERTAKE
    state.cooldown = CHEER_COOLDOWN
  }
  state.prevRank = rank

  if (finished && !state.wasFinished) state.remaining = CHEER_FINISH
  state.wasFinished = finished

  return Math.min(1, state.remaining / CHEER_FADE)
}

/** Kippausschlag der Geste zum Zeitpunkt `t` (Sekunden), skaliert mit `amount`. */
export function waveAt(t: number, amount: number): number {
  return amount > 0 ? Math.sin(t * WAVE_RATE) * amount : 0
}
