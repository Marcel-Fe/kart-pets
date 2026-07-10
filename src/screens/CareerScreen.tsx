import { useGameStore } from '../store/gameStore'
import { getTrack } from '../data/tracks'
import {
  CAREER,
  STARS_PER_RACE,
  raceKey,
  chapterStars,
  chapterUnlocked,
  chapterComplete,
  careerComplete,
  raceUnlocked,
  totalStars,
  CAREER_FINALE,
} from '../data/career'

function Stars({ n, max = STARS_PER_RACE }: { n: number; max?: number }) {
  return (
    <span style={{ letterSpacing: 1 }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#ffcf3f' : '#4a5170' }}>
          {i < n ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

export function CareerScreen() {
  const careerStars = useGameStore((s) => s.careerStars)
  const startCareerRace = useGameStore((s) => s.startCareerRace)
  const setScreen = useGameStore((s) => s.setScreen)

  const total = totalStars(careerStars)
  const maxStars = CAREER.reduce((n, c) => n + c.races.length * STARS_PER_RACE, 0)
  const finished = careerComplete(careerStars)

  return (
    <div className="screen career" style={{ paddingBottom: 40 }}>
      <div className="garage-head">
        <button className="back-btn" onClick={() => setScreen('menu')}>
          ‹ Menü
        </button>
        <div className="currency">
          <span className="coin">🌟</span> {total}/{maxStars}
        </div>
      </div>

      <h2 className="section-title" style={{ textAlign: 'center', width: '100%' }}>
        🌟 Fynnox' Weg zum Ruhm
      </h2>
      <p className="hint" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        Sammle Sterne, schalte Kapitel und neue Freunde frei – und schlag den Champion Drako.
      </p>

      {finished && (
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            margin: '4px 0 8px',
            padding: '14px 16px',
            borderRadius: 14,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ffcf3f, #ff9d2f)',
            color: '#241800',
            fontWeight: 700,
          }}
        >
          🏆 CHAMPION! {CAREER_FINALE}
        </div>
      )}

      {CAREER.map((chapter) => {
        const unlocked = chapterUnlocked(chapter, careerStars)
        const earned = chapterStars(chapter, careerStars)
        const chMax = chapter.races.length * STARS_PER_RACE
        const done = chapterComplete(chapter, careerStars)
        return (
          <div
            key={chapter.id}
            className="shop-section"
            style={{ opacity: unlocked ? 1 : 0.6, width: '100%', maxWidth: 460 }}
          >
            <div className="section-head">
              <h2>{unlocked ? chapter.title : `🔒 ${chapter.title}`}</h2>
              <span className="hint">
                {earned}/{chMax} ⭐
              </span>
            </div>
            <p className="hint" style={{ marginTop: -4 }}>
              {unlocked ? chapter.blurb : `Braucht ${chapter.requiredStars} Sterne zum Freischalten.`}
            </p>

            {unlocked &&
              chapter.races.map((race, i) => {
                const track = getTrack(race.trackId)
                const stars = careerStars[raceKey(chapter.id, i)] ?? 0
                const playable = raceUnlocked(chapter, i, careerStars)
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      margin: '6px 0',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>
                        {i + 1}. {track.name}
                      </div>
                      <div className="hint" style={{ marginTop: 2 }}>
                        🥇 Platz {race.goalPlace} · 🪙 {race.goalCoins} · 🛡️ ohne Treffer
                      </div>
                      <div style={{ marginTop: 3, fontSize: 15 }}>
                        <Stars n={stars} />
                      </div>
                    </div>
                    <button
                      className="buy-btn"
                      style={{ background: playable ? '#36e07a' : '#3a4160', minWidth: 92 }}
                      disabled={!playable}
                      onClick={() => startCareerRace(CAREER.indexOf(chapter), i)}
                    >
                      {playable ? (stars > 0 ? 'Nochmal' : 'Spielen') : '🔒'}
                    </button>
                  </div>
                )
              })}

            {/* Story-Beat: Drako reagiert, sobald das Kapitel bestanden ist */}
            {unlocked && done && (
              <div
                style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(226,59,46,0.14)',
                  border: '1px solid rgba(226,59,46,0.45)',
                  color: '#ffd7d0',
                  fontStyle: 'italic',
                }}
              >
                🐲 {chapter.victory}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
