// Misst das Fahrgefuehl gegen raceSim.ts: Beschleunigung, Hoechsttempo,
// Kurvenradius, Drift-Ladezeit, Boost. Das Rennen laeuft headless nicht los
// (Software-Rendering), deshalb messen wir die Physik direkt.
import {
  updatePlayer,
  updateAI,
  updateProgress,
  resolveCollisions,
  rankKarts,
  speedKmh,
  NEUTRAL_UPGRADES,
  type KartState,
  type PlayerInput,
} from '../src/game/raceSim.ts'
import { initCheer, updateCheer } from '../src/game/kartVisual.ts'
import { getPet, AI_STYLES } from '../src/data/pets.ts'
import { TRACKS, ROAD_WIDTH } from '../src/data/tracks.ts'
import { TrackCurve } from '../src/game/trackCurve.ts'

const DT = 1 / 60
const CRUISE: PlayerInput = { throttle: true, steerLeft: false, steerRight: false, drift: false, boost: false }

function makeKart(petId: string, level = 1): KartState {
  const pet = getPet(petId)
  return {
    id: pet.id,
    name: pet.name,
    emoji: pet.emoji,
    color: pet.color,
    isPlayer: true,
    pet,
    level,
    upgrades: { ...NEUTRAL_UPGRADES },
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,
    visualTilt: 0,
    t: 0,
    prevT: 0,
    lap: 0,
    finished: false,
    finishOrder: 0,
    rank: 1,
    drifting: false,
    driftCharge: 0,
    boostTime: 0,
    aiTargetLateral: 0,
    aiWanderTimer: 0,
  }
}

// Faehrt bis `done` erfuellt ist. Gibt die verstrichene Zeit zurueck (-1 = nie).
function runUntil(k: KartState, input: PlayerInput, done: (k: KartState) => boolean, maxSeconds = 60): number {
  for (let i = 0; i < maxSeconds / DT; i++) {
    updatePlayer(k, input, 0, DT)
    if (done(k)) return (i + 1) * DT
  }
  return -1
}

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}

console.log('=== Fahrgefuehl-Messung (Fynnox, Level 1, neutrale Upgrades) ===\n')

// --- Hoechsttempo ---
const top = makeKart('fynnox')
runUntil(top, CRUISE, () => false, 20)
const topSpeed = top.speed
const topKmh = speedKmh(top)
console.log(`Hoechsttempo           ${r2(topSpeed)} u/s  =  ${topKmh} km/h`)

// --- Beschleunigung ---
const acc = makeKart('fynnox')
const t50 = runUntil(acc, CRUISE, (k) => speedKmh(k) >= 50)
const acc2 = makeKart('fynnox')
const t90 = runUntil(acc2, CRUISE, (k) => k.speed >= topSpeed * 0.9)
const acc3 = makeKart('fynnox')
const t99 = runUntil(acc3, CRUISE, (k) => k.speed >= topSpeed * 0.99)
console.log(`0 -> 50 km/h           ${r2(t50)} s`)
console.log(`0 -> 90% Topspeed      ${r2(t90)} s`)
console.log(`0 -> 99% Topspeed      ${r2(t99)} s`)

// --- Schwung: Ausrollen gegen Beschleunigen auf DERSELBEN Strecke (50% <-> 100%) ---
// Nur so ist der Vergleich fair: traegt das Kart seinen Schwung laenger, als es
// braucht um ihn aufzubauen? Genau das unterscheidet "rollt" von "klebt".
const coast = makeKart('fynnox')
coast.speed = topSpeed
const tCoast = runUntil(coast, { ...CRUISE, throttle: false }, (k) => k.speed <= topSpeed * 0.5)
const spool = makeKart('fynnox')
spool.speed = topSpeed * 0.5
const tSpool = runUntil(spool, CRUISE, (k) => k.speed >= topSpeed * 0.99)
console.log(`Ausrollen 100% -> 50%  ${r2(tCoast)} s`)
console.log(`Beschleunigen 50% -> 100%  ${r2(tSpool)} s`)

// --- Kurvenradius bei Topspeed ---
// r = v / omega. omega messen wir ueber die Heading-Aenderung pro Sekunde.
function turnRadius(drift: boolean): { radius: number; omega: number; speed: number } {
  const k = makeKart('fynnox')
  k.speed = topSpeed
  const input: PlayerInput = { throttle: true, steerLeft: true, steerRight: false, drift, boost: false }
  // einschwingen lassen (visualTilt + Drift-Zustand)
  for (let i = 0; i < 30; i++) updatePlayer(k, input, 0, DT)
  const h0 = k.heading
  const steps = 60
  for (let i = 0; i < steps; i++) updatePlayer(k, input, 0, DT)
  const omega = (k.heading - h0) / (steps * DT)
  return { radius: k.speed / omega, omega, speed: k.speed }
}
const normalTurn = turnRadius(false)
const driftTurn = turnRadius(true)
console.log(`Kurvenradius normal    ${r1(normalTurn.radius)} u  (${r2(normalTurn.omega)} rad/s bei ${r2(normalTurn.speed)} u/s)`)
console.log(`Kurvenradius im Drift  ${r1(driftTurn.radius)} u  (${r2(driftTurn.omega)} rad/s bei ${r2(driftTurn.speed)} u/s)`)

// --- Drift-Ladezeit ---
const drift = makeKart('fynnox')
drift.speed = topSpeed
const driftInput: PlayerInput = { throttle: true, steerLeft: true, steerRight: false, drift: true, boost: false }
const tBoostable = runUntil(drift, driftInput, (k) => k.driftCharge >= 0.25)
const drift2 = makeKart('fynnox')
drift2.speed = topSpeed
const tFull = runUntil(drift2, driftInput, (k) => k.driftCharge >= 0.999)
console.log(`Drift bis boostfaehig  ${r2(tBoostable)} s  (Ladung 0.25)`)
console.log(`Drift bis voll         ${r2(tFull)} s  (Ladung 1.0)`)

// --- Boost ---
const boost = makeKart('fynnox')
boost.speed = topSpeed
for (let i = 0; i < tFull / DT; i++) updatePlayer(boost, driftInput, 0, DT)
const chargeBefore = boost.driftCharge
updatePlayer(boost, { ...CRUISE, boost: true }, 0, DT)
const boostDuration = boost.boostTime
let boostPeak = 0
runUntil(boost, CRUISE, (k) => {
  boostPeak = Math.max(boostPeak, k.speed)
  return k.boostTime <= 0
})
console.log(`Boost-Dauer (volle Leiste)  ${r2(boostDuration)} s  (Ladung ${r2(chargeBefore)})`)
console.log(`Tempo im Boost         ${r2(boostPeak)} u/s = ${Math.round(boostPeak * 3)} km/h  (+${Math.round((boostPeak / topSpeed - 1) * 100)}%)`)

// --- Gras ---
const grass = makeKart('fynnox')
grass.speed = topSpeed
let grassSteps = 0
for (let i = 0; i < 3 / DT; i++) {
  updatePlayer(grass, CRUISE, 999, DT) // lateral weit ausserhalb -> Gras
  grassSteps++
}
console.log(`Tempo nach 3 s im Gras ${r2(grass.speed)} u/s = ${speedKmh(grass)} km/h  (von ${topKmh})`)

// --- Pet-Spannweite ---
console.log('\n--- Hoechsttempo je Pet ---')
for (const id of ['fynnox', 'pompao', 'zippo', 'drako', 'neko']) {
  const k = makeKart(id)
  runUntil(k, CRUISE, () => false, 20)
  console.log(`  ${k.name.padEnd(8)} speed=${k.pet.speed} control=${k.pet.control}  ${speedKmh(k)} km/h`)
}

// --- Bezug zur echten Strecke: wie eng sind die Kurven wirklich? ---
// Radius aus drei benachbarten Mittellinien-Punkten (Umkreisradius).
function tightestRadius(c: TrackCurve): number {
  let min = Infinity
  const n = c.samples.length
  const step = 4 // ueber ein paar Samples mitteln, sonst dominiert Sampling-Rauschen
  for (let i = 0; i < n; i++) {
    const a = c.samples[i]
    const b = c.samples[(i + step) % n]
    const d = c.samples[(i + step * 2) % n]
    const ab = a.distanceTo(b)
    const bd = b.distanceTo(d)
    const ad = a.distanceTo(d)
    // Flaeche via Kreuzprodukt in der XZ-Ebene
    const area = Math.abs((b.x - a.x) * (d.z - a.z) - (d.x - a.x) * (b.z - a.z)) / 2
    if (area < 1e-6) continue
    const r = (ab * bd * ad) / (4 * area)
    if (r < min) min = r
  }
  return min
}

console.log('\n--- Engste Kurve je Strecke (Mittellinien-Radius) ---')
let globalTightest = Infinity
for (const track of TRACKS) {
  const c = new TrackCurve(track, 400)
  const r = tightestRadius(c)
  globalTightest = Math.min(globalTightest, r)
  console.log(`  ${track.name.padEnd(22)} engster Radius ${r1(r)} u,  Laenge ${Math.round(c.length)} u`)
}
console.log(`\nStrassenbreite ${ROAD_WIDTH} u (halb ${ROAD_WIDTH / 2} u)`)
console.log(`Engste Kurve ueberhaupt: ${r1(globalTightest)} u`)
console.log(`Wendekreis bei Vollgas:  ${r1(normalTurn.radius)} u  -> ${normalTurn.radius < globalTightest ? 'schafft jede Kurve OHNE Bremsen' : 'muss in engen Kurven vom Gas'}`)

// --- KI-Regression: schafft die KI die Strecken noch sauber? ---
// Wichtig, weil TURN/ACCEL auch fuer die Gegner gelten. Eine KI, die staendig
// im Gras haengt, ist der Beweis dass das Tuning zu weit ging.
function aiLap(track: (typeof TRACKS)[number], styleIdx: number): { seconds: number; grassPct: number; avgKmh: number } {
  const c = new TrackCurve(track, 400)
  const k = makeKart('fynnox')
  k.isPlayer = false
  k.aiStyle = AI_STYLES[styleIdx]
  const start = c.pointAt(0)
  k.x = start.x
  k.z = start.z
  k.heading = c.headingAt(0)
  k.speed = 0

  let steps = 0
  let grassSteps = 0
  let speedSum = 0
  let prevT = 0
  const maxSteps = 120 / DT
  for (; steps < maxSteps; steps++) {
    const proj = c.project(k.x, k.z)
    // Im Rennen haelt updateProgress k.t nach – updateAI zielt darauf voraus.
    k.t = proj.t
    updateAI(k, c, proj.lateral, DT)
    if (Math.abs(proj.lateral) > ROAD_WIDTH / 2) grassSteps++
    speedSum += k.speed
    // Runde voll, wenn t wieder ueber die Startlinie wandert
    if (prevT > 0.75 && proj.t < 0.25 && steps > 60) {
      steps++
      break
    }
    prevT = proj.t
  }
  return {
    seconds: steps * DT,
    grassPct: (grassSteps / steps) * 100,
    avgKmh: Math.round((speedSum / steps) * 3),
  }
}

console.log('\n--- KI-Runde je Strecke (Stil "Raser") ---')
let worstGrass = 0
let slowestLap = 0
for (const track of TRACKS) {
  const lap = aiLap(track, 0)
  worstGrass = Math.max(worstGrass, lap.grassPct)
  slowestLap = Math.max(slowestLap, lap.seconds)
  const flag = lap.grassPct > 12 ? '  <-- viel Gras!' : ''
  console.log(`  ${track.name.padEnd(22)} ${r1(lap.seconds)} s,  ${r1(lap.grassPct)}% im Gras,  Schnitt ${lap.avgKmh} km/h${flag}`)
}

// --- Jubel-Geste im echten Rennverlauf ---
// Beweist, dass das Winken keine tote Funktion ist: ein volles 4-Kart-Rennen
// simulieren und zaehlen, wie oft die Geste tatsaechlich ausgeloest wird.
function cheerCountsInRace(track: (typeof TRACKS)[number], laps = 2) {
  const c = new TrackCurve(track, 400)
  const ids = ['fynnox', 'pompao', 'zippo', 'drako']
  const field = ids.map((id, i) => {
    const k = makeKart(id)
    k.isPlayer = false
    k.aiStyle = AI_STYLES[i % AI_STYLES.length]
    const p = c.pointAt(0)
    const nor = c.normals[0]
    // Startaufstellung: leicht versetzt nebeneinander
    k.x = p.x + nor.x * (i - 1.5) * 3
    k.z = p.z + nor.z * (i - 1.5) * 3
    k.heading = c.headingAt(0)
    return k
  })
  const cheers = field.map((k) => initCheer(k.rank, k.finished))
  const triggered = field.map(() => 0)
  let order = 0

  const maxSteps = 180 / DT
  for (let step = 0; step < maxSteps; step++) {
    for (const k of field) {
      if (k.finished) continue
      const proj = c.project(k.x, k.z)
      k.t = proj.t
      updateAI(k, c, proj.lateral, DT)
      const after = c.project(k.x, k.z)
      updateProgress(k, after.t, laps, () => ++order)
    }
    resolveCollisions(field)
    rankKarts(field)
    field.forEach((k, i) => {
      const before = cheers[i].remaining
      const amt = updateCheer(cheers[i], k.rank, k.finished, DT)
      // Neustart der Geste = Auslösung (Restzeit springt nach oben)
      if (cheers[i].remaining > before + 0.001) triggered[i]++
      void amt
    })
    if (field.every((k) => k.finished)) break
  }
  return { triggered, names: field.map((k) => k.name), allFinished: field.every((k) => k.finished) }
}

console.log('\n--- Jubel-Geste im simulierten Rennen (4 Karts, 2 Runden) ---')
const race = cheerCountsInRace(TRACKS[0])
race.names.forEach((n, i) => console.log(`  ${n.padEnd(12)} winkt ${race.triggered[i]}x`))
const totalCheers = race.triggered.reduce((a, b) => a + b, 0)
console.log(`  Gesamt ${totalCheers} Gesten, alle im Ziel: ${race.allFinished}`)

console.log('\n=== Plausibilitaets-Checks ===')
// Arcade-Kart: Vollgas soll sich zuegig anfuehlen, aber nicht sofort am Anschlag sein.
ok('Beschleunigung 0->90% zwischen 1 und 4 s', t90 > 1 && t90 < 4, `${r2(t90)} s`)
ok('Kurvenradius normal enger als 60 u', normalTurn.radius > 0 && normalTurn.radius < 60, `${r1(normalTurn.radius)} u`)
ok('Drift dreht enger als normal', driftTurn.radius < normalTurn.radius, `${r1(driftTurn.radius)} vs ${r1(normalTurn.radius)}`)
ok('Drift wird in unter 2 s boostfaehig', tBoostable > 0 && tBoostable < 2, `${r2(tBoostable)} s`)
ok('Boost dauert mindestens 1 s', boostDuration >= 1, `${r2(boostDuration)} s`)
ok('Boost bringt spuerbar Tempo (>15%)', boostPeak / topSpeed > 1.15, `+${Math.round((boostPeak / topSpeed - 1) * 100)}%`)
ok('Gras bremst deutlich aus', grass.speed < topSpeed * 0.6, `${r2(grass.speed)} vs ${r2(topSpeed)}`)
ok('Kart traegt Schwung (Ausrollen nicht kuerzer als Beschleunigen)', tCoast >= tSpool * 0.9, `Ausrollen ${r2(tCoast)} s vs Beschleunigen ${r2(tSpool)} s`)
ok('Enge Kurven erzwingen Drift oder Bremsen', normalTurn.radius > globalTightest, `Wendekreis ${r1(normalTurn.radius)} u vs engste Kurve ${r1(globalTightest)} u`)
ok('Drift schafft die engste Kurve', driftTurn.radius <= globalTightest, `${r1(driftTurn.radius)} u vs ${r1(globalTightest)} u`)
ok('KI bleibt weitgehend auf der Strecke (<12% Gras)', worstGrass < 12, `${r1(worstGrass)}%`)
ok('KI faehrt eine Runde in unter 60 s', slowestLap < 60, `${r1(slowestLap)} s`)
ok('Jubel-Geste loest im Rennen tatsaechlich aus', totalCheers > 0, `${totalCheers} Gesten`)
ok('Jubel-Geste bleibt sparsam (kein Dauerwinken)', totalCheers < 40, `${totalCheers} Gesten`)
ok('alle Karts kommen ins Ziel', race.allFinished)
void grassSteps

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Checks bestanden')
process.exit(fails ? 1 : 0)
