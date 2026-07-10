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
