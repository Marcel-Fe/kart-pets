import { useState } from 'react'
import { useHudStore } from '../store/hudStore'
import { useGameStore } from '../store/gameStore'
import { sfx } from '../audio/sfx'

export function Hud() {
  const position = useHudStore((s) => s.position)
  const totalRacers = useHudStore((s) => s.totalRacers)
  const lap = useHudStore((s) => s.lap)
  const totalLaps = useHudStore((s) => s.totalLaps)
  const boostCharge = useHudStore((s) => s.boostCharge)
  const countdown = useHudStore((s) => s.countdown)
  const speedKmh = useHudStore((s) => s.speedKmh)
  const coins = useHudStore((s) => s.coins)
  const setScreen = useGameStore((s) => s.setScreen)

  const [confirmExit, setConfirmExit] = useState(false)
  const [soundOn, setSoundOn] = useState(sfx.isEnabled())

  return (
    <div className="hud">
      <div className="hud-coins">🪙 {coins}</div>

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
