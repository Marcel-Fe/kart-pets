import { rubberbandFactor, RUBBERBAND_MAX } from '../src/game/rubberband.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

// gleicher Fortschritt -> kein Effekt
ok('Gleichstand = Faktor 1', rubberbandFactor(1.5, 1.5) === 1)

// Kart hinter dem Spieler -> schneller (> 1)
ok('Kart hinten fährt schneller', rubberbandFactor(1.4, 1.5) > 1, `${rubberbandFactor(1.4, 1.5)}`)
// Kart vor dem Spieler -> langsamer (< 1)
ok('Kart vorne fährt langsamer', rubberbandFactor(1.6, 1.5) < 1, `${rubberbandFactor(1.6, 1.5)}`)

// symmetrisch um 1
{
  const behind = rubberbandFactor(1.4, 1.5)
  const ahead = rubberbandFactor(1.6, 1.5)
  ok('symmetrisch um 1', near(behind - 1, 1 - ahead), `${behind}/${ahead}`)
}

// deckelt bei ±MAX (großer Abstand)
ok('großer Rückstand deckelt bei +MAX', near(rubberbandFactor(0, 5), 1 + RUBBERBAND_MAX))
ok('großer Vorsprung deckelt bei -MAX', near(rubberbandFactor(5, 0), 1 - RUBBERBAND_MAX))

// bleibt in einem vernünftigen Band
{
  const vals = [rubberbandFactor(0, 10), rubberbandFactor(10, 0), rubberbandFactor(2.1, 2.0)]
  ok('immer innerhalb [1-MAX, 1+MAX]', vals.every((v) => v >= 1 - RUBBERBAND_MAX - 1e-9 && v <= 1 + RUBBERBAND_MAX + 1e-9))
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
