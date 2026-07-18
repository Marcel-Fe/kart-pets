import {
  steerFromTilt,
  diveFromAccel,
  MAX_STEER,
  MAX_DIVE,
  TILT_REF,
  initCheer,
  updateCheer,
  waveAt,
  CHEER_OVERTAKE,
  CHEER_FINISH,
  CHEER_COOLDOWN,
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

// --- Jubel-Geste (Winken) ---
{
  const DT = 1 / 60
  // Ruhezustand: kein Winken, solange sich nichts tut
  const calm = initCheer(3)
  let amt = 0
  for (let i = 0; i < 120; i++) amt = updateCheer(calm, 3, false, DT)
  ok('ohne Anlass wird nicht gewunken', amt === 0, `${amt}`)

  // Ueberholen loest die Geste aus
  const over = initCheer(3)
  const started = updateCheer(over, 2, false, DT)
  ok('ueberholen loest Winken aus', started > 0 && over.remaining > 1, `rest ${over.remaining.toFixed(2)} s`)

  // ... und sie klingt nach CHEER_OVERTAKE wieder aus
  let steps = 1
  while (over.remaining > 0 && steps < 600) {
    updateCheer(over, 2, false, DT)
    steps++
  }
  ok('Winken endet nach ~CHEER_OVERTAKE', Math.abs(steps * DT - CHEER_OVERTAKE) < 0.1, `${(steps * DT).toFixed(2)} s`)

  // Sperre: enger Positionskampf darf kein Dauerwinken ausloesen
  const flap = initCheer(3)
  updateCheer(flap, 2, false, DT) // Ueberholen -> Geste + Sperre
  const restAfterFirst = flap.remaining
  updateCheer(flap, 3, false, DT) // zurueckgefallen
  updateCheer(flap, 2, false, DT) // wieder vorbei -> darf NICHT neu ausloesen
  ok('Sperre verhindert Dauerwinken', flap.remaining < restAfterFirst, `${flap.remaining.toFixed(2)} s`)
  ok('Sperre laeuft ueber CHEER_COOLDOWN', flap.cooldown > CHEER_COOLDOWN - 0.1, `${flap.cooldown.toFixed(2)} s`)

  // Zielankunft jubelt laenger als ein Ueberholvorgang
  const fin = initCheer(1)
  updateCheer(fin, 1, true, DT)
  ok('Zielankunft jubelt laenger', fin.remaining > CHEER_OVERTAKE, `${fin.remaining.toFixed(2)} s`)
  ok('Zielankunft jubelt ~CHEER_FINISH', Math.abs(fin.remaining - CHEER_FINISH) < 0.1, `${fin.remaining.toFixed(2)} s`)

  // Ein einmal ausgeloester Zieljubel wiederholt sich nicht jeden Frame
  const before = fin.remaining
  for (let i = 0; i < 10; i++) updateCheer(fin, 1, true, DT)
  ok('Zieljubel triggert nicht jeden Frame nach', fin.remaining < before, `${fin.remaining.toFixed(2)} s`)

  // Waehrend der Zielankunft wird das Ueberholen nicht mehr ausgewertet
  const finOver = initCheer(3)
  updateCheer(finOver, 3, true, DT)
  const finRest = finOver.remaining
  updateCheer(finOver, 1, true, DT)
  ok('im Ziel loest Rangwechsel kein Extra-Winken aus', finOver.remaining < finRest, `${finOver.remaining.toFixed(2)} s`)

  // Die Kippbewegung schwingt in beide Richtungen und steht bei amount 0 still
  ok('keine Geste = kein Ausschlag', waveAt(1.234, 0) === 0)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < 200; i++) {
    const v = waveAt(i * DT, 1)
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  ok('Winken kippt nach beiden Seiten', min < -0.9 && max > 0.9, `${min.toFixed(2)} .. ${max.toFixed(2)}`)
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
