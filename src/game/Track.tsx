import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { TrackCurve } from './trackCurve'
import type { TrackTheme } from '../data/tracks'
import { ROAD_WIDTH } from '../data/tracks'
import { makeGroundTexture, makeRoadTexture, makeKerbTexture } from './textures'
import { Scatter, type Deco } from './Scatter'

interface Props {
  curve: TrackCurve
  theme: TrackTheme
}

// Wind: registrierte Objekte wippen sanft um ihre Basis (ein useFrame für alle).
type SwayFn = (o: THREE.Object3D | null, phase: number, amp: number) => void
function useWind(): SwayFn {
  const reg = useRef(new Map<string, { o: THREE.Object3D; ph: number; amp: number }>())
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Böen: langsame Grundschwankung + gelegentliche stärkere Windstöße
    const gust = 0.75 + 0.35 * Math.sin(t * 0.4) + 0.2 * Math.sin(t * 0.13 + 1)
    reg.current.forEach((s) => {
      // zwei Frequenzen überlagert -> natürlicheres Wiegen (Wippen + Flattern)
      const sway = Math.sin(t * 1.5 + s.ph) * 0.82 + Math.sin(t * 3.3 + s.ph * 1.7) * 0.18
      s.o.rotation.z = sway * s.amp * gust
    })
  })
  return (o, ph, amp) => {
    if (o) reg.current.set(o.uuid, { o, ph, amp })
  }
}

function useScatter(curve: TrackCurve): Deco[] {
  return useMemo(() => {
    const out: Deco[] = []
    const n = curve.samples.length
    // Gestaffelte Bänder je Streckenseite → dichte Kulisse. Fernstes Band bewusst
    // ausgedünnt (Nebel verdeckt die Ferne) für flüssige Bildrate auf dem Handy.
    const bands = [11, 17, 25]
    for (let i = 0; i < n; i += 3) {
      const p = curve.samples[i]
      const nor = curve.normals[i]
      for (const side of [1, -1]) {
        for (const base of bands) {
          const dist = base + Math.random() * 8
          // weiter außen seltener, damit es nicht zu schwer wird
          if (base > 18 && i % 4 !== 0) continue
          out.push({
            x: p.x + nor.x * dist * side + (Math.random() - 0.5) * 6,
            z: p.z + nor.z * dist * side + (Math.random() - 0.5) * 6,
            s: 0.7 + Math.random() * 1.3,
            rot: Math.random() * Math.PI * 2,
            variant: Math.floor(Math.random() * 3),
          })
        }
      }
    }
    return out
  }, [curve])
}

const HILL_COLOR: Record<string, string> = {
  forest: '#2c8047',
  candy: '#ff9ed0',
  volcano: '#3a2a26',
  city: '#1a1f3a',
  ice: '#bfe2f5',
}


interface PropDef {
  x: number
  z: number
  rot: number
  type: number
}

// Straßenrand-Deko nach der Design-Bibel (Zaun, Laterne, Fass, Reifenstapel, Pylone, Blumen).
function RoadsideProp({ p, sway }: { p: PropDef; sway: SwayFn }) {
  const ph = p.x * 0.5 + p.z * 0.5
  switch (p.type) {
    case 0: // Holzzaun (läuft entlang der Strecke)
      return (
        <group position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          {[-1.4, 1.4].map((o) => (
            <mesh key={o} position={[o, 0.6, 0]} castShadow>
              <boxGeometry args={[0.18, 1.2, 0.18]} />
              <meshStandardMaterial color="#7a5230" roughness={0.9} />
            </mesh>
          ))}
          {[0.55, 0.95].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <boxGeometry args={[3.0, 0.16, 0.12]} />
              <meshStandardMaterial color="#8a5f38" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )
    case 1: // Laterne mit warmem Licht
      return (
        <group position={[p.x, 0, p.z]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 3.2, 8]} />
            <meshStandardMaterial color="#1c1c22" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, 3.35, 0]}>
            <boxGeometry args={[0.4, 0.5, 0.4]} />
            <meshStandardMaterial color="#ffdb7a" emissive="#ffbe4a" emissiveIntensity={1.8} />
          </mesh>
          <pointLight position={[0, 3.3, 0]} distance={9} intensity={7} color="#ffcf8a" />
        </group>
      )
    case 2: // Holzfass
      return (
        <group position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.42, 1.1, 14]} />
            <meshStandardMaterial color="#8a5a30" roughness={0.85} />
          </mesh>
          {[0.28, 0.82].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.53, 0.53, 0.12, 14]} />
              <meshStandardMaterial color="#4a3420" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
        </group>
      )
    case 3: // Reifenstapel
      return (
        <group position={[p.x, 0, p.z]}>
          {[0.35, 0.85, 1.3].map((y, i) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, i]} castShadow>
              <torusGeometry args={[0.5, 0.22, 10, 18]} />
              <meshStandardMaterial color="#1a1a1e" roughness={0.85} />
            </mesh>
          ))}
        </group>
      )
    case 4: // Leitkegel / Pylone
      return (
        <group position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <coneGeometry args={[0.32, 1.0, 16]} />
            <meshStandardMaterial color="#ff6a1f" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.24, 0.28, 0.2, 16]} />
            <meshStandardMaterial color="#f4f4f4" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.7, 0.12, 0.7]} />
            <meshStandardMaterial color="#ff6a1f" roughness={0.7} />
          </mesh>
        </group>
      )
    default: // Blumenbüschel (wiegt sich im Wind)
      return (
        <group ref={(o) => sway(o, ph, 0.11)} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <sphereGeometry args={[0.4, 10, 8]} />
            <meshStandardMaterial color="#2f8f45" roughness={1} />
          </mesh>
          {[
            [0.28, '#ff5db0'], [-0.24, '#ffd23f'], [0.05, '#ff7a2f'],
          ].map(([ox, c], i) => (
            <mesh key={i} position={[ox as number, 0.42, (i - 1) * 0.2]}>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      )
  }
}

export function Track({ curve, theme }: Props) {
  const road = useMemo(() => curve.buildRoadGeometry(), [curve])
  const borderL = useMemo(() => curve.buildBorderGeometry(1), [curve])
  const borderR = useMemo(() => curve.buildBorderGeometry(-1), [curve])
  // Durchgehende weiße Fahrbahnlinien knapp innerhalb der Randsteine.
  const edge = ROAD_WIDTH / 2 - 0.55
  const lineL = useMemo(() => curve.buildLineGeometry(edge), [curve, edge])
  const lineR = useMemo(() => curve.buildLineGeometry(-edge), [curve, edge])
  const scatter = useScatter(curve)
  const sway = useWind()
  // Straßenrand-Details entlang der Strecke. Wald nutzt die volle Palette
  // (Zaun/Laterne/Fass/Reifen/Pylone/Blumen); andere Welten nur die neutralen
  // Renn-Elemente (Laterne, Reifenstapel, Pylone), damit nichts fehl am Platz wirkt.
  const roadside = useMemo<PropDef[]>(() => {
    const NEUTRAL = [1, 3, 4] // Laterne, Reifenstapel, Pylone – passen überall
    const out: PropDef[] = []
    const n = curve.samples.length
    let k = 0
    for (let i = 6; i < n; i += 15) {
      const p = curve.samples[i]
      const nor = curve.normals[i]
      const tan = curve.tangents[i]
      const side = k % 2 === 0 ? 1 : -1
      const dist = 6.4 + (k % 3) * 0.5
      out.push({
        x: p.x + nor.x * dist * side,
        z: p.z + nor.z * dist * side,
        rot: Math.atan2(tan.x, tan.z),
        type: theme.decor === 'forest' ? k % 6 : NEUTRAL[k % NEUTRAL.length],
      })
      k++
    }
    return out
  }, [curve, theme.decor])
  const groundTex = useMemo(() => makeGroundTexture(theme.groundTex), [theme.groundTex])
  const roadTex = useMemo(() => makeRoadTexture(), [])
  const kerbTex = useMemo(() => makeKerbTexture(), [])

  const dashes = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = []
    const n = curve.samples.length
    for (let i = 0; i < n; i += 10) {
      const p = curve.samples[i]
      const tan = curve.tangents[i]
      out.push({ x: p.x, z: p.z, rot: Math.atan2(tan.x, tan.z) })
    }
    return out
  }, [curve])


  const start = curve.samples[0]
  const startNor = curve.normals[0]
  const startAngle = Math.atan2(curve.tangents[0].x, curve.tangents[0].z)
  const hillColor = HILL_COLOR[theme.decor] ?? '#2c8047'

  return (
    <group>
      {/* Boden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial map={groundTex} color={theme.ground} roughness={1} />
      </mesh>

      {/* Hügel */}
      {[
        [-180, -40], [160, 120], [60, -200], [-120, 180], [210, -120],
      ].map((h, i) => (
        <mesh key={i} position={[h[0], -6, h[1]]} scale={[40, 22, 40]} receiveShadow>
          <sphereGeometry args={[1, 48, 32]} />
          <meshStandardMaterial color={hillColor} roughness={1} />
        </mesh>
      ))}

      {/* Fahrbahn */}
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial map={roadTex} color={theme.road} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Randsteine */}
      <mesh geometry={borderL} receiveShadow>
        <meshStandardMaterial map={kerbTex} roughness={0.6} />
      </mesh>
      <mesh geometry={borderR} receiveShadow>
        <meshStandardMaterial map={kerbTex} roughness={0.6} />
      </mesh>

      {/* Durchgehende weiße Randlinien der Fahrbahn */}
      <mesh geometry={lineL}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
      <mesh geometry={lineR}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} roughness={0.5} />
      </mesh>

      {/* Weiße Mittellinien-Striche */}
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.x, 0.04, d.z]} rotation={[-Math.PI / 2, 0, -d.rot]}>
          <planeGeometry args={[0.4, 2.4]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}

      {/* Karo-Start-/Ziellinie */}
      {Array.from({ length: 8 }).map((_, i) => {
        const off = (i - 3.5) * 1.9
        return [0, 1].map((row) => (
          <mesh
            key={`${i}-${row}`}
            position={[
              start.x + startNor.x * off + Math.sin(startAngle) * (row ? 1.1 : -1.1),
              0.06,
              start.z + startNor.z * off + Math.cos(startAngle) * (row ? 1.1 : -1.1),
            ]}
            rotation={[-Math.PI / 2, 0, -startAngle]}
          >
            <planeGeometry args={[1.9, 1.1]} />
            <meshStandardMaterial color={(i + row) % 2 === 0 ? '#ffffff' : '#15151b'} />
          </mesh>
        ))
      })}

      {/* Start-Tor mit Banner */}
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[start.x + startNor.x * 8.5 * side, 2.8, start.z + startNor.z * 8.5 * side]}
          castShadow
        >
          <cylinderGeometry args={[0.4, 0.4, 5.6, 12]} />
          <meshStandardMaterial color="#2b2f6e" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      <RoundedBox
        args={[18, 1.6, 0.6]}
        radius={0.2}
        position={[start.x, 5.6, start.z]}
        rotation={[0, -startAngle, 0]}
        castShadow
      >
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.5} />
      </RoundedBox>

      {/* Theme-Dekoration: instanziert (ein Zeichenaufruf je Bauteil), Wind im Shader */}
      <Scatter items={scatter} decor={theme.decor} />

      {/* Straßenrand-Details (Zaun, Laterne, Fass, Reifen, Pylone, Blumen) */}
      {roadside.map((p, i) => (
        <RoadsideProp key={'rp' + i} p={p} sway={sway} />
      ))}
    </group>
  )
}
