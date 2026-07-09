import { useGameStore, EGG_COST } from '../store/gameStore'
import { PETS, getPet, effectiveOwnedPets } from '../data/pets'
import { asset } from '../utils/asset'
import { levelFromXp, STAGE_EMOJI } from '../data/progression'
import type { Rarity } from '../types'

const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#9aa3b2',
  Rare: '#3fa9ff',
  Epic: '#b56bff',
  Legendary: '#ffb43f',
}

export function PetEggs() {
  const coins = useGameStore((s) => s.coins)
  const ownedPets = useGameStore((s) => s.ownedPets)
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const selectPet = useGameStore((s) => s.selectPet)
  const petXp = useGameStore((s) => s.petXp)
  const hatchEgg = useGameStore((s) => s.hatchEgg)
  const lastHatched = useGameStore((s) => s.lastHatched)
  const setScreen = useGameStore((s) => s.setScreen)

  const owned = effectiveOwnedPets(ownedPets)
  const locked = PETS.filter((p) => !owned.includes(p.id))
  const allOwned = locked.length === 0
  const canHatch = !allOwned && coins >= EGG_COST
  const hatched = lastHatched ? getPet(lastHatched) : null
  const selected = getPet(selectedPetId)

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

      <div className="section-head">
        <h2>🐾 Deine Sammlung</h2>
        <span className="collect-count">{owned.length}/{PETS.length}</span>
      </div>

      <div className="collect-grid">
        {PETS.map((pet) => {
          const has = owned.includes(pet.id)
          const active = has && pet.id === selectedPetId
          const lvl = levelFromXp(petXp[pet.id] ?? 0)
          const rc = RARITY_COLOR[pet.rarity]
          const img = pet.cutImage ?? pet.image
          return (
            <button
              key={pet.id}
              className={'collect-card' + (active ? ' active' : '') + (has ? '' : ' locked')}
              onClick={() => has && selectPet(pet.id)}
              style={{ borderColor: has ? rc : 'rgba(150,160,200,0.25)' }}
            >
              <div
                className="collect-portrait"
                style={{ background: `radial-gradient(circle at 50% 60%, ${has ? rc + '44' : '#2a335f55'}, transparent 70%)` }}
              >
                {img ? (
                  <img className="collect-img" src={asset(img)} alt={has ? pet.name : 'Gesperrt'} />
                ) : (
                  <span className="collect-emoji">{pet.emoji}</span>
                )}
                {active && <span className="collect-check">✓</span>}
                {!has && <span className="collect-lock">🔒</span>}
              </div>
              <div className="collect-name">{has ? pet.name : '???'}</div>
              {has ? (
                <span className="collect-badge" style={{ color: rc }}>
                  {STAGE_EMOJI[lvl.stage]} Lvl {lvl.level}
                </span>
              ) : (
                <span className="collect-badge locked-badge">Gesperrt</span>
              )}
            </button>
          )
        })}
      </div>

      <button className="cta start-cta" onClick={() => setScreen('petprofile')}>
        {selected.name} – Profil ansehen ›
      </button>

      <div className="section-head">
        <h2>🥚 Mehr Pets</h2>
      </div>
      <div className="egg-card">
        <div className="egg-visual">🥚</div>
        <div className="egg-body">
          <p className="egg-text">
            {allOwned
              ? 'Stark! Du besitzt bereits alle Pets.'
              : `Öffne ein Ei und schalte ein zufälliges neues Pet frei (${locked.length} noch verfügbar).`}
          </p>
          <button
            className="buy-btn buy-btn-wide"
            disabled={!canHatch}
            onClick={hatchEgg}
            style={canHatch ? { background: '#b56bff' } : undefined}
          >
            {allOwned ? 'Alle freigeschaltet' : `🥚 Ei öffnen – 🪙 ${EGG_COST}`}
          </button>
        </div>
      </div>

      {hatched && owned.includes(hatched.id) && (
        <div className="levelup">{hatched.emoji} {hatched.name} freigeschaltet!</div>
      )}
    </div>
  )
}
