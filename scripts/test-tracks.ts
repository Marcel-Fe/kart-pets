// Prueft jede Strecke auf Fahrbarkeit:
//  - kreuzt oder beruehrt sich die Fahrbahn selbst?
//  - gibt es unfahrbar enge Knicke?
//  - ist sie lang genug fuer ein Rennen?
// Laeuft ueber die ECHTE TrackCurve, nicht ueber eine Nachbildung.
import { TRACKS, ROAD_WIDTH } from '../src/data/tracks.ts'
import { TrackCurve } from '../src/game/trackCurve.ts'

const SAMPLES = 400
const MIN_GAP = 26 // Samples, die entlang der Strecke als "benachbart" gelten
const MIN_SEPARATION = ROAD_WIDTH + 2 // Mittellinien muessen weiter auseinander liegen
const MIN_RADIUS = 9 // Meter; darunter ist die Kurve ein Knick
const MIN_LENGTH = 500 // Meter

let fails = 0
const fail = (msg: string) => {
  console.log('  FAIL  ' + msg)
  fails++
}

for (const track of TRACKS) {
  const c = new TrackCurve(track, SAMPLES)
  const n = c.samples.length
  const problems: string[] = []

  // 1) Selbstannaeherung: alle Paare, die entlang der Strecke weit auseinander liegen
  let worstSep = Infinity
  let worstPair = ''
  for (let i = 0; i < n; i++) {
    for (let j = i + MIN_GAP; j < n; j++) {
      if (Math.min(j - i, n - (j - i)) < MIN_GAP) continue // Ringabstand
      const d = c.samples[i].distanceTo(c.samples[j])
      if (d < worstSep) {
        worstSep = d
        worstPair = `${i}/${j}`
      }
    }
  }
  if (worstSep < MIN_SEPARATION) problems.push(`Fahrbahn zu nah an sich selbst: ${worstSep.toFixed(1)} m bei ${worstPair}`)

  // 2) Engster Kurvenradius aus dem Winkel zwischen aufeinanderfolgenden Tangenten
  let minRadius = Infinity
  let at = 0
  for (let i = 0; i < n; i++) {
    const t1 = c.tangents[i]
    const t2 = c.tangents[(i + 1) % n]
    const dot = Math.max(-1, Math.min(1, t1.dot(t2)))
    const ang = Math.acos(dot)
    const seg = c.samples[i].distanceTo(c.samples[(i + 1) % n])
    if (ang > 1e-6) {
      const r = seg / ang
      if (r < minRadius) {
        minRadius = r
        at = i
      }
    }
  }
  if (minRadius < MIN_RADIUS) problems.push(`zu enger Knick: Radius ${minRadius.toFixed(1)} m bei Sample ${at}`)

  // 3) Laenge
  if (c.length < MIN_LENGTH) problems.push(`zu kurz: ${c.length.toFixed(0)} m`)

  const okMark = problems.length ? 'FAIL' : 'OK  '
  console.log(
    `${okMark}  ${track.id.padEnd(18)} laenge=${c.length.toFixed(0).padStart(4)} m  ` +
      `engster Radius=${minRadius.toFixed(1).padStart(5)} m  ` +
      `min. Eigenabstand=${worstSep.toFixed(1).padStart(5)} m`,
  )
  problems.forEach(fail)
}

console.log(fails ? `\n${fails} FEHLER` : `\nAlle ${TRACKS.length} Strecken sind fahrbar`)
process.exit(fails ? 1 : 0)
