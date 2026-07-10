// Streckenhindernisse (Bananen) – reine Logik, ohne React und ohne Three.js.
// Bewusst getrennt von raceSim.ts (Fahrphysik) und von RaceScene (Darstellung),
// damit sie deterministisch testbar ist.

export const SPIN_DURATION = 1.1 // Sekunden Kontrollverlust
export const SPIN_TURNS = 2 // sichtbare Umdrehungen währenddessen
export const BANANA_RESPAWN = 6 // Sekunden bis die Banane wiederkommt
export const BANANA_HIT_R = 1.8 // Trefferradius in Metern
export const SPIN_MAX_SPEED = 7 // gedeckeltes Tempo während des Schleuderns
export const SPIN_SPEED_KEEP = 0.35 // Restgeschwindigkeit direkt beim Treffer

const HIT_R2 = BANANA_HIT_R * BANANA_HIT_R

export interface Vec2 {
  x: number
  z: number
}

// Nur die Felder, die Hindernisse anfassen dürfen.
export interface HazardKart {
  x: number
  z: number
  speed: number
  drifting: boolean
  driftCharge: number
  isPlayer: boolean
}

/**
 * Kürzester Abstand² eines Punktes zur Strecke A→B.
 * Nötig, weil ein Kart pro Rechenschritt mehrere Meter zurücklegt und sonst
 * bei niedriger Bildrate durch die Banane hindurchspringen könnte.
 */
export function segDist2(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const ex = px - (ax + t * dx)
  const ez = pz - (az + t * dz)
  return ex * ex + ez * ez
}

/**
 * Ein Schritt der Hindernis-Logik. Verändert `spin`, `timers`, `prev` und die
 * Karts (nur speed/drifting/driftCharge). `onHit` meldet jeden Treffer.
 *
 * @param spin   verbleibende Schleuderzeit je Kart (gleiche Reihenfolge wie karts)
 * @param prev   Position im vorigen Schritt je Kart (wird hier fortgeschrieben)
 * @param timers Rückkehr-Countdown je Banane (>0 = gerade eingesammelt)
 */
export function updateHazards(
  karts: HazardKart[],
  bananas: Vec2[],
  spin: number[],
  prev: Vec2[],
  timers: number[],
  dt: number,
  onHit?: (kartIndex: number) => void,
): void {
  // 1) Schleudern abbauen und Tempo deckeln
  for (let i = 0; i < karts.length; i++) {
    const s = spin[i] ?? 0
    if (s <= 0) continue
    spin[i] = Math.max(0, s - dt)
    karts[i].drifting = false
    if (karts[i].speed > SPIN_MAX_SPEED) karts[i].speed = SPIN_MAX_SPEED
  }

  // 2) Bananen: Rückkehr zählen bzw. Treffer prüfen
  for (let b = 0; b < bananas.length; b++) {
    if (timers[b] > 0) {
      timers[b] = Math.max(0, timers[b] - dt)
      continue
    }
    for (let k = 0; k < karts.length; k++) {
      if ((spin[k] ?? 0) > 0) continue // wer schon schleudert, wird nicht erneut getroffen
      const p = prev[k]
      const ax = p ? p.x : karts[k].x
      const az = p ? p.z : karts[k].z
      // die GANZE Bewegung dieses Schritts prüfen, nicht nur den Endpunkt
      if (segDist2(bananas[b].x, bananas[b].z, ax, az, karts[k].x, karts[k].z) > HIT_R2) continue
      spin[k] = SPIN_DURATION
      karts[k].speed *= SPIN_SPEED_KEEP
      karts[k].driftCharge = 0
      timers[b] = BANANA_RESPAWN
      onHit?.(k)
      break
    }
  }

  // 3) Positionen für die überstrichene Prüfung im nächsten Schritt sichern
  for (let i = 0; i < karts.length; i++) {
    const p = prev[i]
    if (p) {
      p.x = karts[i].x
      p.z = karts[i].z
    } else {
      prev[i] = { x: karts[i].x, z: karts[i].z }
    }
  }
}

/** Sichtbarer Drehwinkel des Modells während des Schleuderns (läuft auf 0 aus). */
export function spinAngle(remaining: number): number {
  return remaining > 0 ? (remaining / SPIN_DURATION) * SPIN_TURNS * Math.PI * 2 : 0
}
