import { useGameStore } from '../store/gameStore'
import { TRACKS, isTrackUnlocked, DECOR_EMOJI } from '../data/tracks'
import { asset } from '../utils/asset'
import { playerLevelFromPoints } from '../data/progression'

// Strecken mit gemaltem Vorschaubild unter /art/worlds/<id>.png.
// Alle anderen zeigen den Themen-Platzhalter (DECOR_EMOJI).
const WITH_IMAGE = [
  'fluesterwald', 'candychaos', 'vulkanrasen', 'skylinecity', 'sternenkolonie',
  'waldsprint', 'zuckerwirbel', 'lavaring', 'gletschergleiter', 'neonkreisel',
]
const WORLD_IMG: Record<string, string> = Object.fromEntries(
  WITH_IMAGE.map((id) => [id, `/art/worlds/${id}.png`]),
)

export function TrackSelect() {
  const totalPoints = useGameStore((s) => s.totalPoints)
  const selectedTrackId = useGameStore((s) => s.selectedTrackId)
  const selectTrack = useGameStore((s) => s.selectTrack)
  const setScreen = useGameStore((s) => s.setScreen)

  const level = playerLevelFromPoints(totalPoints).level
  const selected = TRACKS.find((t) => t.id === selectedTrackId) ?? TRACKS[0]
  const selectedLocked = !isTrackUnlocked(selected, level)

  return (
    <div className="screen tracks-screen">
      <div className="garage-head">
        <button className="back-btn" onClick={() => setScreen('menu')}>
          ‹ Zurück
        </button>
        <div className="currency lvl-pill">
          <span className="coin">⭐</span> <span className="cur-val">Lvl {level}</span>
        </div>
      </div>

      <h2 className="section-title">🏁 Wähle deine Strecke</h2>

      <div className="track-list">
        {TRACKS.map((t, i) => {
          const locked = !isTrackUnlocked(t, level)
          const active = t.id === selectedTrackId
          const stars = Math.min(5, 1 + t.unlockAtLevel)
          return (
            <button
              key={t.id}
              className={'track-card' + (active ? ' active' : '') + (locked ? ' locked' : '')}
              onClick={() => !locked && selectTrack(t.id)}
              style={active ? { borderColor: t.theme.accent, boxShadow: `0 0 26px ${t.theme.accent}aa` } : undefined}
            >
              {WORLD_IMG[t.id] ? (
                <img className="track-card-img" src={asset(WORLD_IMG[t.id])} alt={t.name} />
              ) : (
                <div
                  className="track-card-img track-card-ph"
                  style={{ background: `linear-gradient(135deg, ${t.theme.hemiSky}, ${t.theme.accent})` }}
                >
                  <span className="track-ph-emoji">{DECOR_EMOJI[t.theme.decor]}</span>
                </div>
              )}
              <span className="track-num">{i + 1}</span>
              <div className="track-overlay">
                <div className="track-info">
                  <div className="track-name">{t.name}</div>
                  <div className="track-meta">
                    <span className="track-stars">{'★'.repeat(stars)}<span className="star-dim">{'★'.repeat(5 - stars)}</span></span>
                    <span className="track-diff">{t.difficulty} · {t.laps} Runden</span>
                  </div>
                </div>
                {active && !locked && <span className="track-check">✓</span>}
              </div>
              {locked && (
                <div className="lock-overlay">
                  <span className="lock-ico">🔒</span>
                  <span className="lock-txt">ab Level {t.unlockAtLevel}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button
        className="cta start-cta"
        disabled={selectedLocked}
        onClick={() => setScreen('race')}
      >
        {selectedLocked ? `🔒 ${selected.name} ab Lvl ${selected.unlockAtLevel}` : `🏁 ${selected.name} – LOS!`}
      </button>
    </div>
  )
}
