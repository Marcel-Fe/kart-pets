import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

// Selbstgebautes „Viper"-Kart aus Grundformen – orange Karosserie, blaue
// Seitenkästen, goldene Räder, Heckspoiler. Nase zeigt nach +Z (Fahrtrichtung).
// `accent` (Pet-Farbe) tönt Spoiler & Nasenstreifen für Wiedererkennung.

const ORANGE = '#ff7d1e'
const ORANGE_DK = '#e85f12'
const BLUE = '#2f6bd6'
const GOLD = '#e8b23a'
const TIRE = '#202127'
const SEAT = '#1d1e24'

export const KART_SEAT = new THREE.Vector3(0, 1.02, -0.35) // Sitzposition fürs Pet

function Wheel({ x, z, r }: { x: number; z: number; r: number }) {
  return (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      {/* Reifen */}
      <mesh castShadow>
        <cylinderGeometry args={[r, r, 0.34, 20]} />
        <meshStandardMaterial color={TIRE} roughness={0.85} />
      </mesh>
      {/* goldene Felge außen */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[r * 0.62, r * 0.62, 0.06, 18]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[r * 0.2, r * 0.2, 0.06, 12]} />
        <meshStandardMaterial color="#3a2f16" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

export function ViperKart({ accent = ORANGE }: { accent?: string }) {
  const accentMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.1 }),
    [accent],
  )
  return (
    <group>
      {/* Bodenplatte / Chassis (blau) */}
      <RoundedBox args={[1.7, 0.24, 3.0]} radius={0.11} smoothness={3} position={[0, 0.32, -0.1]} castShadow receiveShadow>
        <meshStandardMaterial color={BLUE} roughness={0.5} metalness={0.15} />
      </RoundedBox>

      {/* Hauptkarosserie / Motorhaube (orange) */}
      <RoundedBox args={[1.26, 0.5, 2.1]} radius={0.16} smoothness={4} position={[0, 0.62, 0.15]} castShadow>
        <meshStandardMaterial color={ORANGE} roughness={0.35} metalness={0.12} />
      </RoundedBox>
      {/* abgeschrägte Nase vorn */}
      <RoundedBox args={[1.02, 0.36, 0.8]} radius={0.14} smoothness={4} position={[0, 0.54, 1.4]} castShadow>
        <meshStandardMaterial color={ORANGE_DK} roughness={0.4} />
      </RoundedBox>
      {/* Nasenstreifen in Pet-Farbe */}
      <mesh position={[0, 0.75, 1.15]}>
        <boxGeometry args={[0.5, 0.06, 0.9]} />
        <primitive object={accentMat} attach="material" />
      </mesh>

      {/* Seitenkästen (blau) */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.36, 0.42, 1.9]} radius={0.12} smoothness={3} position={[s * 0.93, 0.5, 0.05]} castShadow>
          <meshStandardMaterial color={BLUE} roughness={0.45} />
        </RoundedBox>
      ))}

      {/* Cockpit-Wanne (dunkel) + Sitzlehne */}
      <mesh position={[0, 0.78, -0.35]}>
        <boxGeometry args={[0.92, 0.3, 1.0]} />
        <meshStandardMaterial color="#15161b" roughness={0.7} />
      </mesh>
      <RoundedBox args={[0.9, 0.72, 0.24]} radius={0.1} smoothness={3} position={[0, 1.06, -0.85]} castShadow>
        <meshStandardMaterial color={SEAT} roughness={0.8} />
      </RoundedBox>
      {/* Lenkrad */}
      <mesh position={[0, 0.95, 0.35]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.2, 0.05, 8, 16]} />
        <meshStandardMaterial color="#111216" roughness={0.6} />
      </mesh>

      {/* Heckspoiler (Pet-Farbe) auf zwei Streben */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 1.05, -1.45]}>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#15161b" />
        </mesh>
      ))}
      <RoundedBox args={[1.7, 0.12, 0.5]} radius={0.06} smoothness={3} position={[0, 1.32, -1.5]} castShadow>
        <primitive object={accentMat} attach="material" />
      </RoundedBox>

      {/* Räder: vorne etwas kleiner */}
      <Wheel x={-0.95} z={1.05} r={0.42} />
      <Wheel x={0.95} z={1.05} r={0.42} />
      <Wheel x={-1.0} z={-1.05} r={0.5} />
      <Wheel x={1.0} z={-1.05} r={0.5} />
    </group>
  )
}
