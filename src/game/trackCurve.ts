import * as THREE from 'three'
import type { TrackDef } from '../data/tracks'
import { ROAD_WIDTH } from '../data/tracks'

const UP = new THREE.Vector3(0, 1, 0)

// Kapselt die Mittellinie einer Strecke als geschlossene, glatte Kurve und
// liefert alles, was Rendering, Physik und KI brauchen.
export class TrackCurve {
  curve: THREE.CatmullRomCurve3
  samples: THREE.Vector3[] // vorgesampelte Mittellinien-Punkte
  tangents: THREE.Vector3[] // Fahrtrichtung je Sample
  normals: THREE.Vector3[] // seitliche Richtung (rechts) je Sample
  length: number

  constructor(track: TrackDef, divisions = 400) {
    const pts = track.points.map(([x, z]) => new THREE.Vector3(x, 0, z))
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)
    this.length = this.curve.getLength()
    this.samples = []
    this.tangents = []
    this.normals = []
    for (let i = 0; i < divisions; i++) {
      const t = i / divisions
      const p = this.curve.getPointAt(t)
      const tan = this.curve.getTangentAt(t)
      const nor = new THREE.Vector3().crossVectors(tan, UP).normalize()
      this.samples.push(p)
      this.tangents.push(tan)
      this.normals.push(nor)
    }
  }

  // Punkt auf der Mittellinie bei Parameter t (0..1), wrappt automatisch.
  pointAt(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.curve.getPointAt(((t % 1) + 1) % 1, out)
  }

  // Heading (Winkel um Y) der Fahrtrichtung bei t.
  headingAt(t: number): number {
    const tan = this.curve.getTangentAt(((t % 1) + 1) % 1)
    return Math.atan2(tan.x, tan.z)
  }

  // Findet den nächsten Sample-Index zu einer Position -> liefert t und
  // den seitlichen Abstand (signed, + = rechts der Linie).
  project(x: number, z: number): { t: number; lateral: number } {
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i]
      const dx = x - s.x
      const dz = z - s.z
      const d = dx * dx + dz * dz
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    const s = this.samples[best]
    const n = this.normals[best]
    const lateral = (x - s.x) * n.x + (z - s.z) * n.z
    return { t: best / this.samples.length, lateral }
  }

  // Baut die sichtbare Fahrbahn als Band (zwei Kanten entlang der Mittellinie).
  buildRoadGeometry(): THREE.BufferGeometry {
    const half = ROAD_WIDTH / 2
    const n = this.samples.length
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= n; i++) {
      const idx = i % n
      const p = this.samples[idx]
      const nor = this.normals[idx]
      const lx = p.x + nor.x * half
      const lz = p.z + nor.z * half
      const rx = p.x - nor.x * half
      const rz = p.z - nor.z * half
      positions.push(lx, 0.02, lz)
      positions.push(rx, 0.02, rz)
      const v = i / 6
      uvs.push(0, v, 1, v)
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = i * 2 + 2
      const d = i * 2 + 3
      indices.push(a, b, c, b, d, c)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  // Durchgehende Fahrbahn-Linie bei seitlichem Versatz `offset` (weiße Markierung).
  buildLineGeometry(offset: number, width = 0.4): THREE.BufferGeometry {
    const n = this.samples.length
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= n; i++) {
      const idx = i % n
      const p = this.samples[idx]
      const nor = this.normals[idx]
      const a = offset - width / 2
      const b = offset + width / 2
      positions.push(p.x + nor.x * a, 0.035, p.z + nor.z * a)
      positions.push(p.x + nor.x * b, 0.035, p.z + nor.z * b)
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = i * 2 + 2
      const d = i * 2 + 3
      indices.push(a, b, c, b, d, c)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  // Schmale Randstreifen (links/rechts) für den klaren Cartoon-Look.
  buildBorderGeometry(side: 1 | -1): THREE.BufferGeometry {
    const half = ROAD_WIDTH / 2
    const n = this.samples.length
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= n; i++) {
      const idx = i % n
      const p = this.samples[idx]
      const nor = this.normals[idx]
      const inner = half * side
      const outer = (half + 1.4) * side
      positions.push(p.x + nor.x * inner, 0.05, p.z + nor.z * inner)
      positions.push(p.x + nor.x * outer, 0.05, p.z + nor.z * outer)
      const v = i / 4
      uvs.push(0, v, 1, v)
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = i * 2 + 2
      const d = i * 2 + 3
      indices.push(a, b, c, b, d, c)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }
}
