import { useGameStore } from '../store/gameStore'
import { getPet } from '../data/pets'
import { levelFromXp } from '../data/progression'

const MEDAL = ['', '🥇', '🥈', '🥉', '4️⃣']

export function ResultScreen() {
  const result = useGameStore((s) => s.lastResult)
  const lastXpGain = useGameStore((s) => s.lastXpGain)
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const petXp = useGameStore((s) => s.petXp)
  const setScreen = useGameStore((s) => s.setScreen)
  const raceMode = useGameStore((s) => s.raceMode)
  const continueCup = useGameStore((s) => s.continueCup)
  const continueCareer = useGameStore((s) => s.continueCareer)
  const startFreeRace = useGameStore((s) => s.startFreeRace)
  const lastStars = useGameStore((s) => s.lastStars)
  const lastRewards = useGameStore((s) => s.lastRewards)

  const pet = getPet(selectedPetId)
  const xp = petXp[selectedPetId] ?? 0
  const info = levelFromXp(xp)
  const before = levelFromXp(xp - lastXpGain)
  const leveledUp = info.level > before.level

  if (!result) {
    return (
      <div className="screen result">
        <button className="cta" onClick={() => setScreen('menu')}>
          Zum Menü
        </button>
      </div>
    )
  }

  const won = result.playerRank === 1

  return (
    <div className="screen result">
      <div className="result-headline">
        <div className="result-place">{MEDAL[result.playerRank] ?? '🏁'}</div>
        <h1>{won ? 'GEWONNEN!' : `Platz ${result.playerRank}`}</h1>
      </div>

      <div className="reward-row">
        <div className="reward">
          <span className="reward-emoji">🏆</span>
          <span className="reward-value">+{result.points}</span>
          <span className="reward-label">Punkte</span>
        </div>
        <div className="reward">
          <span className="reward-emoji">🪙</span>
          <span className="reward-value">+{result.coins}</span>
          <span className="reward-label">Münzen</span>
        </div>
        <div className="reward">
          <span className="reward-emoji">{pet.emoji}</span>
          <span className="reward-value">+{lastXpGain}</span>
          <span className="reward-label">XP</span>
        </div>
      </div>

      {leveledUp && (
        <div className="levelup">🎉 {pet.name} ist jetzt Level {info.level}!</div>
      )}

      {raceMode === 'career' && (
        <div className="career-result" style={{ textAlign: 'center', margin: '6px 0 4px' }}>
          <div style={{ fontSize: 34, letterSpacing: 4 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ color: i < lastStars ? '#ffcf3f' : '#4a5170' }}>
                {i < lastStars ? '★' : '☆'}
              </span>
            ))}
          </div>
          <div className="hint">{lastStars} von 3 Sternen</div>
          {lastRewards.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {lastRewards.map((r) => (
                <div
                  key={r.at}
                  style={{
                    display: 'inline-block',
                    margin: 4,
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #ffcf3f, #ff9d2f)',
                    color: '#241800',
                    fontWeight: 800,
                  }}
                >
                  🎁 {r.label}
                  {r.diamonds ? ` · +${r.diamonds}💎` : ''}
                  {r.coins ? ` · +${r.coins}🪙` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="standings">
        {result.entries.map((e) => (
          <div
            key={e.id}
            className={'standing-row' + (e.isPlayer ? ' me' : '')}
          >
            <span className="standing-rank">{e.rank}</span>
            <span className="standing-emoji">{e.emoji}</span>
            <span className="standing-name">
              {e.name} {e.isPlayer && <em>(Du)</em>}
            </span>
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button className="cta secondary" onClick={() => setScreen('menu')}>
          Menü
        </button>
        {raceMode === 'cup' ? (
          <button className="cta" onClick={continueCup}>
            Weiter im Cup →
          </button>
        ) : raceMode === 'career' ? (
          <button className="cta" onClick={continueCareer}>
            Weiter zur Karriere →
          </button>
        ) : (
          <button className="cta" onClick={startFreeRace}>
            Nochmal 🔁
          </button>
        )}
      </div>
    </div>
  )
}
