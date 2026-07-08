import { useGameStore } from '../store/gameStore'
import { PETS, getPet } from '../data/pets'
import { getTrack } from '../data/tracks'
import { PetAvatar } from '../ui/PetAvatar'
import { CUP_TRACKS, rivalId, rivalTaunt, cupOutro } from '../data/cup'

export function CupScreen() {
  const selectedPetId = useGameStore((s) => s.selectedPetId)
  const cupRaceIndex = useGameStore((s) => s.cupRaceIndex)
  const cupPoints = useGameStore((s) => s.cupPoints)
  const startCupRace = useGameStore((s) => s.startCupRace)
  const startCup = useGameStore((s) => s.startCup)
  const setScreen = useGameStore((s) => s.setScreen)

  const player = getPet(selectedPetId)
  const rival = getPet(rivalId(selectedPetId))

  // Feld: Spieler + 3 feste Gegner (wie im Rennen).
  const opponents = PETS.filter((p) => p.id !== selectedPetId).slice(0, 3)
  const field = [player, ...opponents]
  const standings = [...field].sort(
    (a, b) => (cupPoints[b.id] ?? 0) - (cupPoints[a.id] ?? 0),
  )
  const playerRank = standings.findIndex((p) => p.id === selectedPetId) + 1

  const total = CUP_TRACKS.length
  const done = cupRaceIndex >= total
  const nextTrack = getTrack(CUP_TRACKS[Math.min(cupRaceIndex, total - 1)])
  const MEDAL = ['', '🥇', '🥈', '🥉', '4️⃣']

  return (
    <div className="screen cup">
      <div className="cup-head">
        <button className="back-btn" onClick={() => setScreen('menu')}>
          ‹ Menü
        </button>
        <h2 className="cup-title">🏆 Goldener Cup</h2>
      </div>

      {done ? (
        <FinalePanel
          outro={cupOutro(playerRank, rival.name)}
          onAgain={startCup}
          onMenu={() => setScreen('menu')}
        />
      ) : (
        <>
          <div className="cup-intro">
            {cupRaceIndex === 0 ? (
              <p>
                Vier Strecken, ein Ziel: den <strong>Goldenen Pokal</strong>. Schlag den amtierenden
                Champion <strong style={{ color: rival.color }}>{rival.name}</strong> in der Gesamtwertung!
              </p>
            ) : (
              <p>
                Rennen <strong>{cupRaceIndex + 1}</strong> von {total}. Du liegst aktuell auf{' '}
                <strong>Platz {playerRank}</strong>.
              </p>
            )}
            <div className="cup-taunt">
              <PetAvatar pet={rival} variant="chip" />
              <span>{rivalTaunt(cupRaceIndex, rival.name)}</span>
            </div>
          </div>

          <div className="cup-next">
            <span className="cup-next-label">Nächstes Rennen</span>
            <span className="cup-next-name">{nextTrack.name}</span>
            <span className="cup-next-sub">{nextTrack.difficulty} · {nextTrack.laps} Runden</span>
          </div>
        </>
      )}

      <div className="cup-standings">
        <div className="cup-standings-title">Gesamtwertung</div>
        {standings.map((p, i) => (
          <div
            key={p.id}
            className={
              'cup-row' +
              (p.id === selectedPetId ? ' me' : '') +
              (p.id === rival.id ? ' rival' : '')
            }
          >
            <span className="cup-rank">{MEDAL[i + 1] ?? i + 1}</span>
            <span className="cup-av">
              <PetAvatar pet={p} variant="chip" />
            </span>
            <span className="cup-name">
              {p.name}
              {p.id === selectedPetId && <em> (Du)</em>}
              {p.id === rival.id && <span className="cup-tag">Rivale</span>}
            </span>
            <span className="cup-pts">{cupPoints[p.id] ?? 0}</span>
          </div>
        ))}
      </div>

      {!done && (
        <button className="cta start-cta hero-cta" onClick={startCupRace}>
          🏁 Losfahren – {nextTrack.name}
        </button>
      )}
    </div>
  )
}

function FinalePanel({
  outro,
  onAgain,
  onMenu,
}: {
  outro: { title: string; text: string }
  onAgain: () => void
  onMenu: () => void
}) {
  return (
    <div className="cup-finale">
      <div className="cup-finale-title">{outro.title}</div>
      <p className="cup-finale-text">{outro.text}</p>
      <div className="result-actions">
        <button className="cta secondary" onClick={onMenu}>
          Menü
        </button>
        <button className="cta" onClick={onAgain}>
          Neuer Cup 🔁
        </button>
      </div>
    </div>
  )
}
