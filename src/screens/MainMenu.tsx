import { useEffect } from 'react'
import { useGameStore, EGG_COST } from '../store/gameStore'
import { PETS } from '../data/pets'
import { TRACKS } from '../data/tracks'
import { StatBar } from '../ui/StatBar'
import { PetAvatar } from '../ui/PetAvatar'
import { asset } from '../utils/asset'
import { levelFromXp, STAGE_EMOJI, playerLevelFromPoints } from '../data/progression'
import type { Rarity } from '../types'

const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#9aa3b2',
  Rare: '#3fa9ff',
  Epic: '#b56bff',
  Legendary: '#ffb43f',
}

const WORLD_IMG: Record<string, string> = {
  fluesterwald: '/art/worlds/fluesterwald.png',
  candychaos: '/art/worlds/candychaos.png',
  vulkanrasen: '/art/worlds/vulkanrasen.png',
  skylinecity: '/art/worlds/skylinecity.png',
  sternenkolonie: '/art/worlds/sternenkolonie.png',
}

export function MainMenu() {
  const coins = useGameStore((s) => s.coins)
  const diamonds = useGameStore((s) => s.diamonds)
  const totalPoints = useGameStore((s) => s.totalPoints)
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const selectPet = useGameStore((s) => s.selectPet)
  const selectedTrackId = useGameStore((s) => s.selectedTrackId)
  const selectTrack = useGameStore((s) => s.selectTrack)
  const petXp = useGameStore((s) => s.petXp)
  const ownedPets = useGameStore((s) => s.ownedPets)
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

  return (
    <div className="screen menu">
      {/* Währungen */}
      <div className="topbar">
        <div className="currency">
          <span className="coin">🪙</span> {coins}
        </div>
        <div className="currency">
          <span className="coin">💎</span> {diamonds}
        </div>
        <div className="currency">
          <span className="coin">⭐</span> Lvl {playerLevel}
        </div>
      </div>

      {/* Logo */}
      <div className="hero-bar">
        <img src={asset('/art/icon-clean.png')} alt="" className="hero-logo" />
        <div className="hero-title">
          KART <span>PETS</span>
        </div>
      </div>

      {/* Welten */}
      <div className="section-head">
        <h2>🌍 Wähle deine Welt</h2>
      </div>
      <div className="world-strip">
        {TRACKS.map((t) => {
          const locked = playerLevel < t.unlockAtLevel
          const active = t.id === selectedTrackId
          return (
            <button
              key={t.id}
              className={'world-card' + (active ? ' active' : '') + (locked ? ' locked' : '')}
              onClick={() => !locked && selectTrack(t.id)}
              style={active ? { borderColor: t.theme.accent, boxShadow: `0 0 30px ${t.theme.accent}` } : undefined}
            >
              <img className="world-card-img" src={asset(WORLD_IMG[t.id])} alt={t.name} />
              {locked && (
                <div className="lock-overlay">
                  <span className="lock-ico">🔒</span>
                  <span className="lock-txt">ab Lvl {t.unlockAtLevel}</span>
                </div>
              )}
              {active && !locked && <div className="sel-badge">✓</div>}
            </button>
          )
        })}
      </div>

      {/* Dein Pet – 3D */}
      <div className="section-head">
        <h2>🐾 Dein Pet</h2>
        <button className="link-btn" onClick={() => setScreen('petprofile')}>
          Profil ›
        </button>
      </div>
      <div className="pet-hero" style={{ background: `radial-gradient(circle at 50% 40%, ${selected.color}55, transparent 70%)` }}>
        {selected.image ? (
          <img className="pet-hero-img" src={asset(selected.image)} alt={selected.name} />
        ) : (
          <span className="pet-hero-emoji">{selected.emoji}</span>
        )}
      </div>

      <div className="pet-card" style={{ boxShadow: `0 0 40px ${selected.color}44` }}>
        <div className="pet-card-info">
          <div className="pet-card-name">{selected.name}</div>
          <div className="pet-card-role">{selected.role}</div>
          <div className="badge-row">
            <span className="rarity" style={{ background: RARITY_COLOR[selected.rarity] }}>
              {selected.rarity}
            </span>
            <span className="rarity" style={{ background: '#2c3470' }}>
              {STAGE_EMOJI[info.stage]} Lvl {info.level}
            </span>
          </div>
        </div>
        <div className="pet-stats">
          <StatBar label="Speed" value={selected.speed} color="#ff7a2f" />
          <StatBar label="Kontrolle" value={selected.control} color="#3fc1ff" />
        </div>
        <div className="pet-ability">
          <strong>⚡ {selected.ability}</strong>
        </div>
      </div>

      {/* Pet-Auswahl */}
      <div className="section-head">
        <h2>Wechsle dein Pet</h2>
      </div>
      <div className="pet-strip">
        {PETS.map((pet) => {
          const has = owned.includes(pet.id)
          const active = pet.id === selectedPetId
          return (
            <button
              key={pet.id}
              className={'pet-chip' + (active ? ' active' : '') + (has ? '' : ' locked')}
              onClick={() => (has ? selectPet(pet.id) : setScreen('eggs'))}
              style={active ? { borderColor: pet.color } : undefined}
            >
              {has ? <PetAvatar pet={pet} variant="chip" /> : <span className="pet-emoji">🔒</span>}
              <span className="pet-chip-name">{has ? pet.name : 'Ei'}</span>
            </button>
          )
        })}
      </div>

      {/* Aktionen */}
      <div className="action-grid">
        <button className="action-btn" onClick={() => setScreen('dailies')}>
          <span className="action-ico">📋</span>
          <span className="action-lbl">Aufgaben</span>
        </button>
        <button className="action-btn" onClick={() => setScreen('eggs')}>
          <span className="action-ico">🥚</span>
          <span className="action-lbl">Eier · {EGG_COST}🪙</span>
        </button>
        <button className="action-btn" onClick={() => setScreen('garage')}>
          <span className="action-ico">🔧</span>
          <span className="action-lbl">Garage</span>
        </button>
        <button className="action-btn" onClick={() => setScreen('shop')}>
          <span className="action-ico">🛒</span>
          <span className="action-lbl">Shop</span>
        </button>
      </div>

      <button className="cta start-cta" disabled={selectedTrackLocked} onClick={() => setScreen('race')}>
        {selectedTrackLocked ? `🔒 Strecke ab Lvl ${selectedTrack.unlockAtLevel}` : `🏁 ${selectedTrack.name} – LOS!`}
      </button>
    </div>
  )
}
