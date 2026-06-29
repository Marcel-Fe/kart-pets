import { useEffect, useState } from 'react'
import { useGameStore, EGG_COST } from '../store/gameStore'
import { PETS } from '../data/pets'
import { TRACKS } from '../data/tracks'
import { DAILY_TASKS } from '../data/dailyTasks'
import { StatBar } from '../ui/StatBar'
import { PetAvatar } from '../ui/PetAvatar'
import { asset } from '../utils/asset'
import { levelFromXp, STAGE_EMOJI, playerLevelFromPoints } from '../data/progression'
import type { Rarity, Screen } from '../types'

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

// Sekundär-Funktionen ohne eigenen Screen → als „bald" markiert.
const UTILS = [
  { ico: '🏆', label: 'Rangliste' },
  { ico: '👥', label: 'Freunde' },
  { ico: '✉️', label: 'Post' },
  { ico: '⚙️', label: 'Einstellungen' },
]

const TABS: { id: string; ico: string; label: string; screen?: Screen; anchor?: string }[] = [
  { id: 'home', ico: '🏠', label: 'Home' },
  { id: 'pets', ico: '🐾', label: 'Pets', screen: 'eggs' },
  { id: 'garage', ico: '🔧', label: 'Garage', screen: 'garage' },
  { id: 'tracks', ico: '🏁', label: 'Strecken', anchor: 'world-strip' },
  { id: 'shop', ico: '🛒', label: 'Shop', screen: 'shop' },
]

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
  const dailyProgress = useGameStore((s) => s.dailyProgress)
  const claimedTasks = useGameStore((s) => s.claimedTasks)
  const refreshDaily = useGameStore((s) => s.refreshDaily)
  const setScreen = useGameStore((s) => s.setScreen)

  const [soon, setSoon] = useState('')

  useEffect(() => {
    refreshDaily()
  }, [refreshDaily])

  useEffect(() => {
    if (!soon) return
    const t = setTimeout(() => setSoon(''), 1600)
    return () => clearTimeout(t)
  }, [soon])

  const owned = ownedPets ?? []
  const prog = dailyProgress ?? {}
  const claimed = claimedTasks ?? []
  const player = playerLevelFromPoints(totalPoints)
  const xpPct = Math.min(100, (player.intoLevel / player.need) * 100)
  const selected = PETS.find((p) => p.id === selectedPetId) ?? PETS[0]
  const selectedTrack = TRACKS.find((t) => t.id === selectedTrackId) ?? TRACKS[0]
  const selectedTrackLocked = player.level < selectedTrack.unlockAtLevel
  const info = levelFromXp(petXp[selectedPetId] ?? 0)
  const tasksReady = DAILY_TASKS.filter(
    (t) => (prog[t.metric] ?? 0) >= t.goal && !claimed.includes(t.id),
  ).length

  function tapTab(tab: (typeof TABS)[number]) {
    if (tab.screen) return setScreen(tab.screen)
    if (tab.anchor) document.getElementById(tab.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="screen menu has-tabbar">
      {/* Spieler-Karte mit Währungen */}
      <div className="player-card">
        <div className="player-id">
          <div className="player-avatar" style={{ boxShadow: `0 0 16px ${selected.color}88` }}>
            <PetAvatar pet={selected} variant="chip" />
          </div>
          <div className="player-meta">
            <div className="player-name">Spieler</div>
            <div className="level-chip">⭐ Level {player.level}</div>
            <div className="player-xp">
              <div className="player-xp-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
        <div className="player-curr">
          <div className="currency">
            <span className="coin">🪙</span> <span className="cur-val">{coins}</span>
            <button className="cur-plus" onClick={() => setScreen('shop')} aria-label="Münzen kaufen">+</button>
          </div>
          <div className="currency">
            <span className="coin">💎</span> <span className="cur-val">{diamonds}</span>
            <button className="cur-plus" onClick={() => setScreen('shop')} aria-label="Diamanten kaufen">+</button>
          </div>
        </div>
      </div>

      {/* Sekundäre Funktionen (bald) */}
      <div className="util-row">
        {UTILS.map((u) => (
          <button key={u.label} className="util-btn" onClick={() => setSoon(u.label)}>
            <span className="util-ico">{u.ico}</span>
            <span className="util-lbl">{u.label}</span>
          </button>
        ))}
      </div>

      {/* Held-Podest – aktuelles Pet */}
      <div className="section-head">
        <h2>🐾 Dein Pet</h2>
        <button className="link-btn" onClick={() => setScreen('petprofile')}>
          Profil ›
        </button>
      </div>
      <div className="hero-podest">
        <div className="hero-glow" style={{ background: `radial-gradient(circle at 50% 42%, ${selected.color}66, transparent 68%)` }} />
        <div className="hero-podest-disc" style={{ background: `radial-gradient(ellipse at 50% 50%, ${selected.color}aa, ${selected.color}22 70%, transparent)` }} />
        {selected.cutImage || selected.image ? (
          <img className="hero-podest-img" src={asset((selected.cutImage ?? selected.image)!)} alt={selected.name} />
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

      {/* Event-Banner (bald) */}
      <button className="event-card" onClick={() => setSoon('Events')}>
        <div className="event-glow" />
        <div className="event-body">
          <span className="event-tag">EVENT · BALD</span>
          <span className="event-title">🏆 Goldener Cup</span>
          <span className="event-sub">Saison-Turnier mit Rangliste</span>
        </div>
        <span className="event-cta">Vormerken ›</span>
      </button>

      {/* Promo-Karten */}
      <div className="promo-grid">
        <button className="promo-card" onClick={() => setScreen('dailies')}>
          <span className="promo-ico">📋</span>
          <span className="promo-name">Tagesaufgaben</span>
          <span className={'promo-badge' + (tasksReady ? ' hot' : '')}>
            {tasksReady ? `${tasksReady} bereit!` : 'Heute aktiv'}
          </span>
        </button>
        <button className="promo-card" onClick={() => setScreen('eggs')}>
          <span className="promo-ico">🥚</span>
          <span className="promo-name">Pet-Ei</span>
          <span className="promo-badge">{EGG_COST} 🪙</span>
        </button>
        <button className="promo-card" onClick={() => setSoon('Saison-Pass')}>
          <span className="promo-ico">🎟️</span>
          <span className="promo-name">Saison-Pass</span>
          <span className="promo-badge soon">Bald</span>
        </button>
        <button className="promo-card" onClick={() => setSoon('Gratis-Truhe')}>
          <span className="promo-ico">🎁</span>
          <span className="promo-name">Gratis-Truhe</span>
          <span className="promo-badge soon">Bald</span>
        </button>
      </div>

      {/* Welten */}
      <div className="section-head">
        <h2>🌍 Wähle deine Welt</h2>
      </div>
      <div className="world-strip" id="world-strip">
        {TRACKS.map((t) => {
          const locked = player.level < t.unlockAtLevel
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

      <button className="cta start-cta" disabled={selectedTrackLocked} onClick={() => setScreen('race')}>
        {selectedTrackLocked ? `🔒 Strecke ab Lvl ${selectedTrack.unlockAtLevel}` : `🏁 ${selectedTrack.name} – LOS!`}
      </button>

      {soon && <div className="soon-toast">⏳ {soon} – bald verfügbar</div>}

      {/* Haupt-Navigation */}
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={'tab-btn' + (tab.id === 'home' ? ' active' : '')}
            onClick={() => tapTab(tab)}
          >
            <span className="tab-ico">{tab.ico}</span>
            <span className="tab-lbl">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
