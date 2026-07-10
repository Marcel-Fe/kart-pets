import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLoader, useFrame } from '@react-three/fiber'
import { PETS } from '../data/pets'
import { asset } from '../utils/asset'
import { spectatorPositions, SPECTATOR_COUNT } from './cheer'
import type { TrackCurve } from './trackCurve'

// Zuschauende Tiere: freigestellte Pet-Sprites, die am Streckenrand jubelnd hüpfen.
export function Spectators({ curve }: { curve: TrackCurve }) {
  const urls = useMemo(() => PETS.filter((p) => p.cutImage).map((p) => asset(p.cutImage!)), [])
  const texs = useLoader(THREE.TextureLoader, urls) as THREE.Texture[]
  texs.forEach((t) => (t.colorSpace = THREE.SRGBColorSpace))

  const spots = useMemo(() => {
    // Positionen kommen aus der geteilten reinen Funktion (auch RaceScene nutzt
    // sie für die Jubel-Leisten-Nähe), hier nur um Sprite-Infos angereichert.
    const positions = spectatorPositions(curve)
    return positions.map((p, n2) => {
      const k = n2 % SPECTATOR_COUNT
      const si = Math.floor(n2 / (SPECTATOR_COUNT * 2))
      const leftSide = Math.floor(n2 / SPECTATOR_COUNT) % 2 === 1
      return {
        x: p.x,
        z: p.z,
        i: n2 % texs.length,
        ph: si * 1.3 + k * 0.8 + (leftSide ? 0.5 : 0),
        h: 2.5 + (k % 2) * 0.25,
      }
    })
  }, [curve, texs.length])

  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < spots.length; i++) {
      const sp = refs.current[i]
      if (sp) sp.position.y = spots[i].h * 0.5 + Math.abs(Math.sin(t * 3.4 + spots[i].ph)) * 0.32
    }
  })

  return (
    <>
      {spots.map((s, i) => {
        const tex = texs[s.i]
        const img = tex.image as { width: number; height: number } | undefined
        const aspect = img ? img.width / img.height : 0.7
        return (
          <sprite
            key={i}
            ref={(el) => { refs.current[i] = el }}
            position={[s.x, s.h * 0.5, s.z]}
            scale={[s.h * aspect, s.h, 1]}
          >
            <spriteMaterial map={tex} transparent alphaTest={0.4} depthWrite={false} />
          </sprite>
        )
      })}
    </>
  )
}

// Vögel: kleine Schwärme, die hoch über der Strecke kreisen und mit den Flügeln schlagen.
export function Birds() {
  const birds = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        r: 38 + (i % 3) * 14,
        y: 24 + (i % 4) * 4,
        sp: 0.12 + (i % 3) * 0.04,
        ph: (i * 1.9) % 6.28,
        fl: (i * 0.7) % 6.28,
      })),
    [],
  )
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < birds.length; i++) {
      const g = refs.current[i]
      if (!g) continue
      const b = birds[i]
      const a = t * b.sp + b.ph
      g.position.set(Math.cos(a) * b.r, b.y, Math.sin(a) * b.r)
      g.rotation.y = -a + Math.PI / 2
      const flap = Math.sin(t * 8 + b.fl) * 0.5
      const lw = g.children[0] as THREE.Object3D
      const rw = g.children[1] as THREE.Object3D
      if (lw) lw.rotation.z = flap
      if (rw) rw.rotation.z = -flap
    }
  })
  return (
    <>
      {birds.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }}>
          <group>
            <mesh position={[-0.4, 0, 0]}>
              <boxGeometry args={[0.8, 0.05, 0.26]} />
              <meshStandardMaterial color="#3a3b42" />
            </mesh>
          </group>
          <group>
            <mesh position={[0.4, 0, 0]}>
              <boxGeometry args={[0.8, 0.05, 0.26]} />
              <meshStandardMaterial color="#3a3b42" />
            </mesh>
          </group>
        </group>
      ))}
    </>
  )
}
