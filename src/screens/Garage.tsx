import { useGameStore } from '../store/gameStore'
import { StatBar } from '../ui/StatBar'
import { getPet } from '../data/pets'
import { asset } from '../utils/asset'
import { UPGRADES, effectFor, costFor } from '../data/upgrades'

const DEFAULT_KART = '/art/karts/viper01.png' // Starter-Kart für alle Pets ohne eigenes Kart-Bild

function pctText(factor: number): string {
  return `+${Math.round((factor - 1) * 100)}%`
}

export function Garage() {
  const coins = useGameStore((s) => s.coins)
  const upgrades = useGameStore((s) => s.upgrades)
  const buyUpgrade = useGameStore((s) => s.buyUpgrade)
  const setScreen = useGameStore((s) => s.setScreen)
  const selectedPetId = useGameStore((s) => s.selectedPetId)

  const pet = getPet(selectedPetId)
  const lv = {
    motor: upgrades.motor ?? 0,
    reifen: upgrades.reifen ?? 0,
    booster: upgrades.booster ?? 0,
    panzer: upgrades.panzer ?? 0,
  }

  // Anzeige-Werte (kein Physik-Einfluss): Pet-Basis + gekaufte Upgrades.
  const stats = [
    { label: 'Tempo', value: Math.min(10, pet.speed + lv.motor * 0.5), color: '#ff7a2f' },
    { label: 'Antritt', value: Math.min(10, 5 + lv.booster * 0.9), color: '#b56bff' },
    { label: 'Handling', value: Math.min(10, pet.control + lv.reifen * 0.5), color: '#3fc1ff' },
    { label: 'Schutz', value: Math.min(10, 3 + lv.panzer * 1.2), color: '#36e07a' },
  ]

  return (
    <div className="screen garage">
      <div className="garage-head">
        <button className="back-btn" onClick={() => setScreen('menu')}>
          ‹ Zurück
        </button>
        <div className="currency">
          <span className="coin">🪙</span> <span className="cur-val">{coins}</span>
        </div>
      </div>

      <h2 className="section-title">🔧 Kart-Garage</h2>

      {/* Kart-Held: echtes 3D-Modell (drehbar) falls vorhanden, sonst Render-Bild */}
      <div className="garage-stage">
        <div
          className="garage-bg"
          style={{ backgroundImage: `url(${asset('/art/garage-bg.jpg')})` }}
        />
        <div
          className="garage-glow"
          style={{ background: `radial-gradient(circle at 50% 44%, ${pet.color}55, transparent 66%)` }}
        />
        <div
          className="garage-disc"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${pet.color}cc, ${pet.color}22 60%, transparent)` }}
        />
        {/* Jedes Pet zeigt ein echtes Kart (Standard: Viper 01), nicht mehr sein Porträt */}
        <img
          className="garage-kart-img"
          src={asset(pet.kartImage ?? DEFAULT_KART)}
          alt={`${pet.name}s Kart`}
        />
      </div>
      <div className="pet-card-name garage-kart-name">{pet.name}s Kart</div>

      {/* Kart-Werte */}
      <div className="pet-card garage-stats">
        {stats.map((s) => (
          <StatBar key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <p className="hint swipe-hint">🔧 Wähle ein Teil zum Verbessern</p>
      <div className="upgrade-strip">
        {UPGRADES.map((def) => {
          const level = upgrades[def.id] ?? 0
          const effect = effectFor(def.id, level)
          const nextEffect = effectFor(def.id, level + 1)
          const cost = costFor(def.id, level)
          const isMax = cost === null
          const canBuy = !isMax && coins >= cost

          return (
            <div
              key={def.id}
              className="profile-card upgrade-card"
              style={{ borderColor: `${def.color}99`, boxShadow: `0 0 26px ${def.color}33` }}
            >
              <div className="upgrade-head">
                <span className="upgrade-emoji" style={{ background: `${def.color}33` }}>
                  {def.emoji}
                </span>
                <div className="upgrade-title">
                  <div className="upgrade-name">{def.name}</div>
                  <span className="upgrade-level">Stufe {level}/{def.maxLevel}</span>
                </div>
              </div>

              <div className="upgrade-desc">{def.beschreibung}</div>

              <StatBar label={def.statLabel} value={(level / def.maxLevel) * 10} color={def.color} />

              <div className="upgrade-effect-box">
                <span className="upgrade-effect-label">{def.statLabel}-Bonus</span>
                <span className="upgrade-effect" style={{ color: def.color }}>
                  {isMax ? `Maximal ${pctText(effect)}` : `${pctText(effect)} → ${pctText(nextEffect)}`}
                </span>
              </div>

              <button
                className="buy-btn buy-btn-wide"
                disabled={!canBuy}
                onClick={() => buyUpgrade(def.id)}
                style={canBuy ? { background: def.color } : undefined}
              >
                {isMax ? '✓ MAX ausgebaut' : `Verbessern – 🪙 ${cost}`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
