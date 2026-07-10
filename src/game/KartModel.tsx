import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { PETS } from '../data/pets'
import { PetFigure } from './PetFigure'
import { ViperKart, KART_SEAT } from './ViperKart'
import { asset } from '../utils/asset'
import type { KartState } from './raceSim'
import type { EarType } from '../types'

interface Props {
  path: string
  color: string
  earType: EarType
  cutImage?: string
  raceImage?: string
  model3d?: string
  model3dRot?: [number, number, number]
  kart: KartState
}

const SPARK_LOW = new THREE.Color('#ffae3f')
const SPARK_HIGH = new THREE.Color('#7fd0ff')
const SMOKE_COUNT = 10 // Puffs im wiederverwendeten Pool

// Echtes 3D-Pet-GLB (Meshy/TripoSR): normalisiert Größe+Position (Box3) und richtet
// es per Rotations-Offset in Fahrtrichtung (+Z) aus → man sieht den Rücken.
function RacePet({ url, rot }: { url: string; rot?: [number, number, number] }) {
  const { scene } = useGLTF(asset(url))
  const model = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const scale = 1.3 / Math.max(size.x, size.y, size.z)
    clone.scale.setScalar(scale)
    // in x/z zentrieren, mit den Füßen auf y=0 (= Kart-Sitz)
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  return (
    <group rotation={rot ?? [0, 0, 0]}>
      <primitive object={model} />
    </group>
  )
}

// Lädt ein echtes GLB-Kart-Modell (Kenney Car Kit, CC0) und ergänzt
// Effekte: Boost-Flamme, Drift-Funken, Unterboden-Glow in Pet-Farbe.
export const KartModel = forwardRef<THREE.Group, Props>(({ color, earType, model3d, model3dRot, kart }, ref) => {
  // Fahrer sind echt 3D: eigenes GLB falls vorhanden, sonst die gebaute PetFigure.
  const KART_SCALE = 1.15
  const seat = KART_SEAT

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
        {/* Selbstgebautes Viper-Kart (orange/blau), Nase in Fahrtrichtung */}
        <group scale={KART_SCALE}>
          <ViperKart accent={color} />
        </group>
        {model3d ? (
          // Echtes 3D-Modell, falls vorhanden
          <group position={seatPos} scale={1.8}>
            <RacePet url={model3d} rot={model3dRot} />
          </group>
        ) : (
          // Sonst die aus Grundformen gebaute 3D-Figur in Fahrer-Pose
          <group position={seatPos} scale={1.5}>
            <PetFigure earType={earType} color={color} driving />
          </group>
        )}
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

// Vorhandene Pet-3D-Modelle vorab laden (Kart ist jetzt selbstgebaut, kein GLB nötig).
PETS.forEach((p) => {
  if (p.model3d) useGLTF.preload(asset(p.model3d))
})
