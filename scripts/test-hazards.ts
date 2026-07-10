import {
  updateHazards,
  dropBanana,
  bananaVisible,
  spinAngle,
  rollItem,
  SPIN_DURATION,
  SPIN_MAX_SPEED,
  DROP_BEHIND,
  type Banana,
  type ItemBox,
  type Item,
  type HeldItem,
  type Vec2,
} from '../src/game/hazards.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}
const kart = (x: number, z: number, speed = 30, isPlayer = false, heading = 0) => ({
  x, z, heading, speed, drifting: false, driftCharge: 0.8, isPlayer,
})
const fixedBanana = (x: number, z: number): Banana => ({ x, z, timer: 0, fixed: true, alive: true })
const emptySlot = (): Banana => ({ x: 0, z: 0, timer: 0, fixed: false, alive: false })
const box = (x: number, z: number): ItemBox => ({ x, z, timer: 0 })

// --- Bananen: Treffer ---
{
  const k = [kart(0, 0)]
  const b = [fixedBanana(0, 0)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = []
  updateHazards(k, b, [], spin, held, prev, 0.05)
  ok('direkter Treffer loest Schleudern aus', spin[0] === SPIN_DURATION, `spin=${spin[0]}`)
  ok('Tempo bricht ein', Math.abs(k[0].speed - 30 * 0.35) < 1e-9, `speed=${k[0].speed}`)
  ok('Boost-Ladung weg', k[0].driftCharge === 0)
  ok('Strecken-Banane verschwindet kurz', !bananaVisible(b[0]) && b[0].alive)
}

// --- 3 m daneben ---
{
  const k = [kart(3, 0)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = []
  updateHazards(k, [fixedBanana(0, 0)], [], spin, held, prev, 0.05)
  ok('3 m daneben = kein Treffer', spin[0] === 0)
}

// --- Durchtunneln bei niedriger Bildrate ---
{
  const k = [kart(-10, 0)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = [{ x: -10, z: 0 }]
  k[0].x = 10 // 20-m-Sprung, Banane liegt mittendrin
  updateHazards(k, [fixedBanana(0, 0)], [], spin, held, prev, 0.05)
  ok('20-m-Sprung ueber die Banane wird erkannt', spin[0] === SPIN_DURATION)
}

// --- Schleudern laeuft aus ---
{
  const k = [kart(50, 50)]
  const spin = [SPIN_DURATION], held: Item[] = [null], prev: Vec2[] = [{ x: 50, z: 50 }]
  updateHazards(k, [], [], spin, held, prev, 0.1)
  ok('Tempo waehrend Schleudern gedeckelt', k[0].speed === SPIN_MAX_SPEED, `speed=${k[0].speed}`)
  let guard = 0
  while (spin[0] > 0 && guard++ < 1000) updateHazards(k, [], [], spin, held, prev, 0.05)
  ok('Schleudern endet', spin[0] === 0)
  ok('Drehwinkel endet bei 0', spinAngle(0) === 0)
}

// --- kein Doppel-Treffer ---
{
  const k = [kart(0, 0)]
  const b = [fixedBanana(0, 0)]
  const spin = [0.5], held: Item[] = [null], prev: Vec2[] = [{ x: 0, z: 0 }]
  updateHazards(k, b, [], spin, held, prev, 0.05)
  ok('kein Doppel-Treffer waehrend des Schleuderns', bananaVisible(b[0]))
}

// --- Gegner werden getroffen, Banane kehrt zurueck ---
{
  const ai = [kart(0, 0, 25), kart(100, 100, 25)]
  const b = [fixedBanana(0, 0)]
  const spin = [0, 0], held: Item[] = [null, null], prev: Vec2[] = []
  const hits: number[] = []
  updateHazards(ai, b, [], spin, held, prev, 0.05, { onHit: (i) => hits.push(i) })
  ok('KI-Kart wird getroffen', spin[0] === SPIN_DURATION && hits[0] === 0, `hits=${hits}`)
  let guard = 0
  while (!bananaVisible(b[0]) && guard++ < 1000) updateHazards(ai, b, [], spin, held, prev, 0.05)
  ok('Strecken-Banane kommt zurueck', bananaVisible(b[0]), `nach ${guard} Schritten`)
}

// --- Item-Box aufnehmen ---
{
  const k = [kart(0, 0)]
  const boxes = [box(0, 0)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = []
  const picks: number[] = []
  updateHazards(k, [], boxes, spin, held, prev, 0.05, { onPickup: (i) => picks.push(i) })
  ok('Item-Box gibt eine Banane', held[0] === 'banana' && picks[0] === 0)
  ok('Box verschwindet kurz', boxes[0].timer > 0)

  const boxes2 = [box(0, 0)] // Wer schon etwas hat, nimmt nichts Neues
  updateHazards(k, [], boxes2, spin, held, prev, 0.05)
  ok('mit vollem Inventar keine zweite Aufnahme', boxes2[0].timer === 0)
}

// --- Banane ablegen ---
{
  const k = kart(10, 20, 30, true, 0) // heading 0 => vorne ist +z
  const slots = [emptySlot(), emptySlot()]
  ok('Ablegen gelingt', dropBanana(k, slots))
  ok('liegt hinter dem Kart', Math.abs(slots[0].z - (20 - DROP_BEHIND)) < 1e-9, `z=${slots[0].z}`)
  ok('abgelegte Banane ist sichtbar', bananaVisible(slots[0]))
  ok('zweiter Platz noch frei', !slots[1].alive)
}

// --- abgelegte Banane verschwindet endgueltig ---
{
  const slots = [emptySlot()]
  dropBanana(kart(0, 0, 30, true, 0), slots) // liegt bei (0, -2.6)
  const victim = [kart(0, -2.6, 25)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = []
  updateHazards(victim, slots, [], spin, held, prev, 0.05)
  ok('abgelegte Banane trifft', spin[0] === SPIN_DURATION)
  ok('abgelegte Banane ist danach aufgebraucht', !slots[0].alive)
  let guard = 0
  while (guard++ < 300) updateHazards(victim, slots, [], spin, held, prev, 0.05)
  ok('sie kommt NICHT zurueck', !slots[0].alive)
}

// --- kein Platz mehr ---
{
  const full: Banana[] = [{ x: 0, z: 0, timer: 0, fixed: false, alive: true }]
  ok('ohne freien Platz wird nichts abgelegt', !dropBanana(kart(5, 5, 30, true, 0), full))
}

// --- Schild fängt den nächsten Treffer ab ---
{
  const k = [kart(0, 0)]
  const b = [fixedBanana(0, 0)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = []
  const shield = [true]
  const blocks: number[] = []
  updateHazards(k, b, [], spin, held, prev, 0.05, { onShieldBlock: (i) => blocks.push(i) }, shield)
  ok('Schild verhindert das Schleudern', spin[0] === 0 && blocks[0] === 0, `spin=${spin[0]}`)
  ok('Schild ist danach verbraucht', shield[0] === false)
  ok('Tempo bleibt beim Schild-Treffer erhalten', k[0].speed === 30)
  ok('Banane verschwindet trotz Schild', !bananaVisible(b[0]))
  // zweiter Treffer ohne Schild -> normales Schleudern
  const b2 = [fixedBanana(0, 0)]
  updateHazards(k, b2, [], spin, held, prev, 0.05, {}, shield)
  ok('nach verbrauchtem Schild trifft es normal', spin[0] === SPIN_DURATION)
}

// --- rollFn bestimmt das Box-Item ---
{
  const k = [kart(0, 0)]
  const boxes = [box(0, 0)]
  const spin = [0], held: Item[] = [null], prev: Vec2[] = []
  updateHazards(k, [], boxes, spin, held, prev, 0.05, {}, undefined, () => 'rocket')
  ok('rollFn setzt das aufgenommene Item', held[0] === 'rocket', `held=${held[0]}`)
}

// --- rollItem: Verteilung je Platz (deterministisch, gleichverteiltes rnd) ---
{
  // rnd durchläuft [0,1) in feinen Schritten -> exakte Wahrscheinlichkeits-Anteile
  const dist = (rank: number, total: number) => {
    const c: Record<HeldItem, number> = { banana: 0, rocket: 0, shield: 0 }
    const N = 10000
    for (let i = 0; i < N; i++) c[rollItem(rank, total, () => (i + 0.5) / N)]++
    return { banana: c.banana / N, rocket: c.rocket / N, shield: c.shield / N }
  }
  const front = dist(1, 4) // Führender
  const back = dist(4, 4) // Letzter
  ok('vorne dominiert die Banane', front.banana > 0.75, `banana=${front.banana}`)
  ok('vorne kaum Raketen', front.rocket < 0.15, `rocket=${front.rocket}`)
  ok('hinten viel mehr Raketen als vorne', back.rocket > front.rocket + 0.3, `${front.rocket}->${back.rocket}`)
  ok('hinten dominiert nicht mehr die Banane', back.banana < 0.2, `banana=${back.banana}`)
  ok('Schild-Anteil steigt nach hinten', back.shield > front.shield, `${front.shield}->${back.shield}`)
  // Einzelrennen (total=1) darf nicht durch 0 teilen
  const solo = rollItem(1, 1, () => 0.99)
  ok('total=1 liefert ein gueltiges Item', solo === 'banana', `solo=${solo}`)
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
