// Jubel-Leiste & Pet-Power – reine Logik ohne React/Three, unit-getestet in
// scripts/test-cheer.ts. Fährt der Spieler dicht an den jubelnden Zuschauern
// vorbei, füllt sich eine Leiste; ist sie voll, löst die tier-spezifische
// Pet-Power aus. Die Zuschauer-Positionen teilen sich Ambience (Darstellung)
// und RaceScene (Nähe-Prüfung), damit beide dieselben Punkte meinen.

import type { PetPower } from '../types'
export type { PetPower }

export interface Vec2 {
  x: number
  z: number
}

// Minimale Sicht auf die TrackCurve – nur, was für die Positionen nötig ist.
export interface CurveLike {
  samples: Vec2[]
  normals: Vec2[]
  tangents: Vec2[]
}

export const SPECTATOR_FRACS = [0.0, 0.22, 0.45, 0.68, 0.88]
export const SPECTATOR_BASE = 8.5 // Abstand der Zuschauer von der Mittellinie
export const SPECTATOR_COUNT = 4 // Zuschauer je Tribüne und Seite
const SPECTATOR_SPACING = 1.9

/**
 * Zuschauer-Standorte entlang der Strecke (beide Seiten, mehrere Tribünen).
 * Identisch zu dem, was Ambience.Spectators rendert – nur ohne Sprite-Infos.
 */
export function spectatorPositions(curve: CurveLike, base = SPECTATOR_BASE): Vec2[] {
  const out: Vec2[] = []
  const n = curve.samples.length
  for (const f of SPECTATOR_FRACS) {
    const idx = Math.floor(f * n) % n
    const p = curve.samples[idx]
    const nor = curve.normals[idx]
    const tan = curve.tangents[idx]
    for (const side of [1, -1]) {
      for (let k = 0; k < SPECTATOR_COUNT; k++) {
        const along = (k - (SPECTATOR_COUNT - 1) / 2) * SPECTATOR_SPACING
        out.push({
          x: p.x + nor.x * base * side + tan.x * along,
          z: p.z + nor.z * base * side + tan.z * along,
        })
      }
    }
  }
  return out
}

export const CHEER_RADIUS = 6.5 // so nah zählt als „an den Fans vorbei"
export const CHEER_FILL_RATE = 0.42 // Leisten-Anteil pro Sekunde bei Nähe

/**
 * Zuwachs der Jubel-Leiste in diesem Schritt (0 = niemand in der Nähe). Mehr
 * Zuschauer in Reichweite füllen schneller, gedeckelt bei „drei oder mehr".
 */
export function cheerGain(
  px: number,
  pz: number,
  spots: Vec2[],
  dt: number,
  radius = CHEER_RADIUS,
  rate = CHEER_FILL_RATE,
): number {
  const r2 = radius * radius
  let near = 0
  for (const s of spots) {
    const dx = px - s.x
    const dz = pz - s.z
    if (dx * dx + dz * dz <= r2) near++
  }
  if (near === 0) return 0
  return Math.min(1, near / 3) * rate * dt
}

// --- Pet-Power: je Tier eine eigene Fähigkeit ---
export interface PowerMeta {
  label: string
  emoji: string
  color: string
  desc: string
}

export const POWER_META: Record<PetPower, PowerMeta> = {
  fire: { label: 'Feueratem', emoji: '🔥', color: '#ff5a1f', desc: 'Schmilzt Bananen in der Nähe' },
  jump: { label: 'Hüpfer', emoji: '🦘', color: '#39e07a', desc: 'Springt über Hindernisse' },
  invincible: { label: 'Unverwundbar', emoji: '✨', color: '#7cd0ff', desc: 'Kurz gegen Treffer geschützt' },
  scare: { label: 'Aufschrecken', emoji: '😱', color: '#b56bff', desc: 'Bremst nahe Gegner aus' },
}

export const POWER_DURATION = 3.0 // Sekunden Effekt-/Optik-Dauer
export const POWER_BOOST = 1.0 // gemeinsamer kurzer Schub beim Auslösen
export const POWER_FIRE_RADIUS = 9 // Reichweite Feueratem (schmilzt Bananen)
export const POWER_SCARE_RADIUS = 12 // Reichweite Aufschrecken (bremst Gegner)
export const POWER_SCARE_SLOW = 0.55 // Restgeschwindigkeit aufgeschreckter Gegner
