import * as THREE from 'three'
import type { EarType } from '../types'

interface Props {
  earType: EarType
  color: string
  /** Fahrer-Pose: Arme greifen nach vorn ans Lenkrad. */
  driving?: boolean
}

// Erkennbare Cartoon-Tierfigur (ersetzt die generische Kenney-Figur).
// Blickt nach +Z (Fahrtrichtung). Ohren + Schwanz sind auch von hinten sichtbar.
export function PetFigure({ earType, color, driving }: Props) {
  const base = new THREE.Color(color)
  const light = base.clone().lerp(new THREE.Color('#ffffff'), 0.55)
  const dark = base.clone().lerp(new THREE.Color('#000000'), 0.45)

  return (
    <group>
      {/* Torso */}
      <mesh position={[0, -0.55, 0]} castShadow>
        <capsuleGeometry args={[0.36, 0.42, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Weiße Brust */}
      <mesh position={[0, -0.5, 0.26]} scale={[0.7, 1, 0.5]}>
        <sphereGeometry args={[0.26, 14, 14]} />
        <meshStandardMaterial color={light} roughness={0.6} />
      </mesh>
      {/* Kopf (etwas größer) */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <sphereGeometry args={[0.5, 22, 22]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Wangen/Backen hell */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x * 0.7, -0.05, 0.34]} scale={0.5}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color={light} roughness={0.6} />
        </mesh>
      ))}
      {/* Schnauze */}
      <mesh position={[0, -0.1, 0.44]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color={light} roughness={0.6} />
      </mesh>
      {/* Nase */}
      <mesh position={[0, -0.05, 0.66]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Augen mit Weiß + Pupille */}
      {[-0.2, 0.2].map((x) => (
        <group key={x} position={[x, 0.14, 0.4]}>
          <mesh>
            <sphereGeometry args={[0.12, 14, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.07]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#15151c" />
          </mesh>
        </group>
      ))}

      {driving && <Arms color={color} light={light} />}
      <Ears earType={earType} color={color} light={light} dark={dark} />
      <Tail earType={earType} color={color} light={light} dark={dark} />
    </group>
  )
}

// Arme greifen nach vorn ans Lenkrad. Die Kapsel liegt entlang +Y; die Drehung
// um X (~90°) legt sie nach vorn (+Z), die Pfote sitzt am vorderen Ende.
function Arms({ color, light }: { color: string; light: THREE.Color }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.32, -0.4, 0.12]} rotation={[Math.PI / 2 - 0.42, 0, s * 0.18]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.085, 0.4, 6, 10]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Pfote am Steuer */}
          <mesh position={[0, 0.28, 0]} castShadow>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color={light} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Ears({
  earType,
  color,
  light,
  dark,
}: {
  earType: EarType
  color: string
  light: THREE.Color
  dark: THREE.Color
}) {
  if (earType === 'fox' || earType === 'cat') {
    const inner = earType === 'cat' ? new THREE.Color('#ff9ecb') : light
    const h = earType === 'fox' ? 0.5 : 0.38
    return (
      <>
        {[-0.28, 0.28].map((x) => (
          <group key={x} position={[x, 0.5, 0]} rotation={[0, 0, x < 0 ? 0.2 : -0.2]}>
            <mesh castShadow>
              <coneGeometry args={[0.18, h, 12]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.02, 0.05]} scale={0.6}>
              <coneGeometry args={[0.18, h, 12]} />
              <meshStandardMaterial color={inner} roughness={0.6} />
            </mesh>
          </group>
        ))}
      </>
    )
  }

  if (earType === 'panda') {
    return (
      <>
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.46, 0]} castShadow>
            <sphereGeometry args={[0.18, 14, 14]} />
            <meshStandardMaterial color="#1c1c22" roughness={0.6} />
          </mesh>
        ))}
        {/* Augenflecken */}
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.14, 0.36]} scale={[1, 1.3, 0.4]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#1c1c22" />
          </mesh>
        ))}
      </>
    )
  }

  if (earType === 'rabbit') {
    return (
      <>
        {[-0.2, 0.2].map((x) => (
          <group key={x} position={[x, 0.66, 0]} rotation={[-0.15, 0, x < 0 ? 0.12 : -0.12]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.11, 0.62, 6, 10]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.06]} scale={[0.55, 0.85, 0.55]}>
              <capsuleGeometry args={[0.11, 0.62, 6, 10]} />
              <meshStandardMaterial color="#ff9ecb" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </>
    )
  }

  // dragon: Hörner nach hinten + Kamm
  return (
    <>
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, 0.46, -0.1]} rotation={[0.5, 0, x < 0 ? 0.2 : -0.2]} castShadow>
          <coneGeometry args={[0.11, 0.46, 10]} />
          <meshStandardMaterial color={dark} roughness={0.5} />
        </mesh>
      ))}
      {[0.2, -0.05, -0.3].map((z, i) => (
        <mesh key={i} position={[0, 0.46 - i * 0.05, z]} rotation={[0.3, 0, 0]} castShadow>
          <coneGeometry args={[0.09, 0.22, 8]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
    </>
  )
}

// Typischer Schwanz je Tier – von der Renn-Kamera (hinten) gut sichtbar.
function Tail({
  earType,
  color,
  light,
  dark,
}: {
  earType: EarType
  color: string
  light: THREE.Color
  dark: THREE.Color
}) {
  if (earType === 'fox') {
    // große buschige Rute mit heller Spitze
    return (
      <group position={[0, -0.7, -0.4]} rotation={[0.6, 0, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.2, 0.5, 8, 12]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color={light} roughness={0.7} />
        </mesh>
      </group>
    )
  }
  if (earType === 'rabbit') {
    // runder Puschel
    return (
      <mesh position={[0, -0.78, -0.34]} castShadow>
        <sphereGeometry args={[0.18, 14, 14]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
    )
  }
  if (earType === 'cat') {
    // langer dünner Schwanz, aufgestellt
    return (
      <group position={[0, -0.7, -0.36]} rotation={[1.0, 0, 0.2]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.07, 0.7, 6, 10]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color={dark} roughness={0.6} />
        </mesh>
      </group>
    )
  }
  if (earType === 'dragon') {
    // spitzer Drachenschwanz mit Stachel
    return (
      <group position={[0, -0.7, -0.4]} rotation={[0.7, 0, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.16, 0.7, 10]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.12, 0.22, 8]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      </group>
    )
  }
  // panda: kleiner runder Stummelschwanz
  return (
    <mesh position={[0, -0.78, -0.32]} castShadow>
      <sphereGeometry args={[0.13, 12, 12]} />
      <meshStandardMaterial color="#1c1c22" roughness={0.7} />
    </mesh>
  )
}
