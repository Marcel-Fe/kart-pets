import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { PETS } from '../data/pets'
import { TRACKS } from '../data/tracks'
import { StatBar } from '../ui/StatBar'
import { PetAvatar } from '../ui/PetAvatar'
import { KartPreview } from '../ui/KartPreview'
import { levelFromXp, STAGE_EMOJI, playerLevelFromPoints } from '../data/progression'
import type { Rarity } from '../types'

const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#9aa3b2',
  Rare: '#3fa9ff',
  Epic: '#b56bff',
  Legendary: '#ffb43f',
}

export function MainMenu() {
  const coins = useGameStore((s) => s.coins)
  const totalPoints = useGameStore((s) => s.totalPoints)
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const selectPet = useGameStore((s) => s.selectPet)
  const selectedTrackId = useGameStore((s) => s.selectedTrackId)
  const selectTrack = useGameStore((s) => s.selectTrack)
  const petXp = useGameStore((s) => s.petXp)
  const ownedPets = useGameStore((s) => s.ownedPets)
  const upgrades = useGameStore((s) => s.upgrades)
  const refreshDaily = useGameStore((s) => s.refreshDaily)
  const setScreen = useGameStore((s) => s.setScreen)

  useEffect(() => {
    refreshDaily()
  }, [refreshDaily])

  const owned = ownedPets ?? []
  const playerLevel = playerLevelFromPoints(totalPoints).level
  const selected = PETS.find((p) => p.id === selectedPetId) ?? PETS[0]
  const selectedTrack = TRACKS.find((t) => t.id === selectedTrackId) ?? TRACKS[0]
  const selectedTrackLocked = playerLevel < selectedTrack.unlockAtLevel
  const info = levelFromXp(petXp[selectedPetId] ?? 0)
  const upgradeLevels = {
    motor: upgrades.motor ?? 0,
    reifen: upgrades.reifen ?? 0,
    booster: upgrades.booster ?? 0,
    panzer: upgrades.panzer ?? 0,
  }

  return (
    <div className="screen menu">
      <div className="topbar">
        <div className="currency">
          <span className="coin">⭐</span> Lvl {playerLevel}
        </div>
        <div className="currency">
          <span className="coin">🪙</span> {coins}
        </div>
        <div className="currency">
          <span className="coin">🏆</span> {totalPoints}
        </div>
      </div>

      <div className="hero">
        <img src="/art/icon-clean.png" alt="KART PETS" className="hero-img" />
      </div>

      <h2 className="section-title">Wähle deine Welt</h2>
      <div className="pet-strip">
        {TRACKS.map((t) => {
          const locked = playerLevel < t.unlockAtLevel
          return (
            <button
              key={t.id}
              className={
                'world-chip' +
                (t.id === selectedTrackId ? ' active' : '') +
                (locked ? ' locked' : '')
              }
              onClick={() => !locked && selectTrack(t.id)}
              style={{ borderColor: t.id === selectedTrackId ? t.theme.accent : 'transparent' }}
            >
              <span
                className="world-swatch"
                style={{ background: `linear-gradient(135deg, ${t.theme.ground}, ${t.theme.accent})` }}
              />
              <span className="world-name">{locked ? `🔒 ${t.name}` : t.name}</span>
              <span className="world-diff">{locked ? `ab Lvl ${t.unlockAtLevel}` : t.difficulty}</span>
            </button>
          )
        })}
      </div>

      <h2 className="section-title">Wähle dein Pet</h2>

      <div className="pet-strip">
        {PETS.map((pet) => {
          const has = owned.includes(pet.id)
          return (
            <button
              key={pet.id}
              className={
                'pet-chip' +
                (pet.id === selectedPetId ? ' active' : '') +
                (has ? '' : ' locked')
              }
              onClick={() => has && selectPet(pet.id)}
              style={{ borderColor: pet.id === selectedPetId ? pet.color : 'transparent' }}
            >
              {has ? <PetAvatar pet={pet} variant="chip" /> : <span className="pet-emoji">🔒</span>}
              <span className="pet-chip-name">{has ? pet.name : '???'}</span>
            </button>
          )
        })}
      </div>

      <KartPreview pet={selected} upgrades={upgradeLevels} />

      <div className="pet-card" style={{ boxShadow: `0 0 40px ${selected.color}55` }}>
        <div className="pet-card-head">
          <span className="pet-card-emoji" style={{ background: `${selected.color}33` }}>
            <PetAvatar pet={selected} variant="card" />
          </span>
          <div>
            <div className="pet-card-name">{selected.name}</div>
            <div className="pet-card-role">{selected.role}</div>
            <span className="rarity" style={{ background: RARITY_COLOR[selected.rarity] }}>
              {selected.rarity}
            </span>
            <span className="rarity" style={{ background: '#2c3470', marginLeft: 6 }}>
              {STAGE_EMOJI[info.stage]} Lvl {info.level}
            </span>
          </div>
          <button className="profile-link" onClick={() => setScreen('petprofile')}>
            Profil ›
          </button>
        </div>
        <div className="pet-stats">
          <StatBar label="Speed" value={selected.speed} color="#ff7a2f" />
          <StatBar label="Kontrolle" value={selected.control} color="#3fc1ff" />
        </div>
        <div className="pet-ability">
          <strong>⚡ {selected.ability}</strong>
          <p>{selected.personality}</p>
        </div>
      </div>

      <div className="menu-actions">
        <button className="cta secondary garage-btn" onClick={() => setScreen('dailies')}>
          📋 Aufgaben
        </button>
        <button className="cta secondary garage-btn" onClick={() => setScreen('eggs')}>
          🥚 Eier
        </button>
      </div>

      <div className="menu-actions">
        <button className="cta secondary garage-btn" onClick={() => setScreen('garage')}>
          🔧 Garage
        </button>
        <button className="cta" disabled={selectedTrackLocked} onClick={() => setScreen('race')}>
          {selectedTrackLocked ? `🔒 ab Lvl ${selectedTrack.unlockAtLevel}` : `🏁 ${selectedTrack.name} – LOS!`}
        </button>
      </div>
    </div>
  )
}
