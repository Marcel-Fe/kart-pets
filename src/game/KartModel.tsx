import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { PETS } from '../data/pets'
import { PetFigure } from './PetFigure'
import { asset } from '../utils/asset'
import type { KartState } from './raceSim'
import type { EarType } from '../types'

interface Props {
  path: string
  color: string
  earType: EarType
  kart: KartState
}

const SPARK_LOW = new THREE.Color('#ffae3f')
const SPARK_HIGH = new THREE.Color('#7fd0ff')

// Lädt ein echtes GLB-Kart-Modell (Kenney Car Kit, CC0) und ergänzt
// Effekte: Boost-Flamme, Drift-Funken, Unterboden-Glow in Pet-Farbe.
export const KartModel = forwardRef<THREE.Group, Props>(({ path, color, earType, kart }, ref) => {
  const { scene } = useGLTF(asset(path))
  const { model, seat } = useMemo(() => {
    const clone = scene.clone(true)
    clone.updateMatrixWorld(true)
    // Generische Kenney-Figur ausblenden, Sitzposition merken
    const char = clone.getObjectByName('character')
    const seat = new THREE.Vector3(0, 0.55, -0.05)
    if (char) {
      char.getWorldPosition(seat)
      char.visible = false
    }
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return { model: clone, seat }
  }, [scene])

  const flameRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const sparksRef = useRef<THREE.Group>(null)
  const sparkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SPARK_LOW, emissive: SPARK_LOW, emissiveIntensity: 2 }),
    [],
  )

  useFrame(() => {
    const t = performance.now() * 0.001
    // Boost-Flamme
    const boosting = kart.boostTime > 0
    if (flameRef.current) {
      flameRef.current.visible = boosting
      if (boosting) {
        const pulse = 1.4 + Math.sin(t * 30) * 0.3
        flameRef.current.scale.set(0.7, 0.7, pulse)
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

  return (
    <group ref={ref}>
      <group>
        {/* Modell blickt nach +Z (= Fahrtrichtung), nur skalieren */}
        <primitive object={model} scale={2.4} rotation={[0, 0, 0]} position={[0, 0, 0]} />
        {/* Tier-Figur an der Sitzposition (ersetzt generische Figur) */}
        <group scale={2.4}>
          <group position={[seat.x, seat.y + 0.08, seat.z]} scale={0.9}>
            <PetFigure earType={earType} color={color} />
          </group>
        </group>
      </group>

      {/* Unterboden-Glow in Pet-Farbe */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Boost-Flamme hinten */}
      <mesh ref={flameRef} position={[0, 0.4, -1.7]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.32, 1.6, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent opacity={0.9} />
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
  )
})

KartModel.displayName = 'KartModel'

// Alle Kart-Modelle vorab laden (kein Ruckler beim Rennstart).
PETS.forEach((p) => useGLTF.preload(asset(p.model)))
