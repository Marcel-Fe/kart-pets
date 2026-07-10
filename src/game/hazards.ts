// Streckenhindernisse & Items – reine Logik, ohne React und ohne Three.js.
// Bewusst getrennt von raceSim.ts (Fahrphysik) und von RaceScene (Darstellung),
// damit sie deterministisch testbar ist. Siehe scripts/test-hazards.ts.

export const SPIN_DURATION = 1.1 // Sekunden Kontrollverlust
export const SPIN_TURNS = 2 // sichtbare Umdrehungen währenddessen
export const BANANA_RESPAWN = 6 // Sekunden bis eine Strecken-Banane wiederkommt
export const BANANA_HIT_R = 1.8 // Trefferradius in Metern
export const BOX_HIT_R = 2.2 // Item-Boxen greift man großzügiger ab
export const BOX_RESPAWN = 5 // Sekunden bis eine Item-Box wiederkommt
export const SPIN_MAX_SPEED = 7 // gedeckeltes Tempo während des Schleuderns
export const SPIN_SPEED_KEEP = 0.35 // Restgeschwindigkeit direkt beim Treffer
export const DROP_BEHIND = 2.6 // Meter hinter dem Kart wird abgelegt

const BANANA_R2 = BANANA_HIT_R * BANANA_HIT_R
const BOX_R2 = BOX_HIT_R * BOX_HIT_R

export type Item = 'banana' | null

export interface Vec2 {
  x: number
  z: number
}

export interface Banana {
  x: number
  z: number
  timer: number // >0 = gerade eingesammelt, zählt runter
  fixed: boolean // true = gehört zur Strecke (kommt zurück); false = abgelegt
  alive: boolean // false = freier Platz (nur bei abgelegten)
}

export interface ItemBox {
  x: number
  z: number
  timer: number // >0 = gerade abgegriffen
}

// Nur die Felder, die Hindernisse anfassen dürfen.
export interface HazardKart {
  x: number
  z: number
  heading: number
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

/** Legt eine Banane hinter dem Kart ab. Gibt false zurück, wenn kein Platz frei ist. */
export function dropBanana(kart: HazardKart, bananas: Banana[]): boolean {
  const slot = bananas.find((b) => !b.fixed && !b.alive)
  if (!slot) return false
  slot.x = kart.x - Math.sin(kart.heading) * DROP_BEHIND
  slot.z = kart.z - Math.cos(kart.heading) * DROP_BEHIND
  slot.timer = 0
  slot.alive = true
  return true
}

/** Sichtbar ist eine Banane nur, wenn sie existiert und nicht gerade abgeräumt wurde. */
export function bananaVisible(b: Banana): boolean {
  return b.alive && b.timer <= 0
}

/**
 * Ein Schritt der Hindernis- und Item-Logik.
 * Verändert `spin`, `held`, `prev`, die Bananen/Boxen und die Karts
 * (nur speed/drifting/driftCharge). Meldet Treffer und Aufnahmen.
 */
export function updateHazards(
  karts: HazardKart[],
  bananas: Banana[],
  boxes: ItemBox[],
  spin: number[],
  held: Item[],
  prev: Vec2[],
  dt: number,
  cb?: { onHit?: (kartIndex: number) => void; onPickup?: (kartIndex: number) => void },
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
  for (const b of bananas) {
    if (!b.alive) continue
    if (b.timer > 0) {
      b.timer = Math.max(0, b.timer - dt)
      continue
    }
    for (let k = 0; k < karts.length; k++) {
      if ((spin[k] ?? 0) > 0) continue // wer schleudert, wird nicht erneut getroffen
      const p = prev[k]
      const ax = p ? p.x : karts[k].x
      const az = p ? p.z : karts[k].z
      // die GANZE Bewegung dieses Schritts prüfen, nicht nur den Endpunkt
      if (segDist2(b.x, b.z, ax, az, karts[k].x, karts[k].z) > BANANA_R2) continue
      spin[k] = SPIN_DURATION
      karts[k].speed *= SPIN_SPEED_KEEP
      karts[k].driftCharge = 0
      if (b.fixed) b.timer = BANANA_RESPAWN // Strecken-Banane kommt zurück
      else b.alive = false // abgelegte ist aufgebraucht
      cb?.onHit?.(k)
      break
    }
  }

  // 3) Item-Boxen: nur wer nichts hat, greift zu
  for (const box of boxes) {
    if (box.timer > 0) {
      box.timer = Math.max(0, box.timer - dt)
      continue
    }
    for (let k = 0; k < karts.length; k++) {
      if (held[k]) continue
      const p = prev[k]
      const ax = p ? p.x : karts[k].x
      const az = p ? p.z : karts[k].z
      if (segDist2(box.x, box.z, ax, az, karts[k].x, karts[k].z) > BOX_R2) continue
      held[k] = 'banana'
      box.timer = BOX_RESPAWN
      cb?.onPickup?.(k)
      break
    }
  }

  // 4) Positionen für die überstrichene Prüfung im nächsten Schritt sichern
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
