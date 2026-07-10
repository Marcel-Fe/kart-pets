import {
  steerFromTilt,
  diveFromAccel,
  MAX_STEER,
  MAX_DIVE,
  TILT_REF,
} from '../src/game/kartVisual.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

// --- Lenkwinkel aus visualTilt ---
{
  ok('geradeaus = kein Einschlag', steerFromTilt(0) === 0)
  // raceSim: steer=+1 (links) => visualTilt strebt +0.12; steer=-1 (rechts) => -0.12
  ok('voll links = +MAX_STEER', near(steerFromTilt(TILT_REF), MAX_STEER), `${steerFromTilt(TILT_REF)}`)
  ok('voll rechts = -MAX_STEER', near(steerFromTilt(-TILT_REF), -MAX_STEER), `${steerFromTilt(-TILT_REF)}`)
  ok('halber Einschlag = halber Winkel', near(steerFromTilt(TILT_REF / 2), MAX_STEER / 2))
  // Drift setzt visualTilt bis 0.35 -> Rad schlägt voll ein, klemmt nicht darüber
  ok('Drift-Uebersteuern klemmt bei MAX_STEER', near(steerFromTilt(0.35), MAX_STEER), `${steerFromTilt(0.35)}`)
  ok('negatives Uebersteuern klemmt bei -MAX_STEER', near(steerFromTilt(-0.35), -MAX_STEER))
  // Nachweis für den Bug: bei rechtsgedrückter Taste ist visualTilt != 0 => steer != 0
  ok('rechts lenken erzeugt nicht 0', steerFromTilt(-0.06) < 0, `${steerFromTilt(-0.06)}`)
}

// --- Nicken aus Beschleunigung ---
{
  ok('konstante Fahrt = kein Nicken', diveFromAccel(0) === 0)
  ok('bremsen taucht die Nase ein (>0)', diveFromAccel(-20) > 0, `${diveFromAccel(-20)}`)
  ok('beschleunigen hebt die Nase (<0)', diveFromAccel(26) < 0, `${diveFromAccel(26)}`)
  ok('starkes Bremsen klemmt bei +MAX_DIVE', near(diveFromAccel(-1000), MAX_DIVE))
  ok('starkes Beschleunigen klemmt bei -MAX_DIVE', near(diveFromAccel(1000), -MAX_DIVE))
  // Kernpunkt des Fixes: pro Bild macht die Sim EINEN Schritt (ACCEL 26 * dt 0.05 ≈ 1.3
  // m/s), der real ~0.5s repräsentiert. Teilt man durch das geklemmte dt (0.05) statt
  // durch den echten delta (~0.5s), wird das Nicken um den Faktor ~10 übertrieben.
  const dv = 1.3
  const withRealDelta = diveFromAccel(-dv / 0.5)
  const withClampedDt = diveFromAccel(-dv / 0.05)
  ok('echter delta gibt sanftes Nicken', withRealDelta > 0 && withRealDelta < 0.01, `${withRealDelta}`)
  ok('geklemmtes dt uebertreibt um ~10x', near(withClampedDt / withRealDelta, 10), `${withClampedDt / withRealDelta}`)
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
