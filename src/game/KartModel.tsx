import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Billboard, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { PetFigure } from './PetFigure'
import { ViperKart, KART_SEAT, type KartParts } from './ViperKart'
import { steerFromTilt, diveFromAccel } from './kartVisual'
import { asset } from '../utils/asset'
import type { KartState } from './raceSim'
import type { EarType } from '../types'

interface Props {
  path: string
  color: string
  earType: EarType
  cutImage?: string
  raceImage?: string
  kart: KartState
  bodyColor?: string // Kart-Design: Lackierung Motorhaube/Nase (nur Spieler)
  chassisColor?: string // Kart-Design: Lackierung Chassis/Seitenkästen (nur Spieler)
}

const SPARK_LOW = new THREE.Color('#ffae3f')
const SPARK_HIGH = new THREE.Color('#7fd0ff')
const SMOKE_COUNT = 10 // Puffs im wiederverwendeten Pool

// Fahrer als gemaltes 2.5D-Sprite (Mario-Kart-Look): das Pet-Artwork von hinten
// (raceImage) auf einer Plane, die als Billboard immer aufrecht zur Kamera schaut.
// Nutzt Marcels gemalte Charaktere statt einer gebauten 3D-Figur.
function DriverSprite({ url, y, kart }: { url: string; y: number; kart: KartState }) {
  const tex = useTexture(asset(url))
  tex.colorSpace = THREE.SRGBColorSpace
  const img = tex.image as { width?: number; height?: number } | undefined
  const aspect = img?.width && img?.height ? img.width / img.height : 0.8
  const height = 2.4

  // Lebendiger Fahrer: neigt sich in die Kurve, wippt mit dem Tempo, duckt sich
  // im Drift und macht beim Boost einen Freuden-Hüpfer.
  const inner = useRef<THREE.Group>(null)
  const lean = useRef(0)
  const hop = useRef(0)
  const wasBoosting = useRef(false)

  useFrame((_, delta) => {
    const g = inner.current
    if (!g) return
    const dt = Math.max(1e-4, Math.min(delta, 0.05))
    const t = performance.now() * 0.001
    const fast = Math.min(1, Math.abs(kart.speed) / 18)

    // Kurvenneigung (visualTilt trägt den Lenkeinschlag bereits), im Drift stärker
    const target = steerFromTilt(kart.visualTilt) * (kart.drifting ? 1.5 : 1.0)
    lean.current += (target - lean.current) * Math.min(1, dt * 10)
    g.rotation.z = -lean.current

    // Boost-Start löst einen Hüpfer aus, der weich ausklingt
    const boosting = kart.boostTime > 0
    if (boosting && !wasBoosting.current) hop.current = 1
    wasBoosting.current = boosting
    hop.current = Math.max(0, hop.current - dt * 2.2)
    const jump = Math.sin(hop.current * Math.PI) * 0.22

    // Wippen: schneller und höher, je flotter das Kart fährt
    const bob = Math.sin(t * 9 + kart.x * 0.3) * 0.035 * fast
    g.position.y = bob + jump

    // Im Drift duckt sich der Fahrer leicht, beim Boost streckt er sich
    const duck = kart.drifting ? 0.94 : 1
    const stretch = 1 + jump * 0.5
    g.scale.set(1, duck * stretch, 1)
  })

  return (
    <Billboard position={[0, y, 0]} lockX lockZ>
      <group ref={inner}>
        <mesh castShadow>
          <planeGeometry args={[height * aspect, height]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.35} toneMapped={false} />
        </mesh>
      </group>
    </Billboard>
  )
}

// Lädt ein echtes GLB-Kart-Modell (Kenney Car Kit, CC0) und ergänzt
// Effekte: Boost-Flamme, Drift-Funken, Unterboden-Glow in Pet-Farbe.
export const KartModel = forwardRef<THREE.Group, Props>(({ color, earType, raceImage, kart, bodyColor, chassisColor }, ref) => {
  // Fahrer sind echt 3D: eigenes GLB falls vorhanden, sonst die gebaute PetFigure.
  const KART_SCALE = 1.15
  const seat = KART_SEAT

  // Fahrdynamik: rein optisch, aus vorhandenen Werten abgeleitet (speed/heading).
  // Die Fahrphysik (raceSim.ts) bleibt unberührt.
  const bodyRef = useRef<THREE.Group>(null)
  const parts = useMemo<KartParts>(() => ({ steer: [null, null], spin: [null, null, null, null] }), [])
  const prevSpeed = useRef(0)
  const dive = useRef(0) // Nickbewegung: >0 = Nase taucht ein
  const steerVis = useRef(0) // geglätteter Lenkwinkel

  const flameRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const sparksRef = useRef<THREE.Group>(null)
  const sparkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SPARK_LOW, emissive: SPARK_LOW, emissiveIntensity: 2 }),
    [],
  )

  // Drift-Rauch: Pool im Welt-Raum. Eigene Materialien (jeder Puff eigene Opacity),
  // Zustand pro Puff wird wiederverwendet – kein Erzeugen pro Frame.
  const smokeRef = useRef<THREE.Group>(null)
  const smoke = useMemo(
    () => Array.from({ length: SMOKE_COUNT }, () => ({ life: 0, max: 0.55, x: 0, z: 0, base: 0.3 })),
    [],
  )
  const smokeMats = useMemo(
    () =>
      Array.from(
        { length: SMOKE_COUNT },
        () => new THREE.MeshBasicMaterial({ color: '#dcdcdc', transparent: true, opacity: 0, depthWrite: false }),
      ),
    [],
  )
  const smokeNext = useRef(0)
  const smokeTimer = useRef(0)
  const smokeSide = useRef(1)

  useFrame((_, delta) => {
    const t = performance.now() * 0.001
    const dt = Math.max(1e-4, Math.min(delta, 0.05))

    // --- Fahrdynamik ---
    // Räder ROLLEN mit dem Tempo um ihre Achse (X), nicht gieren um Y.
    const spinRate = kart.speed / 0.46
    for (const w of parts.spin) if (w) w.rotation.x += spinRate * dt

    // Lenkwinkel direkt aus der Karosserie-Neigung (visualTilt) ableiten – die
    // trägt den Lenkeinschlag bereits (raceSim.applyCommon), bildraten-unabhängig.
    const steerTarget = steerFromTilt(kart.visualTilt)
    steerVis.current += (steerTarget - steerVis.current) * Math.min(1, dt * 12)
    for (const w of parts.steer) if (w) w.rotation.y = steerVis.current

    // Nicken: bremsen taucht die Nase, beschleunigen hebt sie. Ableitung über den
    // ECHTEN Frame-Delta (nicht das auf 0.05 geklemmte dt), sonst wird die
    // Beschleunigung im Software-Rendering vielfach überschätzt und klemmt.
    const accel = (kart.speed - prevSpeed.current) / Math.max(1e-3, delta)
    prevSpeed.current = kart.speed
    const diveTarget = diveFromAccel(accel)
    dive.current += (diveTarget - dive.current) * Math.min(1, dt * 8)

    if (import.meta.env.DEV && kart.isPlayer) {
      // Nur fuer automatisierte Tests: Rad- und Lenkstellung des Spielers.
      const w = window as unknown as { __wheel?: number; __steer?: number; __dive?: number }
      w.__wheel = parts.spin[0]?.rotation.x ?? 0
      w.__steer = steerVis.current
      w.__dive = dive.current
    }

    if (bodyRef.current) {
      const b = bodyRef.current
      b.rotation.x = dive.current
      // Wanken: zusätzlich zum Drift-Neigen der äußeren Gruppe
      b.rotation.z = -steerVis.current * 0.16
      // leichtes Federn, stärker mit Tempo
      b.position.y = Math.sin(t * 9 + kart.x * 0.3) * 0.012 * Math.min(1, kart.speed / 18)
    }

    // Boost-Flamme (größer + heller beim Boost)
    const boosting = kart.boostTime > 0
    if (flameRef.current) {
      flameRef.current.visible = boosting
      if (boosting) {
        const pulse = 2.0 + Math.sin(t * 30) * 0.4
        flameRef.current.scale.set(1.0, 1.0, pulse)
      }
    }
    if (coreRef.current) {
      coreRef.current.visible = boosting
      if (boosting) {
        const pulse = 1.6 + Math.sin(t * 38) * 0.4
        coreRef.current.scale.set(0.9, 0.9, pulse)
      }
    }

    // Drift-Rauch: hinter den Hinterrädern spawnen (Welt-Raum → zieht nach)
    const grp = smokeRef.current
    if (grp) {
      const emit = (kart.drifting && Math.abs(kart.speed) > 6) || boosting
      smokeTimer.current -= delta
      if (emit && smokeTimer.current <= 0) {
        smokeTimer.current = 0.045
        const h = kart.heading
        const fx = Math.sin(h)
        const fz = Math.cos(h)
        const back = 1.9 * KART_SCALE // hinter das Heck
        const lat = 0.7 * smokeSide.current
        smokeSide.current *= -1 // Puffs abwechselnd links/rechts
        const p = smoke[smokeNext.current]
        smokeNext.current = (smokeNext.current + 1) % SMOKE_COUNT
        p.x = kart.x - fx * back + fz * lat
        p.z = kart.z - fz * back - fx * lat
        p.life = p.max
        p.base = boosting ? 0.42 : 0.3
      }
      for (let i = 0; i < SMOKE_COUNT; i++) {
        const p = smoke[i]
        const m = grp.children[i] as THREE.Mesh
        if (p.life > 0) {
          p.life -= delta
          const age = 1 - p.life / p.max // 0..1
          m.visible = true
          m.position.set(p.x, 0.3 + age * 0.9, p.z)
          m.scale.setScalar(p.base * (0.5 + age * 1.7))
          smokeMats[i].opacity = (1 - age) * 0.5
        } else if (m.visible) {
          m.visible = false
        }
      }
    }
    // Unterboden-Glow (stärker beim Boost)
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = boosting ? 0.55 : 0.22 + (kart.drifting ? 0.15 : 0)
    }
    // Drift-Funken (Farbe wechselt mit Ladung: orange -> blau)
    const sparking = kart.drifting && kart.driftCharge > 0.12
    if (sparksRef.current) {
      sparksRef.current.visible = sparking
      if (sparking) {
        sparkMat.color.copy(SPARK_LOW).lerp(SPARK_HIGH, kart.driftCharge)
        sparkMat.emissive.copy(sparkMat.color)
        sparksRef.current.children.forEach((c, i) => {
          const ph = t * 25 + i
          c.position.y = 0.1 + Math.abs(Math.sin(ph)) * 0.35
          c.position.x = (i % 2 === 0 ? -0.7 : 0.7) + Math.sin(ph) * 0.1
          const s = 0.6 + Math.abs(Math.sin(ph)) * 0.5
          c.scale.setScalar(s * 0.12)
        })
      }
    }
  })

  const seatPos: [number, number, number] = [0, seat.y * KART_SCALE, seat.z * KART_SCALE]
  return (
    <>
    <group ref={ref}>
      <group>
        {/* Federung: das ganze Kart nickt beim Bremsen und wankt in der Kurve. */}
        {/* Einheitlicher 2.5D-Look: stabiles Kart + gemaltes Pet-Sprite (Mario-Kart). */}
        <group ref={bodyRef}>
          <group scale={KART_SCALE}>
            <ViperKart accent={color} parts={parts} body={bodyColor} chassis={chassisColor} />
          </group>
        </group>
        <group position={seatPos}>
          {raceImage ? (
            // Marcels gemaltes Pet von hinten als Sprite (nutzt sein Artwork).
            <DriverSprite url={raceImage} y={0.7} kart={kart} />
          ) : (
            // Fallback ohne Artwork: gebaute Fahrerfigur.
            <group scale={1.5}>
              <PetFigure earType={earType} color={color} driving />
            </group>
          )}
        </group>
      </group>

      {/* Unterboden-Glow in Pet-Farbe */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Boost-Flamme hinten (Pet-Farbe) + weiß-heißer Innenkern */}
      <mesh ref={flameRef} position={[0, 0.4, -1.7]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.32, 1.6, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} transparent opacity={0.9} />
      </mesh>
      <mesh ref={coreRef} position={[0, 0.4, -1.55]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.17, 1.3, 10]} />
        <meshStandardMaterial color="#fff4d6" emissive="#ffffff" emissiveIntensity={4} transparent opacity={0.95} />
      </mesh>

      {/* Drift-Funken hinten */}
      <group ref={sparksRef} position={[0, 0, -1.5]} visible={false}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} material={sparkMat}>
            <sphereGeometry args={[1, 6, 6]} />
          </mesh>
        ))}
      </group>
    </group>

    {/* Drift-Rauch – eigene Gruppe im Welt-Raum (fährt NICHT mit dem Kart mit) */}
    <group ref={smokeRef}>
      {smoke.map((_, i) => (
        <mesh key={i} material={smokeMats[i]} visible={false}>
          <sphereGeometry args={[1, 6, 6]} />
        </mesh>
      ))}
    </group>
    </>
  )
})

KartModel.displayName = 'KartModel'
