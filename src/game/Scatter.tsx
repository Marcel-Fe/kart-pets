import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Streu-Vegetation als InstancedMesh: statt tausender Einzel-Meshes ein
// Zeichenaufruf je Bauteil. Der Wind läuft im Vertex-Shader (kostet keine CPU).

export interface Deco {
  x: number
  z: number
  s: number
  rot: number
  variant: number
}

// Ein gemeinsamer Zeit-Wert für alle Wind-Materialien.
const uTime = { value: 0 }

// Biegt den Halm/Baum seitlich, proportional zur Höhe über dem Boden.
// Zwei überlagerte Frequenzen + Böen – wie die frühere CPU-Variante.
function makeMaterial(p: PartDef): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: p.vary ? '#ffffff' : (p.color ?? '#ffffff'), // weiß, damit instanceColor multipliziert
    roughness: p.roughness ?? 0.9,
    metalness: p.metalness ?? 0,
    flatShading: p.flatShading ?? false,
    transparent: p.transparent ?? false,
    opacity: p.opacity ?? 1,
    wireframe: p.wireframe ?? false,
    emissive: new THREE.Color(p.emissive ?? '#000000'),
    emissiveIntensity: p.emissiveIntensity ?? 1,
  })
  if (!p.wind) return m
  const amp = p.wind
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime
    sh.uniforms.uAmp = { value: amp }
    sh.vertexShader = 'uniform float uTime;\nuniform float uAmp;\n' + sh.vertexShader
    sh.vertexShader = sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float wph = instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.4;
       float wsw = sin(uTime * 1.5 + wph) * 0.82 + sin(uTime * 3.3 + wph * 1.7) * 0.18;
       float wg = 0.75 + 0.35 * sin(uTime * 0.4) + 0.2 * sin(uTime * 0.13 + 1.0);
       float wh = max(instanceMatrix[3].y + transformed.y, 0.0);
       transformed.x += wsw * uAmp * wg * wh;`,
    )
  }
  return m
}

interface PartDef {
  geom: THREE.BufferGeometry
  color?: string
  vary?: boolean
  wind?: number
  /** Leuchtkraft pulsiert (Lava-Glut, Neon-Reklame). Wert = Geschwindigkeit. */
  pulse?: number
  roughness?: number
  metalness?: number
  flatShading?: boolean
  transparent?: boolean
  opacity?: number
  wireframe?: boolean
  emissive?: string
  emissiveIntensity?: number
  shadow?: boolean
}

interface Inst {
  m: THREE.Matrix4
  c?: THREE.Color
}

const GREENS = ['#1d7a3a', '#268f45', '#2f9e54', '#176b33']
const CANDY = ['#ff5db0', '#8f6bff', '#3fc1ff', '#ffd23f', '#5be08a']

const Y = new THREE.Vector3(0, 1, 0)
const q = new THREE.Quaternion()
const e = new THREE.Euler()

// Transform eines Bauteils: Deco-Basis (Position, Y-Drehung, Skalierung) + lokaler Versatz.
function mat(d: Deco, off: [number, number, number], scale?: [number, number, number], rot?: THREE.Euler) {
  const m = new THREE.Matrix4()
  const pos = new THREE.Vector3(d.x + off[0] * d.s, off[1] * d.s, d.z + off[2] * d.s)
  const sc = scale ? new THREE.Vector3(...scale) : new THREE.Vector3(d.s, d.s, d.s)
  if (rot) q.setFromEuler(rot)
  else q.setFromAxisAngle(Y, d.rot)
  return m.compose(pos, q, sc)
}

function pick(arr: string[], n: number) {
  return arr[Math.abs(Math.round(n)) % arr.length]
}

// Baut je Theme die Bauteil-Listen. Rückgabe: Bauteil-Definition + Instanzen.
function buildParts(items: Deco[], decor: string): { def: PartDef; inst: Inst[] }[] {
  const P = (def: PartDef) => ({ def, inst: [] as Inst[] })

  if (decor === 'forest') {
    const firTrunk = P({ geom: new THREE.CylinderGeometry(0.3, 0.42, 2.2, 7), color: '#5e4128', wind: 0.012, shadow: true })
    const firC1 = P({ geom: new THREE.ConeGeometry(1.8, 2.8, 9), vary: true, wind: 0.018, shadow: true })
    const firC2 = P({ geom: new THREE.ConeGeometry(1.4, 2.4, 9), vary: true, wind: 0.022, shadow: true })
    const firC3 = P({ geom: new THREE.ConeGeometry(1.0, 2.0, 9), vary: true, wind: 0.026, shadow: true })
    const leafTrunk = P({ geom: new THREE.CylinderGeometry(0.26, 0.36, 2.0, 7), color: '#6b4a2b', wind: 0.014, shadow: true })
    const crown = P({ geom: new THREE.SphereGeometry(1.35, 12, 11), vary: true, roughness: 1, wind: 0.022, shadow: true })
    const puffA = P({ geom: new THREE.SphereGeometry(0.85, 10, 9), vary: true, roughness: 1, wind: 0.024, shadow: true })
    const puffB = P({ geom: new THREE.SphereGeometry(0.8, 10, 9), vary: true, roughness: 1, wind: 0.024, shadow: true })
    const bush = P({ geom: new THREE.SphereGeometry(0.7, 10, 8), vary: true, roughness: 1, wind: 0.02, shadow: true })
    const mStem = P({ geom: new THREE.CylinderGeometry(0.09, 0.12, 0.55, 7), color: '#f3ead6', roughness: 0.8 })
    const mCap = P({ geom: new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: '#d8362f', roughness: 0.55, shadow: true })

    for (const d of items) {
      const g = new THREE.Color(pick(GREENS, d.x * 1.7 + d.z))
      const g2 = new THREE.Color(pick(GREENS, d.x + d.z * 1.3))
      if (d.variant === 0) {
        firTrunk.inst.push({ m: mat(d, [0, 1.1, 0]) })
        firC1.inst.push({ m: mat(d, [0, 2.4, 0]), c: g })
        firC2.inst.push({ m: mat(d, [0, 3.6, 0]), c: g2 })
        firC3.inst.push({ m: mat(d, [0, 4.7, 0]), c: g })
      } else if (d.variant === 1) {
        leafTrunk.inst.push({ m: mat(d, [0, 1.0, 0]) })
        crown.inst.push({ m: mat(d, [0, 2.6, 0]), c: g })
        puffA.inst.push({ m: mat(d, [0.7, 2.1, 0.3]), c: g2 })
        puffB.inst.push({ m: mat(d, [-0.6, 2.2, -0.3]), c: g2 })
      } else {
        bush.inst.push({ m: mat(d, [0, 0.5, 0]), c: g })
        if (Math.abs(Math.round(d.x + d.z)) % 2 === 0) {
          mStem.inst.push({ m: mat(d, [0.6, 0.28, 0.25]) })
          mCap.inst.push({ m: mat(d, [0.6, 0.62, 0.25]) })
        }
      }
    }
    return [firTrunk, firC1, firC2, firC3, leafTrunk, crown, puffA, puffB, bush, mStem, mCap]
  }

  if (decor === 'candy') {
    const stick = P({ geom: new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), color: '#ffffff', wind: 0.012 })
    const ball = P({ geom: new THREE.SphereGeometry(0.7, 16, 16), vary: true, roughness: 0.2, metalness: 0.1, wind: 0.018, shadow: true })
    const gum = P({ geom: new THREE.ConeGeometry(0.9, 1.6, 16), vary: true, roughness: 0.25, wind: 0.012, shadow: true })
    const cand = P({ geom: new THREE.SphereGeometry(0.8, 16, 16), vary: true, roughness: 0.2, metalness: 0.2, wind: 0.01, shadow: true })
    for (const d of items) {
      const c = new THREE.Color(CANDY[(d.variant + Math.round(d.x)) % CANDY.length])
      if (d.variant === 0) {
        stick.inst.push({ m: mat(d, [0, 1.2, 0]) })
        ball.inst.push({ m: mat(d, [0, 2.6, 0]), c })
      } else if (d.variant === 1) gum.inst.push({ m: mat(d, [0, 0.6, 0]), c })
      else cand.inst.push({ m: mat(d, [0, 0.8, 0]), c })
    }
    return [stick, ball, gum, cand]
  }

  if (decor === 'volcano') {
    const rock = P({ geom: new THREE.DodecahedronGeometry(1), color: '#4a423e', roughness: 1, flatShading: true, shadow: true })
    const lava = P({ geom: new THREE.CircleGeometry(1.4, 16), color: '#ff5a1f', emissive: '#ff6a1f', emissiveIntensity: 1.6, pulse: 1.1 })
    const dead = P({ geom: new THREE.CylinderGeometry(0.18, 0.3, 2.8, 6), color: '#2a1c16', wind: 0.01, shadow: true })
    for (const d of items) {
      if (d.variant === 0) rock.inst.push({ m: mat(d, [0, 0.6, 0], undefined, e.set(d.rot, d.rot, 0)) })
      else if (d.variant === 1) lava.inst.push({ m: mat(d, [0, 0.07 / d.s, 0], undefined, e.set(-Math.PI / 2, 0, d.rot)) })
      else dead.inst.push({ m: mat(d, [0, 1.4, 0]) })
    }
    return [rock, lava, dead]
  }

  if (decor === 'ice') {
    const crystal = P({ geom: new THREE.ConeGeometry(0.6, 2.6, 6), color: '#bfeaff', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92, shadow: true })
    const mound = P({ geom: new THREE.SphereGeometry(1, 16, 12), color: '#ffffff', roughness: 0.9, shadow: true })
    const trunk = P({ geom: new THREE.CylinderGeometry(0.28, 0.36, 2.2, 8), color: '#7a5638', wind: 0.012, shadow: true })
    const c1 = P({ geom: new THREE.ConeGeometry(1.4, 2.8, 10), color: '#e8f4ff', roughness: 0.8, wind: 0.018, shadow: true })
    const c2 = P({ geom: new THREE.ConeGeometry(1, 1.8, 10), color: '#ffffff', roughness: 0.8, wind: 0.024, shadow: true })
    for (const d of items) {
      if (d.variant === 0) crystal.inst.push({ m: mat(d, [0, 1.1, 0]) })
      else if (d.variant === 1) mound.inst.push({ m: mat(d, [0, 0.3, 0], [d.s * 1.4, d.s * 0.8, d.s * 1.4]) })
      else {
        trunk.inst.push({ m: mat(d, [0, 1.1, 0]) })
        c1.inst.push({ m: mat(d, [0, 2.8, 0]) })
        c2.inst.push({ m: mat(d, [0, 3.9, 0]) })
      }
    }
    return [crystal, mound, trunk, c1, c2]
  }

  // city
  const sign = P({ geom: new THREE.BoxGeometry(0.4, 1.6, 0.4), color: '#ff2fa0', emissive: '#ff2fa0', emissiveIntensity: 1.4, pulse: 2.3, shadow: true })
  const tower = P({ geom: new THREE.BoxGeometry(1, 1, 1), color: '#0e1330', shadow: true })
  const wire = P({ geom: new THREE.BoxGeometry(1, 1, 1), vary: true, emissive: '#ffffff', emissiveIntensity: 1.1, pulse: 1.6, wireframe: true })
  for (const d of items) {
    if (d.variant === 2) {
      sign.inst.push({ m: mat(d, [0, 1.5, 0]) })
      continue
    }
    const h = 6 + d.variant * 6 + d.s * 6
    const pos = new THREE.Vector3(d.x, h / 2, d.z)
    q.setFromAxisAngle(Y, 0)
    tower.inst.push({ m: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(5 * d.s, h, 5 * d.s)) })
    wire.inst.push({
      m: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(5.1 * d.s, h * 0.96, 5.1 * d.s)),
      c: new THREE.Color(d.variant === 0 ? '#00e5ff' : '#b56bff'),
    })
  }
  return [sign, tower, wire]
}

function Part({ def, inst }: { def: PartDef; inst: Inst[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => makeMaterial(def), [def])

  // Glut/Neon atmen lassen: ein Material-Wert je Bild, unabhängig von der
  // Instanz-Anzahl – kostet praktisch nichts.
  const baseGlow = def.emissiveIntensity ?? 1
  useFrame(({ clock }) => {
    if (!def.pulse) return
    const t = clock.elapsedTime
    const slow = Math.sin(t * def.pulse)
    const flicker = Math.sin(t * def.pulse * 4.7 + 1.3) * 0.12
    material.emissiveIntensity = baseGlow * (1 + slow * 0.3 + flicker)
  })

  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    for (let i = 0; i < inst.length; i++) {
      im.setMatrixAt(i, inst[i].m)
      if (inst[i].c) im.setColorAt(i, inst[i].c!)
    }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
  }, [inst])

  if (!inst.length) return null
  return (
    <instancedMesh
      ref={ref}
      args={[def.geom, material, inst.length]}
      castShadow={def.shadow}
      receiveShadow={def.shadow}
    />
  )
}

export function Scatter({ items, decor }: { items: Deco[]; decor: string }) {
  const parts = useMemo(() => buildParts(items, decor), [items, decor])
  useFrame(({ clock }) => {
    uTime.value = clock.elapsedTime
  })
  return (
    <>
      {parts.map((p, i) => (
        <Part key={i} def={p.def} inst={p.inst} />
      ))}
    </>
  )
}
