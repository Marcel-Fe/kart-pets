import { useGameStore } from '../store/gameStore'
import { getPet } from '../data/pets'
import { StatBar } from '../ui/StatBar'
import { PetPuppet } from '../ui/PetPuppet'
import { levelFromXp, STAGE_EMOJI, type Stage } from '../data/progression'
import type { Rarity } from '../types'

const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#9aa3b2',
  Rare: '#3fa9ff',
  Epic: '#b56bff',
  Legendary: '#ffb43f',
}

const STAGES: { stage: Stage; min: number }[] = [
  { stage: 'Baby', min: 1 },
  { stage: 'Junior', min: 11 },
  { stage: 'Champion', min: 21 },
  { stage: 'Legendär', min: 36 },
]

export function PetProfile() {
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const petXp = useGameStore((s) => s.petXp)
  const setScreen = useGameStore((s) => s.setScreen)

  const pet = getPet(selectedPetId)
  const xp = petXp[selectedPetId] ?? 0
  const info = levelFromXp(xp)
  const pct = Math.round((info.intoLevel / info.need) * 100)

  return (
    <div className="screen profile">
      <button className="back-btn" onClick={() => setScreen('menu')}>
        ‹ Zurück
      </button>

      <div className="profile-hero" style={{ background: `radial-gradient(circle, ${pet.color}44, transparent 70%)` }}>
        {pet.cutImage || pet.image ? (
          <PetPuppet pet={pet} className="profile-hero-puppet" />
        ) : (
          <span className="profile-emoji">{pet.emoji}</span>
        )}
        <div className="profile-name">{pet.name}</div>
        <div className="profile-role">{pet.role}</div>
        <span className="rarity" style={{ background: RARITY_COLOR[pet.rarity] }}>
          {pet.rarity}
        </span>
      </div>

      <div className="profile-card">
        <div className="level-row">
          <span className="level-badge">
            {STAGE_EMOJI[info.stage]} Level {info.level}
          </span>
          <span className="stage-label">{info.stage}</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${pct}%`, background: pet.color }} />
        </div>
        <div className="xp-text">
          {info.intoLevel} / {info.need} XP bis Level {info.level + 1}
        </div>
      </div>

      <div className="profile-card">
        <h3>Werte</h3>
        <div className="pet-stats">
          <StatBar label="Speed" value={pet.speed} color="#ff7a2f" />
          <StatBar label="Kontrolle" value={pet.control} color="#3fc1ff" />
        </div>
        <p className="hint">Höheres Level gibt einen kleinen Bonus auf Tempo & Kontrolle.</p>
      </div>

      <div className="profile-card">
        <h3>Entwicklung</h3>
        <div className="stage-track">
          {STAGES.map((s) => (
            <div
              key={s.stage}
              className={'stage-step' + (info.level >= s.min ? ' reached' : '')}
            >
              <span className="stage-emoji">{STAGE_EMOJI[s.stage]}</span>
              <span className="stage-name">{s.stage}</span>
              <span className="stage-min">ab Lvl {s.min}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-card">
        <h3>⚡ Spezialfähigkeit</h3>
        <p>{pet.ability}</p>
        <h3 style={{ marginTop: 12 }}>Charakter</h3>
        <p>{pet.personality}</p>
      </div>
    </div>
  )
}
