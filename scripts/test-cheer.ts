import {
  cheerGain,
  spectatorPositions,
  CHEER_RADIUS,
  CHEER_FILL_RATE,
  SPECTATOR_FRACS,
  SPECTATOR_COUNT,
  SPECTATOR_BASE,
  POWER_META,
  type Vec2,
  type CurveLike,
} from '../src/game/cheer.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

// --- Jubel-Leiste ---
{
  const spots: Vec2[] = [{ x: 0, z: 0 }]
  ok('niemand in Reichweite = kein Zuwachs', cheerGain(100, 100, spots, 0.1) === 0)
  ok('ein Zuschauer in Reichweite füllt', cheerGain(0, 0, spots, 1) > 0)
  // genau ein naher Zuschauer: near/3 -> 1/3 der Rate
  ok('ein Zuschauer = 1/3 der Rate', near(cheerGain(0, 0, spots, 1), (1 / 3) * CHEER_FILL_RATE), `${cheerGain(0, 0, spots, 1)}`)
  // drei nahe: volle Rate
  const three: Vec2[] = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 }]
  ok('drei Zuschauer = volle Rate', near(cheerGain(0, 0, three, 1), CHEER_FILL_RATE))
  // mehr als drei deckelt bei voller Rate
  const five: Vec2[] = Array.from({ length: 5 }, () => ({ x: 0, z: 0 }))
  ok('mehr als drei deckelt', near(cheerGain(0, 0, five, 1), CHEER_FILL_RATE))
  // genau am Radius zählt noch, knapp dahinter nicht
  ok('genau am Radius zählt', cheerGain(CHEER_RADIUS, 0, spots, 1) > 0)
  ok('knapp außerhalb zählt nicht', cheerGain(CHEER_RADIUS + 0.01, 0, spots, 1) === 0)
  // dt skaliert linear
  ok('doppeltes dt = doppelter Zuwachs', near(cheerGain(0, 0, spots, 0.2), 2 * cheerGain(0, 0, spots, 0.1)))
}

// --- Zuschauer-Positionen ---
{
  // Fake-Curve: 100 Samples auf der x-Achse, Normale zeigt +z, Tangente +x.
  const N = 100
  const curve: CurveLike = {
    samples: Array.from({ length: N }, (_, i) => ({ x: i, z: 0 })),
    normals: Array.from({ length: N }, () => ({ x: 0, z: 1 })),
    tangents: Array.from({ length: N }, () => ({ x: 1, z: 0 })),
  }
  const spots = spectatorPositions(curve)
  const expected = SPECTATOR_FRACS.length * 2 * SPECTATOR_COUNT
  ok('Anzahl Zuschauer stimmt', spots.length === expected, `${spots.length}/${expected}`)
  // beide Seiten vertreten: es gibt Punkte bei z = +base und z = -base
  ok('rechte Tribüne bei +base', spots.some((s) => near(s.z, SPECTATOR_BASE)))
  ok('linke Tribüne bei -base', spots.some((s) => near(s.z, -SPECTATOR_BASE)))
  // Positionen liegen seitlich vom Streckenrand (|z| >= base - etwas)
  ok('alle stehen seitlich der Strecke', spots.every((s) => Math.abs(s.z) === SPECTATOR_BASE))
}

// --- Power-Metadaten vollständig ---
{
  const keys: (keyof typeof POWER_META)[] = ['fire', 'jump', 'invincible', 'scare']
  ok('jede Power hat Label + Emoji', keys.every((k) => POWER_META[k].label && POWER_META[k].emoji))
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
