import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { StatBar } from '../ui/StatBar'
import { getPet } from '../data/pets'
import { asset } from '../utils/asset'
import { UPGRADES, effectFor, costFor } from '../data/upgrades'
import { KART_DESIGNS, designStatus } from '../data/kartDesigns'

type UpgradeDef = (typeof UPGRADES)[number]

function pctText(factor: number): string {
  return `+${Math.round((factor - 1) * 100)}%`
}

export function Garage() {
  const coins = useGameStore((s) => s.coins)
  const upgrades = useGameStore((s) => s.upgrades)
  const buyUpgrade = useGameStore((s) => s.buyUpgrade)
  const setScreen = useGameStore((s) => s.setScreen)
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const ownedDesigns = useGameStore((s) => s.ownedDesigns ?? [])
  const selectedDesign = useGameStore((s) => s.selectedDesign)
  const buyDesign = useGameStore((s) => s.buyDesign)
  const selectDesign = useGameStore((s) => s.selectDesign)

  // Welches Upgrade gerade betrachtet wird -> hebt das Kart hervor.
  const [focus, setFocus] = useState<UpgradeDef | null>(null)
  // Welche Lackierung in der Auswahl gerade markiert ist.
  const [previewId, setPreviewId] = useState(selectedDesign)

  const pet = getPet(selectedPetId)

  // Lackierungs-Auswahl (direkt unter dem Kart platziert, damit man die Vorschau sieht).
  const paintSection = (
    <>
      <div className="section-head" style={{ width: '100%', maxWidth: 460, marginTop: 8 }}>
        <h2>🎨 Lackierung</h2>
      </div>
      <p className="hint" style={{ width: '100%', maxWidth: 460 }}>
        Wähle eine Lackierung für dein Renn-Kart. Rein optisch – kein Fahrvorteil.
      </p>
      <div className="shop-grid" style={{ width: '100%', maxWidth: 460 }}>
        {KART_DESIGNS.map((d) => {
          const status = designStatus(d, coins, ownedDesigns)
          const active = d.id === selectedDesign
          const previewing = d.id === previewId
          return (
            <div
              key={d.id}
              className="shop-card"
              onClick={() => setPreviewId(d.id)}
              style={{
                borderColor: active ? '#ffcf3f' : previewing ? '#ffffffaa' : `${d.swatch[0]}66`,
                cursor: 'pointer',
              }}
            >
              <span
                className="shop-emoji"
                style={{ background: `linear-gradient(135deg, ${d.swatch[0]} 50%, ${d.swatch[1] ?? d.swatch[0]} 50%)` }}
              />
              <div className="shop-name">{d.name}</div>
              {status === 'owned' ? (
                <button
                  className="buy-btn shop-buy"
                  style={{ background: active ? '#ffcf3f' : '#36e07a', color: active ? '#241800' : undefined }}
                  disabled={active}
                  onClick={() => selectDesign(d.id)}
                >
                  {active ? '✓ Aktiv' : 'Auswählen'}
                </button>
              ) : (
                <button
                  className="buy-btn shop-buy"
                  style={{ background: d.swatch[0], opacity: status === 'buyable' ? 1 : 0.55 }}
                  disabled={status !== 'buyable'}
                  onClick={() => buyDesign(d.id)}
                >
                  🪙 {d.price}
                </button>
              )}
              {status === 'insufficient' && <span className="shop-soon">zu wenig</span>}
            </div>
          )
        })}
      </div>
    </>
  )

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
      <div className={'garage-stage' + (focus ? ' has-focus' : '')}>
        <div
          className="garage-bg"
          style={{ backgroundImage: `url(${asset('/art/garage-bg.jpg')})` }}
        />
        <div
          className="garage-glow"
          style={{ background: `radial-gradient(circle at 50% 62%, ${pet.color}44, transparent 60%)` }}
        />
        <div
          className="garage-focus-glow"
          style={focus ? { background: `radial-gradient(circle at 50% 60%, ${focus.color}66, transparent 62%)` } : undefined}
        />
        <div
          className="garage-disc"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${pet.color}bb, ${pet.color}22 60%, transparent)` }}
        />
        {/* Hebebühne: Kart steht zum Schrauben auf der Bühne (hebt beim Fokus an) */}
        <div className="garage-lift" aria-hidden="true">
          <span className="lift-post left" />
          <span className="lift-post right" />
          <span className="lift-plate" />
        </div>
        {/* Gemaltes Kart-Artwork (viper01) – Marcels bevorzugter Look. */}
        <img className="garage-kart-img" src={asset('/art/karts/viper01.png')} alt="Kart" />
        {focus && (
          <div className="kart-focus-tag" style={{ borderColor: focus.color }}>
            <span className="kart-focus-emoji">{focus.emoji}</span>
            {focus.name} <strong style={{ color: focus.color }}>{pctText(effectFor(focus.id, (upgrades[focus.id] ?? 0) + 1))}</strong>
          </div>
        )}
        {/* „Licht geht an" – blendet beim Betreten einmalig auf */}
        <div className="garage-lights" />
        {/* Werkstatt-Rolltor: öffnet sich einmalig beim Betreten der Garage */}
        <div className="garage-door" aria-hidden="true">
          <span className="door-pull" />
        </div>
      </div>
      <div className="pet-card-name garage-kart-name">{pet.name}s Kart</div>

      {/* Lackierung direkt unter dem Kart – Antippen ändert sofort die Vorschau oben */}
      {paintSection}

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
              className={'profile-card upgrade-card' + (focus?.id === def.id ? ' upgrade-active' : '')}
              style={{ borderColor: `${def.color}99`, boxShadow: `0 0 26px ${def.color}33` }}
              onPointerEnter={() => setFocus(def)}
              onPointerLeave={() => setFocus((f) => (f?.id === def.id ? null : f))}
              onTouchStart={() => setFocus(def)}
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
