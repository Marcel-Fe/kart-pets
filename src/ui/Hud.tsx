import { useState } from 'react'
import { useHudStore } from '../store/hudStore'
import { useGameStore } from '../store/gameStore'
import { sfx } from '../audio/sfx'
import { getPet } from '../data/pets'
import { asset } from '../utils/asset'
import { rivalId } from '../data/cup'
import { CAREER } from '../data/career'

export function Hud() {
  const position = useHudStore((s) => s.position)
  const totalRacers = useHudStore((s) => s.totalRacers)
  const lap = useHudStore((s) => s.lap)
  const totalLaps = useHudStore((s) => s.totalLaps)
  const boostCharge = useHudStore((s) => s.boostCharge)
  const countdown = useHudStore((s) => s.countdown)
  const intro = useHudStore((s) => s.intro)
  const speedKmh = useHudStore((s) => s.speedKmh)
  const coins = useHudStore((s) => s.coins)
  const setScreen = useGameStore((s) => s.setScreen)
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const raceMode = useGameStore((s) => s.raceMode)
  const careerChapterIdx = useGameStore((s) => s.careerChapterIdx)
  const careerRaceIdx = useGameStore((s) => s.careerRaceIdx)
  const careerIntro =
    raceMode === 'career'
      ? CAREER[careerChapterIdx]?.races[careerRaceIdx]?.intro
      : undefined

  const [confirmExit, setConfirmExit] = useState(false)
  const [soundOn, setSoundOn] = useState(sfx.isEnabled())

  // Speed-Linien blenden ab ~55 km/h weich ein (Motor-Intensität endet bei ~82).
  const speedOpacity = Math.max(0, Math.min(1, (speedKmh - 55) / 25))

  return (
    <div className="hud">
      {countdown <= 0 && speedOpacity > 0 && (
        <div className="speed-lines" style={{ opacity: speedOpacity * 0.9 }} />
      )}
      <div className="hud-coins">🪙 {coins}</div>

      {/* Sprechblasen NUR vor dem Rennen (Intro-Kamerafahrt + Countdown), dann weg */}
      {(intro || countdown > 0) && <PreRaceDialog playerId={selectedPetId} />}

      {/* Karriere-Story: kurzer Erzähler-Beat vor dem Start */}
      {(intro || countdown > 0) && careerIntro && (
        <div
          style={{
            position: 'absolute',
            top: 74,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 420,
            width: '86%',
            textAlign: 'center',
            padding: '8px 14px',
            borderRadius: 12,
            background: 'rgba(12,14,28,0.82)',
            border: '1px solid rgba(255,207,63,0.4)',
            color: '#ffe9b0',
            fontWeight: 600,
            fontSize: 14,
            pointerEvents: 'none',
          }}
        >
          {careerIntro}
        </div>
      )}

      <button
        className="hud-sound"
        onClick={() => setSoundOn(sfx.toggle())}
        aria-label={soundOn ? 'Ton aus' : 'Ton an'}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>
      <div className="hud-top">
        <div className={'hud-chip rank-' + position}>
          <span className="hud-label">PLATZ</span>
          <span className="hud-value">
            {position}<small>/{totalRacers}</small>
          </span>
        </div>
        <div className="hud-chip">
          <span className="hud-label">RUNDE</span>
          <span className="hud-value">
            {lap}<small>/{totalLaps}</small>
          </span>
        </div>
        <div className="hud-chip">
          <span className="hud-label">KM/H</span>
          <span className="hud-value">{speedKmh}</span>
        </div>
      </div>

      <button className="hud-exit" onClick={() => setConfirmExit(true)} aria-label="Rennen verlassen">
        ⏸
      </button>

      <div className="hud-boost">
        <div className="hud-boost-label">BOOST</div>
        <div className="hud-boost-bar">
          <div
            className={'hud-boost-fill' + (boostCharge >= 0.25 ? ' ready' : '')}
            style={{ width: `${Math.round(boostCharge * 100)}%` }}
          />
        </div>
      </div>

      {countdown > 0 && (
        <div className="countdown">{countdown}</div>
      )}
      {countdown === 0 && <CountdownGo />}

      {confirmExit && (
        <div className="race-pause">
          <div className="race-pause-card">
            <h3>Rennen verlassen?</h3>
            <p>Dein Fortschritt in diesem Rennen geht verloren.</p>
            <div className="race-pause-actions">
              <button className="cta secondary" onClick={() => setConfirmExit(false)}>
                ▶ Weiter
              </button>
              <button className="cta" onClick={() => setScreen('menu')}>
                🏠 Verlassen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// „GO!" kurz einblenden, sobald der Countdown 0 erreicht.
function CountdownGo() {
  return <div className="countdown go">GO!</div>
}

const PLAYER_LINES = [
  'Auf geht\'s – der Pokal wird meiner! 🔥',
  'Zeigen wir allen, was wir draufhaben! 💪',
  'Heute überhole ich sie alle! 🏁',
  'Festhalten – jetzt wird gefahren! ⚡',
]
const RIVAL_LINES = [
  'Ha! Du gegen MICH? Süß. 😏',
  'Bleib hinten, wo du hingehörst! 😈',
  'Der Sieg gehört längst mir! 🏆',
  'Träum weiter, Neuling. 🐲',
]

// Vor dem Start: Held motiviert sich, der Rivale stichelt – mit Gesicht & Emotion.
function PreRaceDialog({ playerId }: { playerId: string }) {
  const player = getPet(playerId)
  const rival = getPet(rivalId(playerId))
  const [lines] = useState(() => ({
    p: PLAYER_LINES[Math.floor(Math.random() * PLAYER_LINES.length)],
    r: RIVAL_LINES[Math.floor(Math.random() * RIVAL_LINES.length)],
  }))
  const pFace = player.cutImage ?? player.image
  const rFace = rival.cutImage ?? rival.image
  return (
    <div className="prerace">
      <div className="prerace-actor left">
        <div className="prerace-bubble">{lines.p}</div>
        {pFace && <img className="prerace-face" src={asset(pFace)} alt={player.name} />}
      </div>
      <div className="prerace-actor right">
        <div className="prerace-bubble rival">{lines.r}</div>
        {rFace && <img className="prerace-face rival" src={asset(rFace)} alt={rival.name} />}
      </div>
    </div>
  )
}
