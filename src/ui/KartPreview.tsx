import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { PetFigure } from '../game/PetFigure'
import { PETS } from '../data/pets'
import { asset } from '../utils/asset'
import type { Pet } from '../types'

export interface UpgradeLevels {
  motor: number
  reifen: number
  booster: number
  panzer: number
}

// Kart-Modelle vorab laden (kein Flackern beim Pet-Wechsel).
PETS.forEach((p) => useGLTF.preload(asset(p.model)))

function cutoutPath(pet: Pet): string | null {
  if (!pet.image) return null
  return pet.image.replace('/pets/', '/pets-cut/')
}

// Echter Charakter (freigestelltes Roster-Bild) als zur Kamera gerichtetes Sprite auf dem Kart.
function PetSprite({ url }: { url: string }) {
  const tex = useLoader(THREE.TextureLoader, asset(url))
  tex.colorSpace = THREE.SRGBColorSpace
  const aspect = tex.image ? tex.image.width / tex.image.height : 1
  const h = 2.2
  return (
    <sprite position={[0, 1.5, 0.1]} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={tex} transparent alphaTest={0.4} depthWrite={false} />
    </sprite>
  )
}

function KartModelStatic({ pet, upg, showFigure }: { pet: Pet; upg: UpgradeLevels; showFigure: boolean }) {
  const { scene } = useGLTF(asset(pet.model))
  const { model, seat } = useMemo(() => {
    const clone = scene.clone(true)
    const char = clone.getObjectByName('character')
    const seatPos = new THREE.Vector3(0, 0.55, -0.05)
    if (char) {
      char.getWorldPosition(seatPos)
      char.visible = false
    }
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return { model: clone, seat: seatPos }
  }, [scene])

  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.6
  })

  return (
    <group ref={group}>
      <group>
        <primitive object={model} scale={2.4} />
        {showFigure && (
          <group scale={2.4}>
            <group position={[seat.x, seat.y + 0.08, seat.z]} scale={0.9}>
              <PetFigure earType={pet.earType} color={pet.color} />
            </group>
          </group>
        )}
      </group>

      {/* Unterboden-Glow in Pet-Farbe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[1.7, 28]} />
        <meshBasicMaterial color={pet.color} transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Motor: glühende Auspuffrohre */}
      {upg.motor > 0 &&
        [-0.5, 0.5].map((x, i) => (
          <mesh key={i} position={[x, 0.45, -1.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12 + upg.motor * 0.02, 0.16 + upg.motor * 0.03, 0.5, 12]} />
            <meshStandardMaterial color="#ff7a2f" emissive="#ff5a1f" emissiveIntensity={0.6 + upg.motor * 0.5} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

      {/* Booster: blaue Schub-Düse */}
      {upg.booster > 0 && (
        <mesh position={[0, 0.5, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.25 + upg.booster * 0.04, 0.8 + upg.booster * 0.18, 14]} />
          <meshStandardMaterial color="#3fc1ff" emissive="#3fc1ff" emissiveIntensity={0.8 + upg.booster * 0.6} transparent opacity={0.85} />
        </mesh>
      )}

      {/* Reifen: leuchtende Ringe */}
      {upg.reifen > 0 &&
        ([[-1.05, -1.0], [1.05, -1.0], [-1.05, 1.0], [1.05, 1.0]] as [number, number][]).map(([x, z], i) => (
          <mesh key={i} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.45, 0.06, 10, 20]} />
            <meshStandardMaterial color="#b56bff" emissive="#b56bff" emissiveIntensity={0.4 + upg.reifen * 0.4} />
          </mesh>
        ))}

      {/* Panzer: Schutz-Aura */}
      {upg.panzer > 0 && (
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[2.2, 24, 18]} />
          <meshBasicMaterial color="#36e07a" transparent opacity={0.05 + upg.panzer * 0.035} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

export function KartPreview({ pet, upgrades }: { pet: Pet; upgrades: UpgradeLevels }) {
  const cut = cutoutPath(pet)
  return (
    <div className="kart-preview">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 42, position: [0, 2.1, 5.4] }}
        onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}
      >
        <ambientLight intensity={0.65} />
        <hemisphereLight args={['#bfe3ff', '#202850', 0.6]} />
        <directionalLight position={[5, 9, 5]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <Suspense fallback={null}>
          <KartModelStatic pet={pet} upg={upgrades} showFigure={!cut} />
          {cut && <PetSprite url={cut} />}
          <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={9} blur={2.4} far={4} />
        </Suspense>
      </Canvas>
    </div>
  )
}
