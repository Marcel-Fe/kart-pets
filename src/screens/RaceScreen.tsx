import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { RaceScene } from '../game/RaceScene'
import { Hud } from '../ui/Hud'
import { TouchControls } from '../ui/TouchControls'
import { attachKeyboard, resetControls, controls } from '../game/controls'
import { useGameStore } from '../store/gameStore'
import { useHudStore } from '../store/hudStore'
import { PETS, getPet } from '../data/pets'
import { getTrack } from '../data/tracks'
import { levelFromXp } from '../data/progression'
import { effectFor } from '../data/upgrades'
import { designById } from '../data/kartDesigns'

export function RaceScreen() {
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const selectedTrackId = useGameStore((s) => s.selectedTrackId)
  const petXp = useGameStore((s) => s.petXp)
  const upgrades = useGameStore((s) => s.upgrades)
  const finishRace = useGameStore((s) => s.finishRace)
  const selectedDesign = useGameStore((s) => s.selectedDesign)
  const design = designById(selectedDesign)

  const playerPet = getPet(selectedPetId)
  const playerLevel = levelFromXp(petXp[selectedPetId] ?? 0).level
  const playerUpgrades = {
    speed: effectFor('motor', upgrades.motor ?? 0),
    control: effectFor('reifen', upgrades.reifen ?? 0),
    accel: effectFor('booster', upgrades.booster ?? 0),
    armor: effectFor('panzer', upgrades.panzer ?? 0),
  }
  const opponents = PETS.filter((p) => p.id !== selectedPetId).slice(0, 3)
  const track = getTrack(selectedTrackId)

  // Hochformat-Hinweis: nur zeigen, wenn das Gerät gerade im Hochformat ist.
  const [portrait, setPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches,
  )

  useEffect(() => {
    resetControls()
    controls.autoThrottle = true // Kart gibt selbst Gas – Daumen frei fürs Lenken
    useHudStore.getState().set({ countdown: -1, lap: 1, totalLaps: track.laps })
    const detach = attachKeyboard()
    return () => {
      detach()
      resetControls()
      controls.autoThrottle = false
    }
  }, [track.laps])

  // Querformat fürs Rennen: best-effort sperren (funktioniert nur als installierte PWA /
  // in manchen Browsern); sonst kann der Spieler das Handy manuell drehen.
  useEffect(() => {
    const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } }).orientation
    so?.lock?.('landscape').catch(() => {})
    const mq = window.matchMedia('(orientation: portrait)')
    const onChange = (e: MediaQueryListEvent) => setPortrait(e.matches)
    mq.addEventListener('change', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
      try {
        so?.unlock?.()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return (
    <div className="race-screen">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 62, near: 0.1, far: 1600, position: [0, 7, -12] }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.0
        }}
      >
        <RaceScene
          track={track}
          playerPet={playerPet}
          playerLevel={playerLevel}
          playerUpgrades={playerUpgrades}
          opponents={opponents}
          onFinish={finishRace}
          playerDesign={{ body: design.body, chassis: design.chassis }}
        />
      </Canvas>
      <Hud />
      <TouchControls />
      {portrait && (
        <div className="rotate-hint">
          <span className="rotate-ico">📱↻</span>
          <span>Drehe dein Handy quer für das volle Fahrerlebnis</span>
        </div>
      )}
    </div>
  )
}
