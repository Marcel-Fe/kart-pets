// Dezentes „Gummiband" für spannende Rennen bis zur Ziellinie – reine Logik,
// ohne React/Three und OHNE Eingriff in raceSim.ts. Wird in RaceScene nach der
// KI-Berechnung als Tempo-Faktor auf die KI-Karts angewandt (nur KI, nie Spieler).
// Unit-getestet in scripts/test-rubberband.ts.

export const RUBBERBAND_MAX = 0.08 // maximal ±8 % Tempo
export const RUBBERBAND_SENS = 1.0 // Empfindlichkeit auf den Fortschritts-Abstand

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/**
 * Tempo-Faktor für ein KI-Kart, abhängig vom Renn-Fortschritt gegenüber dem
 * Spieler (Fortschritt = lap + t). Liegt das Kart HINTER dem Spieler, fährt es
 * minimal schneller (holt auf, erzeugt Druck); liegt es DAVOR, minimal langsamer
 * (bleibt in Schlagdistanz). Dezent und bei ±RUBBERBAND_MAX gedeckelt, damit es
 * sich nie unfair anfühlt.
 */
export function rubberbandFactor(
  kartProgress: number,
  playerProgress: number,
  max = RUBBERBAND_MAX,
  sens = RUBBERBAND_SENS,
): number {
  const gap = playerProgress - kartProgress // > 0: Spieler vorne → Kart hinten → schneller
  return 1 + clamp(gap * sens, -max, max)
}
