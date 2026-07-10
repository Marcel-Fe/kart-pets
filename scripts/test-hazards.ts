import { updateHazards, spinAngle, SPIN_DURATION, SPIN_MAX_SPEED } from '../src/game/hazards.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}
const kart = (x: number, z: number, speed = 30, isPlayer = false) => ({ x, z, speed, drifting: false, driftCharge: 0.8, isPlayer })

// 1) Direkter Treffer
{
  const k = [kart(0, 0)]
  const spin = [0], prev: any[] = [], timers = [0]
  updateHazards(k, [{ x: 0, z: 0 }], spin, prev, timers, 0.05)
  ok('direkter Treffer loest Schleudern aus', spin[0] === SPIN_DURATION, `spin=${spin[0]}`)
  ok('Tempo bricht ein', Math.abs(k[0].speed - 30 * 0.35) < 1e-9, `speed=${k[0].speed}`)
  ok('Boost-Ladung weg', k[0].driftCharge === 0)
  ok('Banane verschwindet', timers[0] > 0, `timer=${timers[0]}`)
}

// 2) Knapp daneben (3 m) -> kein Treffer
{
  const k = [kart(3, 0)]
  const spin = [0], prev: any[] = [], timers = [0]
  updateHazards(k, [{ x: 0, z: 0 }], spin, prev, timers, 0.05)
  ok('3 m daneben = kein Treffer', spin[0] === 0)
}

// 3) DURCHTUNNELN: Kart springt in einem Schritt ueber die Banane hinweg
{
  const k = [kart(-10, 0)]
  const spin = [0], prev: any[] = [{ x: -10, z: 0 }], timers = [0]
  k[0].x = 10 // 20 m Sprung, Banane bei (0,0) liegt mittendrin
  updateHazards(k, [{ x: 0, z: 0 }], spin, prev, timers, 0.05)
  ok('20-m-Sprung ueber die Banane wird erkannt', spin[0] === SPIN_DURATION, `spin=${spin[0]}`)
}

// 4) Schleudern laeuft aus und deckelt das Tempo
{
  const k = [kart(50, 50)]
  const spin = [SPIN_DURATION], prev: any[] = [{ x: 50, z: 50 }], timers = [0]
  k[0].speed = 30
  updateHazards(k, [{ x: 0, z: 0 }], spin, prev, timers, 0.1)
  ok('Tempo waehrend Schleudern gedeckelt', k[0].speed === SPIN_MAX_SPEED, `speed=${k[0].speed}`)
  ok('Schleuderzeit laeuft ab', Math.abs(spin[0] - (SPIN_DURATION - 0.1)) < 1e-9, `spin=${spin[0]}`)
  let t = spin[0], guard = 0
  while (t > 0 && guard++ < 1000) { updateHazards(k, [], spin, prev, timers, 0.05); t = spin[0] }
  ok('Schleudern endet', spin[0] === 0)
  ok('Drehwinkel endet bei 0', spinAngle(0) === 0)
}

// 5) Wer schleudert, wird nicht erneut getroffen
{
  const k = [kart(0, 0)]
  const spin = [0.5], prev: any[] = [{ x: 0, z: 0 }], timers = [0]
  updateHazards(k, [{ x: 0, z: 0 }], spin, prev, timers, 0.05)
  ok('kein Doppel-Treffer waehrend des Schleuderns', timers[0] === 0)
}

// 6) Gegner werden genauso getroffen, und die Banane kommt zurueck
{
  const ai = [kart(0, 0, 25, false), kart(100, 100, 25, false)]
  const spin = [0, 0], prev: any[] = [], timers = [0]
  const hits: number[] = []
  updateHazards(ai, [{ x: 0, z: 0 }], spin, prev, timers, 0.05, (i) => hits.push(i))
  ok('KI-Kart wird getroffen', spin[0] === SPIN_DURATION && hits[0] === 0, `hits=${hits}`)
  let guard = 0
  while (timers[0] > 0 && guard++ < 1000) updateHazards(ai, [{ x: 0, z: 0 }], spin, prev, timers, 0.05)
  ok('Banane kommt nach Ablauf zurueck', timers[0] === 0, `nach ${guard} Schritten`)
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
