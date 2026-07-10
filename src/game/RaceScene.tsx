import { useEffect, useMemo, useRef, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Sky, Environment, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { TrackCurve } from './trackCurve'
import { Track } from './Track'
import { Spectators, Birds } from './Ambience'
import { KartModel } from './KartModel'
import { controls } from './controls'
import { useHudStore } from '../store/hudStore'
import { sfx } from '../audio/sfx'
import { AI_STYLES } from '../data/pets'
import type { Pet, RaceResult, RaceResultEntry } from '../types'
import type { TrackDef } from '../data/tracks'
import { updateHazards, spinAngle, dropBanana, bananaVisible, type Banana, type ItemBox, type Item } from './hazards'
import {
  updatePlayer,
  updateAI,
  updateProgress,
  resolveCollisions,
  rankKarts,
  speedKmh,
  NEUTRAL_UPGRADES,
  type KartState,
  type UpgradeFactors,
} from './raceSim'

interface Props {
  track: TrackDef
  playerPet: Pet
  playerLevel: number
  playerUpgrades: UpgradeFactors
  opponents: Pet[]
  onFinish: (r: RaceResult) => void
}

const LANES = [-4.5, -1.5, 1.5, 4.5]
const INTRO_DURATION = 3.2 // Sekunden 360°-Kamerafahrt vor dem Countdown

// Während des Schleuderns wird jede Eingabe ignoriert.
const NO_INPUT = { throttle: false, steerLeft: false, steerRight: false, drift: false, boost: false }

function makeKart(
  pet: Pet,
  isPlayer: boolean,
  curve: TrackCurve,
  lane: number,
  startT: number,
  aiIndex: number,
  level: number,
  upgrades: UpgradeFactors,
): KartState {
  const p = curve.pointAt(startT)
  const i = Math.floor((((startT % 1) + 1) % 1) * curve.normals.length) % curve.normals.length
  const nor = curve.normals[i]
  return {
    id: pet.id + (isPlayer ? '-p' : '-ai' + aiIndex),
    name: pet.name,
    emoji: pet.emoji,
    color: pet.color,
    isPlayer,
    pet,
    level,
    upgrades,
    aiStyle: isPlayer ? undefined : AI_STYLES[aiIndex % AI_STYLES.length],
    x: p.x + nor.x * lane,
    z: p.z + nor.z * lane,
    heading: curve.headingAt(startT),
    speed: 0,
    visualTilt: 0,
    t: startT,
    prevT: startT,
    lap: 0,
    finished: false,
    finishOrder: 0,
    rank: isPlayer ? LANES.length : 1,
    drifting: false,
    driftCharge: 0,
    boostTime: 0,
    aiTargetLateral: 0,
    aiWanderTimer: 0,
  }
}

// Banane: gebogener Torus-Bogen, flach liegend, mit dunklem Stiel.
function Banana() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0.6]}>
      <mesh castShadow>
        <torusGeometry args={[0.42, 0.14, 8, 14, 2.4]} />
        <meshStandardMaterial color="#ffd93b" roughness={0.45} emissive="#8a6a00" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.42, 0, 0]} castShadow>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial color="#7d5f18" roughness={0.75} />
      </mesh>
    </group>
  )
}

export function RaceScene({ track, playerPet, playerLevel, playerUpgrades, opponents, onFinish }: Props) {
  const { camera } = useThree()
  const curve = useMemo(() => new TrackCurve(track), [track])

  const karts = useMemo<KartState[]>(() => {
    const list: KartState[] = []
    list.push(makeKart(playerPet, true, curve, LANES[0], 0.004, 0, playerLevel, playerUpgrades))
    opponents.slice(0, 3).forEach((pet, idx) => {
      list.push(makeKart(pet, false, curve, LANES[idx + 1], 0.004 * (idx + 2), idx, 1, NEUTRAL_UPGRADES))
    })
    return list
  }, [curve, playerPet, playerLevel, playerUpgrades, opponents])

  // Sammelbare Münzen entlang der Mittellinie
  const coins = useMemo(() => {
    const arr: { x: number; z: number }[] = []
    const n = curve.samples.length
    for (let i = 8; i < n; i += 11) {
      const p = curve.samples[i]
      arr.push({ x: p.x, z: p.z })
    }
    return arr
  }, [curve])
  const coinRefs = useRef<(THREE.Mesh | null)[]>([])
  const coinState = useMemo(() => coins.map(() => ({ got: false })), [coins])
  const coinsGot = useRef(0)

  // Bananen: feste auf der Fahrbahn (versetzt links/Mitte/rechts, also ausweichbar)
  // plus freie Plätze für abgelegte Bananen.
  const DROP_SLOTS = 8
  const bananas = useMemo<Banana[]>(() => {
    const arr: Banana[] = []
    const n = curve.samples.length
    let k = 0
    for (let i = 30; i < n; i += 37) {
      const p = curve.samples[i]
      const nor = curve.normals[i]
      const lat = ((k % 3) - 1) * 3.6
      arr.push({ x: p.x + nor.x * lat, z: p.z + nor.z * lat, timer: 0, fixed: true, alive: true })
      k++
    }
    for (let i = 0; i < DROP_SLOTS; i++) arr.push({ x: 0, z: 0, timer: 0, fixed: false, alive: false })
    return arr
  }, [curve])
  const bananaRefs = useRef<(THREE.Group | null)[]>([])

  // Item-Boxen auf der Mittellinie – durchfahren gibt eine Banane.
  const boxes = useMemo<ItemBox[]>(
    () =>
      [0.1, 0.22, 0.35, 0.47, 0.6, 0.72, 0.84, 0.95].map((t) => {
        const p = curve.pointAt(t)
        return { x: p.x, z: p.z, timer: 0 }
      }),
    [curve],
  )
  const boxRefs = useRef<(THREE.Mesh | null)[]>([])

  // Restliche Schleuder-Zeit je Kart (Index wie `karts`) – bewusst NICHT im KartState.
  const spin = useRef<number[]>([])
  // Gehaltenes Item je Kart, ebenfalls außerhalb der Fahrphysik.
  const held = useMemo<Item[]>(() => karts.map(() => null), [karts])
  const prevUse = useRef(false) // Flanke des Item-Knopfs
  const aiDropTimer = useMemo(() => karts.map(() => 1 + Math.random() * 3), [karts])
  // Position im vorigen Bild, für die überstrichene Trefferprüfung.
  const prevPos = useRef<{ x: number; z: number }[]>([])

  const meshRefs = useRef<(THREE.Group | null)[]>([])
  const intro = useRef(INTRO_DURATION)
  const countdown = useRef(3.0)
  const finishOrderCounter = useRef(0)
  const reported = useRef(false)
  const hudTimer = useRef(0)
  const camInit = useRef(false)
  const camFov = useRef(62) // geglättetes FOV für den Boost-Kick
  const prevDrift = useRef(false) // Flanken-Erkennung: Drift losgelassen -> Auto-Boost
  const setHud = useHudStore((s) => s.set)

  // --- Sound-Zustand (Flanken-Erkennung) ---
  const sndBeep = useRef(4) // zuletzt gepiepste Countdown-Zahl (4 = noch nichts)
  const sndDrift = useRef(false)
  const sndBoost = useRef(false)
  const engineOn = useRef(false)

  useEffect(() => {
    sfx.resume() // Rennstart kam per Tap (Nutzer-Geste) -> Audio darf starten
    return () => {
      sfx.stopEngine()
      sfx.driftStop()
    }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const player = karts[0]

    // Erst 360°-Intro, danach Countdown (läuft ins Negative -> "GO!" verschwindet von selbst)
    const introing = intro.current > 0
    if (introing) intro.current -= dt
    else countdown.current -= dt
    const racing = !introing && countdown.current <= 0

    // Motor läuft ab Ende des Intros (Leerlauf im Countdown, dreht dann hoch)
    if (!introing && !engineOn.current) {
      sfx.startEngine()
      engineOn.current = true
    }
    // Countdown-Piepser 3-2-1 + „GO!"
    if (!introing) {
      const cInt = Math.ceil(countdown.current)
      if (countdown.current > 0 && cInt < sndBeep.current && cInt >= 1 && cInt <= 3) {
        sfx.beep(false)
        sndBeep.current = cInt
      } else if (countdown.current <= 0 && sndBeep.current > 0) {
        sfx.beep(true)
        sndBeep.current = 0
      }
    }

    if (racing) {
      // Spieler
      const onTrack = curve.project(player.x, player.z)
      // Handy-freundlich: Auto-Gas (Bremse hebt es auf) und Boost feuert von selbst,
      // sobald DRIFT losgelassen wird und die Leiste geladen ist (Flanke, ein Frame).
      const autoBoost = !controls.drift && prevDrift.current && player.driftCharge > 0.25
      prevDrift.current = controls.drift
      // Beim Schleudern ist die Steuerung weg – das Kart rutscht nur noch aus.
      const playerSpinning = (spin.current[0] ?? 0) > 0
      updatePlayer(
        player,
        playerSpinning
          ? NO_INPUT
          : {
              throttle: (controls.throttle || controls.autoThrottle) && !controls.brake,
              steerLeft: controls.steerLeft,
              steerRight: controls.steerRight,
              drift: controls.drift,
              boost: controls.boost || autoBoost,
            },
        onTrack.lateral,
        dt,
      )

      // KI
      for (let i = 1; i < karts.length; i++) {
        const proj = curve.project(karts[i].x, karts[i].z)
        updateAI(karts[i], curve, proj.lateral, dt)
      }

      if (import.meta.env.DEV) {
        // Nur fuer automatisierte Tests: aktuelle Seitenablage des Spielers.
        ;(window as unknown as { __playerLateral?: number }).__playerLateral = onTrack.lateral
      }

      // Spieler legt eine Banane ab (Flanke: einmal je Knopfdruck)
      if (controls.useItem && !prevUse.current && held[0] === 'banana' && dropBanana(player, bananas)) {
        held[0] = null
        sfx.click()
      }
      prevUse.current = controls.useItem

      // Gegner nutzen ihre Bananen ebenfalls – kurz nachdem sie eine haben.
      for (let i = 1; i < karts.length; i++) {
        if (!held[i]) continue
        aiDropTimer[i] -= dt
        if (aiDropTimer[i] <= 0) {
          if (dropBanana(karts[i], bananas)) held[i] = null
          aiDropTimer[i] = 1 + Math.random() * 3
        }
      }

      // Bananen + Item-Boxen (getestete Logik in hazards.ts)
      updateHazards(karts, bananas, boxes, spin.current, held, prevPos.current, dt, {
        onHit: (k) => {
          if (karts[k].isPlayer) sfx.spinOut()
          if (import.meta.env.DEV) {
            const w = window as unknown as { __bananaHits?: number; __playerSpins?: number }
            w.__bananaHits = (w.__bananaHits ?? 0) + 1
            if (karts[k].isPlayer) w.__playerSpins = (w.__playerSpins ?? 0) + 1
          }
        },
        onPickup: (k) => {
          if (karts[k].isPlayer) sfx.coin()
          if (import.meta.env.DEV) {
            const w = window as unknown as { __pickups?: number; __playerPickups?: number }
            w.__pickups = (w.__pickups ?? 0) + 1
            if (karts[k].isPlayer) w.__playerPickups = (w.__playerPickups ?? 0) + 1
          }
        },
      })

      // Sichtbarkeit von Bananen und Boxen nachziehen
      for (let i = 0; i < bananas.length; i++) {
        const g = bananaRefs.current[i]
        if (g) g.visible = bananaVisible(bananas[i])
        if (g && g.visible) {
          g.position.x = bananas[i].x
          g.position.z = bananas[i].z
        }
      }
      for (let i = 0; i < boxes.length; i++) {
        const m = boxRefs.current[i]
        if (!m) continue
        m.visible = boxes[i].timer <= 0
        if (m.visible) {
          m.rotation.y += dt * 1.6
          m.position.y = 2.0 + Math.sin(performance.now() * 0.003 + i) * 0.25
        }
      }

      resolveCollisions(karts)

      // Fortschritt / Runden
      for (const k of karts) {
        const proj = curve.project(k.x, k.z)
        updateProgress(k, proj.t, track.laps, () => ++finishOrderCounter.current)
      }
      rankKarts(karts)

      // Münzen einsammeln (nur Spieler)
      for (let i = 0; i < coins.length; i++) {
        const cs = coinState[i]
        if (cs.got) continue
        const dx = player.x - coins[i].x
        const dz = player.z - coins[i].z
        if (dx * dx + dz * dz < 9) {
          cs.got = true
          coinsGot.current += 1
          sfx.coin()
          const mesh = coinRefs.current[i]
          if (mesh) mesh.visible = false
        }
      }
    }

    // --- Sound: Motor-Tempo, Boost, Drift ---
    sfx.engineIntensity(introing ? 0 : Math.min(1, speedKmh(player) / 82))
    const boosting = player.boostTime > 0
    if (boosting && !sndBoost.current) sfx.boost()
    sndBoost.current = boosting
    if (player.drifting && !sndDrift.current) sfx.driftStart()
    else if (!player.drifting && sndDrift.current) sfx.driftStop()
    sndDrift.current = player.drifting

    // Münzen drehen
    for (let i = 0; i < coins.length; i++) {
      const mesh = coinRefs.current[i]
      if (mesh && mesh.visible) mesh.rotation.y += dt * 4
    }

    // Meshes setzen
    for (let i = 0; i < karts.length; i++) {
      const g = meshRefs.current[i]
      if (!g) continue
      const k = karts[i]
      g.position.set(k.x, 0, k.z)
      // Beim Schleudern wirbelt NUR das Modell – die Fahrtrichtung bleibt,
      // sonst würde das Kart in die Botanik lenken. Der Winkel läuft auf 0 aus.
      g.rotation.set(0, k.heading + spinAngle(spin.current[i] ?? 0), 0)
      // Karosserie-Neigung beim Drift (innere Gruppe rollt um die Längsachse)
      const inner = g.children[0]
      if (inner) inner.rotation.z = -k.visualTilt
    }

    // Kamera: im Intro 360°-Umkreisung, danach Verfolgung
    const fx = Math.sin(player.heading)
    const fz = Math.cos(player.heading)
    if (introing) {
      const introT = 1 - Math.max(0, intro.current) / INTRO_DURATION // 0..1
      const ang = player.heading + introT * Math.PI * 2 // eine volle Umrundung
      const radius = 8.5
      const orbit = new THREE.Vector3(
        player.x + Math.sin(ang) * radius,
        3.0 + introT * 2.8,
        player.z + Math.cos(ang) * radius,
      )
      // letzte ~35% sanft in die normale Startansicht überblenden
      const startCam = new THREE.Vector3(player.x - fx * 9, 6.5, player.z - fz * 9)
      const blend = Math.min(1, Math.max(0, (introT - 0.65) / 0.35))
      orbit.lerp(startCam, blend)
      camera.position.copy(orbit)
      camera.lookAt(player.x + fx * 1.5, 1.2, player.z + fz * 1.5)
      camInit.current = true
    } else {
      const camTarget = new THREE.Vector3(player.x - fx * 9, 6.5, player.z - fz * 9)
      if (!camInit.current) {
        camera.position.copy(camTarget)
        camInit.current = true
      } else {
        camera.position.lerp(camTarget, Math.min(1, dt * 4))
      }
      camera.lookAt(player.x + fx * 4, 1.5, player.z + fz * 4)

      // Boost-Gefühl: FOV kurz weiten (Schub) + minimales Wackeln – nur die Kamera,
      // Physik/Position bleibt unberührt (das Rauschen wird nächsten Frame weggelerpt).
      const cam = camera as THREE.PerspectiveCamera
      const targetFov = 62 + (boosting ? 8 : 0)
      camFov.current += (targetFov - camFov.current) * Math.min(1, dt * 6)
      if (Math.abs(cam.fov - camFov.current) > 0.01) {
        cam.fov = camFov.current
        cam.updateProjectionMatrix()
      }
      if (boosting) {
        const now = performance.now()
        camera.position.x += Math.sin(now * 0.05) * 0.06
        camera.position.y += Math.cos(now * 0.043) * 0.06
      }
    }

    // HUD aktualisieren (gedrosselt)
    hudTimer.current -= dt
    if (hudTimer.current <= 0) {
      hudTimer.current = 0.08
      setHud({
        position: player.rank,
        totalRacers: karts.length,
        lap: Math.min(player.lap + 1, track.laps),
        totalLaps: track.laps,
        boostCharge: player.driftCharge,
        countdown: introing ? -1 : Math.ceil(countdown.current),
        intro: introing,
        speedKmh: speedKmh(player),
        coins: coinsGot.current,
        item: held[0],
      })
    }

    // Ziel
    if (player.finished && !reported.current) {
      reported.current = true
      sfx.driftStop()
      sfx.stopEngine()
      engineOn.current = false
      sfx.finish()
      const entries: RaceResultEntry[] = [...karts]
        .sort((a, b) => a.rank - b.rank)
        .map((k) => ({
          id: k.id,
          name: k.name,
          emoji: k.emoji,
          isPlayer: k.isPlayer,
          rank: k.rank,
          laps: k.lap,
        }))
      const rank = player.rank
      const placePoints = [0, 1000, 600, 300, 150][rank] ?? 100
      const points = placePoints + coinsGot.current * 10
      const reward = Math.round(placePoints / 8) + (rank === 1 ? 50 : 0) + coinsGot.current
      onFinish({ entries, playerRank: rank, points, coins: reward })
    }
  })

  const theme = track.theme
  const dirIntensity = theme.sky === 'night' ? 0.6 : theme.sky === 'sunset' ? 1.1 : 1.5

  return (
    <>
      {theme.sky === 'night' && <color attach="background" args={[theme.fog]} />}
      {theme.sky === 'day' && (
        <Sky sunPosition={[120, 60, 80]} turbidity={5} rayleigh={1.2} mieCoefficient={0.005} />
      )}
      {theme.sky === 'sunset' && (
        <Sky sunPosition={[150, 6, 80]} turbidity={10} rayleigh={3} mieCoefficient={0.02} mieDirectionalG={0.9} />
      )}
      {theme.sky === 'night' && <Stars radius={300} depth={60} count={4000} factor={6} fade speed={1} />}
      <fog attach="fog" args={[theme.fog, 170, 470]} />

      {/* Reflexionen für glänzende Oberflächen */}
      <Suspense fallback={null}>
        <Environment preset={theme.envPreset} background={false} environmentIntensity={0.9} />
      </Suspense>
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, 0.5]} />
      <directionalLight
        position={[80, 110, 50]}
        intensity={dirIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-far={300}
      />
      <Track curve={curve} theme={theme} />
      {/* Zuschauende Tiere am Rand + Vögel am Himmel */}
      <Suspense fallback={null}>
        <Spectators curve={curve} />
      </Suspense>
      {theme.sky !== 'night' && <Birds />}
      <Suspense fallback={null}>
        {karts.map((k, i) => (
          <KartModel
            key={k.id}
            ref={(el) => { meshRefs.current[i] = el }}
            path={k.pet.model}
            color={k.color}
            earType={k.pet.earType}
            cutImage={k.pet.cutImage}
            raceImage={k.pet.raceImage}
            model3d={k.pet.model3d}
            model3dRot={k.pet.model3dRot}
            kart={k}
          />
        ))}
      </Suspense>
      {/* Sammelbare Münzen */}
      {coins.map((c, i) => (
        <mesh key={i} ref={(el) => { coinRefs.current[i] = el }} position={[c.x, 1.3, c.z]}>
          <torusGeometry args={[0.5, 0.18, 12, 20]} />
          <meshStandardMaterial color="#ffcf3f" emissive="#ffae1f" emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Bananen: drüberfahren = schleudern */}
      {bananas.map((b, i) => (
        <group
          key={'b' + i}
          ref={(el) => { bananaRefs.current[i] = el }}
          position={[b.x, 0.34, b.z]}
          visible={bananaVisible(b)}
        >
          <Banana />
        </group>
      ))}

      {/* Item-Boxen: durchfahren gibt eine Banane */}
      {boxes.map((b, i) => (
        <mesh key={'ib' + i} ref={(el) => { boxRefs.current[i] = el }} position={[b.x, 2.0, b.z]} castShadow>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial
            color={theme.accent}
            emissive={theme.accent}
            emissiveIntensity={0.6}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
      ))}

      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={0.5} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.6} />
      </EffectComposer>
    </>
  )
}
