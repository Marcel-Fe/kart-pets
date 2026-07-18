import type { Pet, AIStyle } from '../types'
import { TrackCurve } from './trackCurve'
import { ROAD_WIDTH } from '../data/tracks'

// Multiplikative Upgrade-Faktoren (1 = neutral, KI nutzt NEUTRAL_UPGRADES).
export interface UpgradeFactors {
  speed: number
  control: number
  accel: number
  armor: number
}

export const NEUTRAL_UPGRADES: UpgradeFactors = { speed: 1, control: 1, accel: 1, armor: 1 }

export interface KartState {
  id: string
  name: string
  emoji: string
  color: string
  isPlayer: boolean
  pet: Pet
  level: number
  upgrades: UpgradeFactors
  aiStyle?: AIStyle

  // Bewegung
  x: number
  z: number
  heading: number // Winkel um Y (0 = +z)
  speed: number
  visualTilt: number // für Drift-Neigung der Karosserie

  // Fortschritt
  t: number
  prevT: number
  lap: number
  finished: boolean
  finishOrder: number
  rank: number

  // Drift/Boost
  drifting: boolean
  driftCharge: number // 0..1
  boostTime: number

  // KI
  aiTargetLateral: number
  aiWanderTimer: number
}

// --- Tuning-Konstanten (Arcade-Gefühl) ---
// Schwung ist wichtiger als Anschlag: das Kart soll rollen, nicht kleben. Früher
// bremste Gaswegnehmen (COAST+DRAG ≈ 31 u/s²) härter als Gas geben (26) — das Kart
// stand fast sofort. Jetzt trägt es sich, dafür baut es Tempo gemächlicher auf.
const ACCEL = 14.5
const COAST = 3
const DRAG = 0.25
const BASE_MAX = 30
// Wendekreis bei Vollgas ~26 u, engste Streckenkurve ~18 u: enge Kurven gehen nur
// mit Drift oder vom Gas. Früher (2.2) drehte das Kart enger als jede Kurve — man
// fuhr überall Vollgas und der Drift-Knopf war funktionslos.
const TURN = 1.3 // rad/s
const OFFTRACK_MAX = 13
// Muss unter ACCEL bleiben, sonst würgt Gras das Kart auf 0 ab statt es nur zu
// bremsen. Die Klemme auf OFFTRACK_MAX macht den Ausflug ins Grüne teuer genug.
const GRASS_DRAG = 8
const DRIFT_TURN_MULT = 1.7
// Ein kurzes Antippen (0.37 s) reichte früher schon für Boost – der Drift hatte
// kein Timing. Jetzt: ~0.7 s bis boostfähig, ~2.9 s für die volle Leiste.
const DRIFT_CHARGE_RATE = 0.35
const BOOST_MULT = 1.6
const KMH = 3.0

const HALF = ROAD_WIDTH / 2

function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function levelBonus(k: KartState): number {
  // sanfter Bonus: +0.4% Tempo/Kontrolle je Level (max ~+14% bei Lvl 36)
  return 1 + Math.min(k.level - 1, 35) * 0.004
}

function maxSpeedFor(k: KartState): number {
  // pet.speed 5..9 -> Faktor ~0.95..1.15
  const petFactor = 0.8 + k.pet.speed * 0.04
  const aiFactor = k.aiStyle ? k.aiStyle.speedFactor : 1
  return BASE_MAX * petFactor * aiFactor * levelBonus(k) * k.upgrades.speed
}

function turnRateFor(k: KartState): number {
  // pet.control 5..10 -> Faktor ~0.85..1.1
  return TURN * (0.65 + k.pet.control * 0.045) * levelBonus(k) * k.upgrades.control
}

export interface PlayerInput {
  throttle: boolean
  steerLeft: boolean
  steerRight: boolean
  drift: boolean
  boost: boolean
}

export function updatePlayer(k: KartState, input: PlayerInput, lateral: number, dt: number) {
  // Links = +1 -> dreht aus Kamerasicht nach links (Heading-Konvention der Strecke)
  const steer = (input.steerLeft ? 1 : 0) + (input.steerRight ? -1 : 0)
  const onGrass = Math.abs(lateral) > HALF

  // Beschleunigung (Booster-Upgrade beschleunigt schneller)
  if (input.throttle) k.speed += ACCEL * k.upgrades.accel * dt
  else k.speed -= COAST * dt
  k.speed -= DRAG * k.speed * dt

  // Drift lädt die Boost-Leiste
  k.drifting = input.drift && k.speed > 8 && steer !== 0
  if (k.drifting) {
    const petBonus = k.pet.id === 'fynnox' || k.pet.id === 'neko' ? 1.25 : 1
    k.driftCharge = Math.min(1, k.driftCharge + DRIFT_CHARGE_RATE * petBonus * dt)
  }

  // Boost feuern (verbraucht Leiste)
  if (input.boost && k.driftCharge > 0.25 && k.boostTime <= 0) {
    const petBonus = k.pet.id === 'drako' ? 1.3 : 1
    k.boostTime = k.driftCharge * 1.4 * petBonus
    k.driftCharge = 0
  }

  applyCommon(k, steer, onGrass, dt)
}

export function updateAI(k: KartState, curve: TrackCurve, lateral: number, dt: number) {
  const style = k.aiStyle!
  const onGrass = Math.abs(lateral) > HALF

  // Ideallinie mit leichtem Wandern je nach Können
  k.aiWanderTimer -= dt
  if (k.aiWanderTimer <= 0) {
    k.aiWanderTimer = 1.2 + Math.random() * 1.5
    const spread = HALF * 0.6 * (1 - style.skill)
    k.aiTargetLateral = (Math.random() * 2 - 1) * spread
  }

  // Zielpunkt etwas voraus auf der Strecke
  const aim = curve.pointAt(k.t + 0.025)
  const aimNormalIdx = Math.floor((((k.t + 0.025) % 1) + 1) % 1 * curve.normals.length)
  const nor = curve.normals[aimNormalIdx % curve.normals.length]
  const targetX = aim.x + nor.x * k.aiTargetLateral
  const targetZ = aim.z + nor.z * k.aiTargetLateral

  const desired = Math.atan2(targetX - k.x, targetZ - k.z)
  const diff = angleDiff(desired, k.heading)

  // Lenken Richtung Ziel
  const steer = Math.max(-1, Math.min(1, diff * 2.2))

  // Gas: in scharfen Kurven etwas vom Gas, sonst voll
  const sharp = Math.min(1, Math.abs(diff) / 0.8)
  k.speed += ACCEL * dt * (1 - sharp * 0.5)
  k.speed -= DRAG * k.speed * dt

  // Aggressive KI driftet+boostet in Kurven
  k.drifting = sharp > 0.4 && k.speed > 10 && style.aggression > 0.5
  if (k.drifting) k.driftCharge = Math.min(1, k.driftCharge + DRIFT_CHARGE_RATE * dt)
  if (k.driftCharge > 0.6 && k.boostTime <= 0 && style.aggression > 0.6) {
    k.boostTime = k.driftCharge * 1.2
    k.driftCharge = 0
  }

  applyCommon(k, steer, onGrass, dt)
}

function applyCommon(k: KartState, steer: number, onGrass: boolean, dt: number) {
  // Boost
  let effMax = maxSpeedFor(k)
  if (k.boostTime > 0) {
    effMax *= BOOST_MULT
    k.boostTime -= dt
  }

  if (onGrass) {
    k.speed -= GRASS_DRAG * dt
    effMax = Math.min(effMax, OFFTRACK_MAX)
  }
  k.speed = Math.max(0, Math.min(k.speed, effMax))

  // Lenken – wirkt stärker mit Tempo, extra im Drift
  let turn = turnRateFor(k)
  if (k.drifting) turn *= DRIFT_TURN_MULT
  const speedSteer = Math.min(1, k.speed / 10)
  k.heading += steer * turn * dt * speedSteer

  // Karosserie-Neigung für visuelles Feedback
  const targetTilt = k.drifting ? steer * 0.35 : steer * 0.12
  k.visualTilt += (targetTilt - k.visualTilt) * Math.min(1, dt * 8)

  // Vorwärtsbewegung
  k.x += Math.sin(k.heading) * k.speed * dt
  k.z += Math.cos(k.heading) * k.speed * dt
}

// Aktualisiert Runde/Fortschritt anhand der Streckenprojektion.
export function updateProgress(k: KartState, t: number, totalLaps: number, nextFinishOrder: () => number) {
  if (k.prevT > 0.75 && t < 0.25 && !k.finished) {
    k.lap += 1
    if (k.lap >= totalLaps) {
      k.finished = true
      k.finishOrder = nextFinishOrder()
    }
  } else if (k.prevT < 0.25 && t > 0.75) {
    // Rückwärts über die Linie – Runde zurücknehmen (nicht unter 0)
    if (k.lap > 0) k.lap -= 1
  }
  k.prevT = t
  k.t = t
}

// Leichte Abstoßung, damit Karts nicht ineinander stecken (für „Panzer" später relevant).
export function resolveCollisions(karts: KartState[]) {
  const R = 2.6
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i]
      const b = karts[j]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const d2 = dx * dx + dz * dz
      if (d2 < R * R && d2 > 0.0001) {
        const d = Math.sqrt(d2)
        const push = (R - d) / 2
        const nx = dx / d
        const nz = dz / d
        a.x -= nx * push
        a.z -= nz * push
        b.x += nx * push
        b.z += nz * push
        // Panzer-Upgrade reduziert den Tempoverlust (armor=1 -> *0.97 wie zuvor)
        a.speed *= 1 - 0.03 / a.upgrades.armor
        b.speed *= 1 - 0.03 / b.upgrades.armor
      }
    }
  }
}

export function rankKarts(karts: KartState[]) {
  const sorted = [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishOrder - b.finishOrder
    if (a.finished) return -1
    if (b.finished) return 1
    return b.lap + b.t - (a.lap + a.t)
  })
  sorted.forEach((k, i) => (k.rank = i + 1))
}

export function speedKmh(k: KartState): number {
  return Math.round(k.speed * KMH)
}
