import { useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment, ContactShadows } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { asset } from '../utils/asset'

// Lädt ein generiertes 3D-Pet-Modell, normalisiert Größe/Position und dreht es.
function SpinningModel({ url, spin }: { url: string; spin: boolean }) {
  const { scene } = useGLTF(asset(url))
  const ref = useRef<THREE.Group>(null)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const scale = 2.2 / Math.max(size.x, size.y, size.z)
    clone.scale.setScalar(scale)
    // um den Ursprung zentrieren – die Kamera blickt auf (0,0,0), so ist die
    // Figur komplett im Bild (statt oben angeschnitten).
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  useFrame((_, dt) => {
    if (ref.current && spin) ref.current.rotation.y += dt * 0.6
  })

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  )
}

export function PetModel3D({ url, spin = true }: { url: string; spin?: boolean }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.35, 4.0], fov: 42 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 5]} intensity={1.6} castShadow />
      <directionalLight position={[-5, 3, -4]} intensity={0.6} color="#88aaff" />
      <Suspense fallback={null}>
        <SpinningModel url={url} spin={spin} />
        <Environment preset="city" environmentIntensity={0.8} />
      </Suspense>
      <ContactShadows position={[0, -1.15, 0]} opacity={0.5} scale={6} blur={2.4} far={4} />
    </Canvas>
  )
}
