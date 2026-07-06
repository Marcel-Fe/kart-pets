import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import { PETS } from '../data/pets'
import { PetFigure } from './PetFigure'
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

// Ganzes gerendertes Kart als 2D-Sprite (2.5D-Look wie klassische Mobile-Racer) –
// sieht aus wie auf den Bildern, statt Low-Poly-Modell + Primitiven-Figur.
function RaceCharSprite({ url, height = 3.0, y = height * 0.46 }: { url: string; height?: number; y?: number }) {
  const tex = useLoader(THREE.TextureLoader, asset(url))
  tex.colorSpace = THREE.SRGBColorSpace
  const aspect = tex.image ? tex.image.width / tex.image.height : 0.83
  return (
    <sprite position={[0, y, 0]} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={tex} transparent alphaTest={0.35} depthWrite={false} />
    </sprite>
  )
}

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
export const KartModel = forwardRef<THREE.Group, Props>(({ path, color, earType, cutImage, raceImage, model3d, model3dRot, kart }, ref) => {
  // Priorität fürs Rennen: Rück-Sprite (bester Look, von hinten) > 3D-GLB > Frontal-Sprite.
  const spriteUrl = raceImage ?? (model3d ? undefined : cutImage)
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
        {spriteUrl ? (
          <>
            {/* Echtes 3D-Kart von hinten … */}
            <primitive object={model} scale={2.4} rotation={[0, 0, 0]} position={[0, 0, 0]} />
            {/* … mit dem Pet als Rück-Sprite auf dem Sitz (sitzt im Kart, von hinten sichtbar) */}
            <group position={[0, seat.y * 2.4, seat.z * 2.4]}>
              <RaceCharSprite url={spriteUrl} height={2.5} y={1.05} />
            </group>
          </>
        ) : model3d ? (
          <>
            {/* Echtes 3D-Pet auf dem Kenney-Kart – von hinten sichtbar */}
            <primitive object={model} scale={2.4} rotation={[0, 0, 0]} position={[0, 0, 0]} />
            <group scale={2.4}>
              <group position={[seat.x, seat.y + 0.08, seat.z]}>
                <RacePet url={model3d} rot={model3dRot} />
              </group>
            </group>
          </>
        ) : (
          <>
            {/* Fallback: Low-Poly-Modell blickt nach +Z (= Fahrtrichtung) */}
            <primitive object={model} scale={2.4} rotation={[0, 0, 0]} position={[0, 0, 0]} />
            <group scale={2.4}>
              <group position={[seat.x, seat.y + 0.08, seat.z]} scale={0.9}>
                <PetFigure earType={earType} color={color} />
              </group>
            </group>
          </>
        )}
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

// Alle Kart-Modelle (und vorhandene Pet-3D-Modelle) vorab laden (kein Ruckler beim Rennstart).
PETS.forEach((p) => {
  useGLTF.preload(asset(p.model))
  // Pet-GLB nur vorladen, wenn es im Rennen auch genutzt wird (kein Rück-Sprite vorhanden).
  if (p.model3d && !p.raceImage) useGLTF.preload(asset(p.model3d))
})
