import { useMemo } from 'react'
import { RoundedBox, Float } from '@react-three/drei'
import { TrackCurve } from './trackCurve'
import type { TrackTheme } from '../data/tracks'
import { makeGroundTexture, makeRoadTexture, makeKerbTexture } from './textures'

interface Props {
  curve: TrackCurve
  theme: TrackTheme
}

interface Deco {
  x: number
  z: number
  s: number
  rot: number
  variant: number
}

function useScatter(curve: TrackCurve): Deco[] {
  return useMemo(() => {
    const out: Deco[] = []
    const n = curve.samples.length
    for (let i = 0; i < n; i += 6) {
      const p = curve.samples[i]
      const nor = curve.normals[i]
      for (const side of [1, -1]) {
        const dist = 11 + Math.random() * 34
        out.push({
          x: p.x + nor.x * dist * side,
          z: p.z + nor.z * dist * side,
          s: 0.7 + Math.random() * 1.1,
          rot: Math.random() * Math.PI * 2,
          variant: Math.floor(Math.random() * 3),
        })
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

const CANDY_COLORS = ['#ff5db0', '#8f6bff', '#3fc1ff', '#ffd23f', '#5be08a']

function DecoItem({ d, decor }: { d: Deco; decor: string }) {
  if (decor === 'forest') {
    if (d.variant === 0)
      return (
        <group position={[d.x, 0, d.z]} scale={d.s}>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.42, 2.4, 8]} />
            <meshStandardMaterial color="#6b4a2b" />
          </mesh>
          <mesh position={[0, 3, 0]} castShadow>
            <coneGeometry args={[1.6, 3, 10]} />
            <meshStandardMaterial color="#1f7a3d" />
          </mesh>
          <mesh position={[0, 4.2, 0]} castShadow>
            <coneGeometry args={[1.1, 2, 10]} />
            <meshStandardMaterial color="#27914a" />
          </mesh>
        </group>
      )
    if (d.variant === 1)
      return (
        <mesh position={[d.x, 0.7 * d.s, d.z]} scale={d.s} castShadow>
          <sphereGeometry args={[0.9, 12, 10]} />
          <meshStandardMaterial color="#2f9e54" roughness={1} />
        </mesh>
      )
    return (
      <group position={[d.x, 0, d.z]} scale={d.s}>
        <mesh position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.25, 10, 8]} />
          <meshStandardMaterial color="#ff5d8f" emissive="#ff5d8f" emissiveIntensity={0.2} />
        </mesh>
      </group>
    )
  }

  if (decor === 'candy') {
    const col = CANDY_COLORS[(d.variant + Math.round(d.x)) % CANDY_COLORS.length]
    if (d.variant === 0)
      // Lutscher
      return (
        <group position={[d.x, 0, d.z]} scale={d.s}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.6, 0]} castShadow>
            <sphereGeometry args={[0.7, 16, 16]} />
            <meshStandardMaterial color={col} roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      )
    if (d.variant === 1)
      // Gumdrop
      return (
        <mesh position={[d.x, 0.6 * d.s, d.z]} scale={d.s} castShadow>
          <coneGeometry args={[0.9, 1.6, 16]} />
          <meshStandardMaterial color={col} roughness={0.25} />
        </mesh>
      )
    // Bonbon-Kugel
    return (
      <mesh position={[d.x, 0.8 * d.s, d.z]} scale={d.s} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color={col} roughness={0.2} metalness={0.2} />
      </mesh>
    )
  }

  if (decor === 'volcano') {
    if (d.variant === 0)
      // Felsen
      return (
        <mesh position={[d.x, 0.6 * d.s, d.z]} scale={d.s} rotation={[d.rot, d.rot, 0]} castShadow>
          <dodecahedronGeometry args={[1]} />
          <meshStandardMaterial color="#4a423e" roughness={1} flatShading />
        </mesh>
      )
    if (d.variant === 1)
      // Lava-Pfütze
      return (
        <mesh position={[d.x, 0.07, d.z]} scale={d.s} rotation={[-Math.PI / 2, 0, d.rot]}>
          <circleGeometry args={[1.4, 16]} />
          <meshStandardMaterial color="#ff5a1f" emissive="#ff6a1f" emissiveIntensity={1.6} />
        </mesh>
      )
    // Toter Baum
    return (
      <group position={[d.x, 0, d.z]} scale={d.s}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.3, 2.8, 6]} />
          <meshStandardMaterial color="#2a1c16" />
        </mesh>
      </group>
    )
  }

  if (decor === 'ice') {
    if (d.variant === 0)
      // Eiskristall / Spitze
      return (
        <mesh position={[d.x, 1.1 * d.s, d.z]} scale={d.s} rotation={[0, d.rot, 0]} castShadow>
          <coneGeometry args={[0.6, 2.6, 6]} />
          <meshStandardMaterial color="#bfeaff" roughness={0.15} metalness={0.3} transparent opacity={0.92} />
        </mesh>
      )
    if (d.variant === 1)
      // Schneehügel
      return (
        <mesh position={[d.x, 0.3 * d.s, d.z]} scale={[d.s * 1.4, d.s * 0.8, d.s * 1.4]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
      )
    // verschneite Tanne
    return (
      <group position={[d.x, 0, d.z]} scale={d.s}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.36, 2.2, 8]} />
          <meshStandardMaterial color="#7a5638" />
        </mesh>
        <mesh position={[0, 2.8, 0]} castShadow>
          <coneGeometry args={[1.4, 2.8, 10]} />
          <meshStandardMaterial color="#e8f4ff" roughness={0.8} />
        </mesh>
        <mesh position={[0, 3.9, 0]} castShadow>
          <coneGeometry args={[1, 1.8, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
      </group>
    )
  }

  // city
  if (d.variant === 2)
    // Neon-Schild
    return (
      <mesh position={[d.x, 1.5 * d.s, d.z]} scale={d.s} castShadow>
        <boxGeometry args={[0.4, 1.6, 0.4]} />
        <meshStandardMaterial color="#ff2fa0" emissive="#ff2fa0" emissiveIntensity={1.4} />
      </mesh>
    )
  // Hochhaus mit Neon-Kanten
  const h = 6 + d.variant * 6 + d.s * 6
  const neon = d.variant === 0 ? '#00e5ff' : '#b56bff'
  return (
    <group position={[d.x, 0, d.z]} scale={[d.s, 1, d.s]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[5, h, 5]} />
        <meshStandardMaterial color="#0e1330" />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[5.1, h * 0.96, 5.1]} />
        <meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={1.1} wireframe />
      </mesh>
    </group>
  )
}

export function Track({ curve, theme }: Props) {
  const road = useMemo(() => curve.buildRoadGeometry(), [curve])
  const borderL = useMemo(() => curve.buildBorderGeometry(1), [curve])
  const borderR = useMemo(() => curve.buildBorderGeometry(-1), [curve])
  const scatter = useScatter(curve)
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

  const items = useMemo(() => {
    return [0.18, 0.42, 0.66, 0.88].map((t) => {
      const p = curve.pointAt(t)
      return { x: p.x, z: p.z }
    })
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
          <sphereGeometry args={[1, 24, 16]} />
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

      {/* Mittellinien-Striche */}
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.x, 0.04, d.z]} rotation={[-Math.PI / 2, 0, -d.rot]}>
          <planeGeometry args={[0.5, 2.2]} />
          <meshStandardMaterial color="#fde9a0" emissive="#fde9a0" emissiveIntensity={0.4} />
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

      {/* Schwebende Item-Boxen */}
      {items.map((it, i) => (
        <Float key={i} speed={3} floatIntensity={1.2} rotationIntensity={1.5}>
          <mesh position={[it.x, 2.2, it.z]} castShadow>
            <boxGeometry args={[1.6, 1.6, 1.6]} />
            <meshStandardMaterial
              color={theme.accent}
              emissive={theme.accent}
              emissiveIntensity={0.6}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
        </Float>
      ))}

      {/* Theme-Dekoration */}
      {scatter.map((d, i) => (
        <DecoItem key={i} d={d} decor={theme.decor} />
      ))}
    </group>
  )
}
