import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

// Selbstgebautes „Viper"-Kart aus Grundformen – orange Karosserie, blaue
// Seitenkästen, goldene Räder, Heckspoiler. Nase zeigt nach +Z (Fahrtrichtung).
// `accent` (Pet-Farbe) tönt Spoiler & Nasenstreifen für Wiedererkennung.

const ORANGE = '#ff7d1e'
const BLUE = '#2f6bd6'
const GOLD = '#e8b23a'
const TIRE = '#202127'
const SEAT = '#1d1e24'

export const KART_SEAT = new THREE.Vector3(0, 1.02, -0.35) // Sitzposition fürs Pet

// Ein Rad besteht aus drei Gruppen:
//  1. äußere Gruppe (steerRef): lenkt um Y.
//  2. Spin-Gruppe (spinRef): rollt um X (die Achse) – KEINE feste Orientierung,
//     damit `rotation.x` echtes Rollen ergibt (nicht Gieren).
//  3. innere statische Gruppe: richtet die Zylinder-Achse quer (z = 90°) aus.
function Wheel({
  x,
  z,
  r,
  steerRef,
  spinRef,
}: {
  x: number
  z: number
  r: number
  steerRef?: (o: THREE.Group | null) => void
  spinRef?: (o: THREE.Group | null) => void
}) {
  return (
    <group position={[x, r, z]} ref={steerRef}>
      <group ref={spinRef}>
        <group rotation={[0, 0, Math.PI / 2]}>
          {/* Reifen: leicht ballig für ein volleres Profil */}
          <mesh castShadow>
            <cylinderGeometry args={[r, r, 0.32, 24]} />
            <meshStandardMaterial color={TIRE} roughness={0.92} />
          </mesh>
          {/* dunkle Profil-Schulter außen (Reifenflanke) */}
          <mesh>
            <cylinderGeometry args={[r * 1.02, r * 0.9, 0.16, 24]} />
            <meshStandardMaterial color="#111217" roughness={0.95} />
          </mesh>
          {/* goldene Felge außen */}
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[r * 0.6, r * 0.6, 0.08, 20]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.28} />
          </mesh>
          {/* Speichen-Stern (drei Streben, sichtbar beim Rollen) */}
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.19, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
              <boxGeometry args={[r * 1.12, 0.035, 0.07]} />
              <meshStandardMaterial color="#3a2f16" metalness={0.55} roughness={0.35} />
            </mesh>
          ))}
          {/* glänzende Nabe */}
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[r * 0.2, r * 0.2, 0.08, 14]} />
            <meshStandardMaterial color="#f2d477" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export interface KartParts {
  steer: (THREE.Group | null)[] // [vorne links, vorne rechts]
  spin: (THREE.Group | null)[] // alle vier Räder
}

export function ViperKart({
  accent = ORANGE,
  parts,
  body = ORANGE,
  chassis = BLUE,
}: {
  accent?: string
  parts?: KartParts
  body?: string // Lackierung Motorhaube/Nase (Kart-Design)
  chassis?: string // Lackierung Bodenplatte/Seitenkästen (Kart-Design)
}) {
  const setSteer = (i: number) => (o: THREE.Group | null) => { if (parts) parts.steer[i] = o }
  const setSpin = (i: number) => (o: THREE.Group | null) => { if (parts) parts.spin[i] = o }
  // abgedunkelte Nasen-Variante der Body-Farbe (ersetzt das feste ORANGE_DK)
  const bodyDark = useMemo(() => '#' + new THREE.Color(body).multiplyScalar(0.82).getHexString(), [body])
  // Klarlack-Akzent (Spoiler + Nasenstreifen): ein geteiltes Material, daher
  // günstig – der clearcoat-Layer läuft nur einmal, nicht je Mesh.
  const accentMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: accent,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.2,
      }),
    [accent],
  )
  // Geteilte Detail-Materialien (je einmal – günstig): poliertes Chrom, dunkles
  // Glas fürs Cockpit, warm leuchtende Scheinwerfer.
  const chromeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dfe6f2', metalness: 1, roughness: 0.18, envMapIntensity: 1.4 }),
    [],
  )
  // Dunkles Glas OHNE transmission: transmission würde je Kart einen kompletten
  // zusätzlichen Szenen-Renderpass auslösen (Perf-Killer, ~+60 Draw-Calls/Kart).
  // Transparenz + Clearcoat reichen für den glänzenden Scheiben-Look.
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0c1420',
        roughness: 0.08,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        transparent: true,
        opacity: 0.72,
        envMapIntensity: 1.6,
      }),
    [],
  )
  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe08a', emissiveIntensity: 1.6, roughness: 0.2 }),
    [],
  )
  return (
    <group>
      {/* Bodenplatte / Chassis – glänzender Lack, reflektiert die Environment-Map */}
      <RoundedBox args={[1.7, 0.24, 3.0]} radius={0.11} smoothness={3} position={[0, 0.32, -0.1]} castShadow receiveShadow>
        <meshStandardMaterial color={chassis} roughness={0.28} metalness={0.35} envMapIntensity={1.1} />
      </RoundedBox>

      {/* Hauptkarosserie / Motorhaube – Klarlack (clearcoat) für den Wow-Glanz */}
      <RoundedBox args={[1.28, 0.52, 2.12]} radius={0.2} smoothness={5} position={[0, 0.62, 0.15]} castShadow>
        <meshPhysicalMaterial color={body} roughness={0.24} metalness={0.05} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.2} />
      </RoundedBox>
      {/* abgeschrägte Nase vorn – flacher und runder für eine sportliche Silhouette */}
      <RoundedBox args={[1.06, 0.34, 0.86]} radius={0.17} smoothness={5} position={[0, 0.52, 1.42]} castShadow>
        <meshPhysicalMaterial color={bodyDark} roughness={0.26} metalness={0.05} clearcoat={0.95} clearcoatRoughness={0.1} envMapIntensity={1.1} />
      </RoundedBox>
      {/* Nasenstreifen in Pet-Farbe (läuft über die Haube) */}
      <mesh position={[0, 0.76, 1.05]}>
        <boxGeometry args={[0.42, 0.06, 1.1]} />
        <primitive object={accentMat} attach="material" />
      </mesh>

      {/* Scheinwerfer-Paar vorn (leuchtend) */}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.58, 1.83]} rotation={[0, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.14, 4, 10]} />
          <primitive object={headMat} attach="material" />
        </mesh>
      ))}
      {/* Kühlergrill (dunkle Lamellen) + Frontsplitter unten */}
      <mesh position={[0, 0.44, 1.85]}>
        <boxGeometry args={[0.5, 0.16, 0.06]} />
        <meshStandardMaterial color="#0e0f14" metalness={0.4} roughness={0.6} />
      </mesh>
      <RoundedBox args={[1.16, 0.08, 0.36]} radius={0.03} smoothness={2} position={[0, 0.33, 1.74]} castShadow>
        <meshStandardMaterial color="#111217" metalness={0.5} roughness={0.5} />
      </RoundedBox>
      {/* Hutze auf der Motorhaube */}
      <RoundedBox args={[0.44, 0.14, 0.5]} radius={0.05} smoothness={3} position={[0, 0.9, 0.55]} castShadow>
        <meshStandardMaterial color="#15161b" metalness={0.4} roughness={0.55} />
      </RoundedBox>
      {/* Windschutz-Cowl vor dem Cockpit (dunkles Glas) */}
      <RoundedBox args={[0.9, 0.36, 0.08]} radius={0.05} smoothness={3} position={[0, 1.0, 0.2]} rotation={[-0.5, 0, 0]}>
        <primitive object={glassMat} attach="material" />
      </RoundedBox>
      {/* Doppel-Auspuff hinten (Chrom) */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.46, -1.66]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.5, 14]} />
          <primitive object={chromeMat} attach="material" />
        </mesh>
      ))}

      {/* Seitenkästen (blau) */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.36, 0.42, 1.9]} radius={0.12} smoothness={3} position={[s * 0.93, 0.5, 0.05]} castShadow>
          <meshStandardMaterial color={chassis} roughness={0.3} metalness={0.3} envMapIntensity={1.1} />
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

      {/* Räder: vorne etwas kleiner und lenkbar */}
      <Wheel x={-0.95} z={1.05} r={0.42} steerRef={setSteer(0)} spinRef={setSpin(0)} />
      <Wheel x={0.95} z={1.05} r={0.42} steerRef={setSteer(1)} spinRef={setSpin(1)} />
      <Wheel x={-1.0} z={-1.05} r={0.5} spinRef={setSpin(2)} />
      <Wheel x={1.0} z={-1.05} r={0.5} spinRef={setSpin(3)} />
    </group>
  )
}
