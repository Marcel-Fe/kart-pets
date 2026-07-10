import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { ViperKart } from '../game/ViperKart'

// Drehbare 3D-Vorschau des selbstgebauten ViperKart mit der gewählten Lackierung –
// zeigt in der Garage genau das Kart, das man im Rennen fährt (inkl. Design-Farben).
function SpinningKart({ accent, body, chassis }: { accent: string; body: string; chassis: string }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.5
  })
  return (
    <group ref={g}>
      <ViperKart accent={accent} body={body} chassis={chassis} />
    </group>
  )
}

export function KartDesignPreview({
  accent,
  body,
  chassis,
}: {
  accent: string
  body: string
  chassis: string
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 40, position: [3.4, 2.4, 4.8] }}
      onCreated={({ camera }) => camera.lookAt(0, 0.7, 0)}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#bfe3ff', '#202850', 0.6]} />
      <directionalLight position={[5, 9, 5]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Suspense fallback={null}>
        <Environment preset="city" background={false} environmentIntensity={0.9} />
        <SpinningKart accent={accent} body={body} chassis={chassis} />
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={9} blur={2.4} far={4} />
      </Suspense>
    </Canvas>
  )
}
