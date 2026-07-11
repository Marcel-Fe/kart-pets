import { controls } from '../game/controls'
import { useHudStore } from '../store/hudStore'
import { useGameStore } from '../store/gameStore'
import { getPet } from '../data/pets'
import { POWER_META } from '../game/cheer'

type Key = 'steerLeft' | 'steerRight' | 'drift' | 'brake' | 'useItem' | 'power'

function hold(key: Key) {
  // pointer-events: gedrückt halten = true, loslassen = false
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      controls[key] = true
    },
    onPointerUp: () => (controls[key] = false),
    onPointerLeave: () => (controls[key] = false),
    onPointerCancel: () => (controls[key] = false),
  }
}

// Handy-freundlich: Gas läuft automatisch, Boost zündet beim Loslassen des Drifts.
// Damit braucht es nur zwei Daumen: links lenken, rechts driften.
export function TouchControls() {
  // Leiste geladen -> Loslassen feuert den Boost. Der Knopf zeigt das durch Leuchten.
  const boostReady = useHudStore((s) => s.boostCharge) >= 0.25
  const item = useHudStore((s) => s.item)
  // Pet-Power: Knopf erscheint nur, wenn die Jubel-Leiste voll ist.
  const powerReady = useHudStore((s) => s.cheerCharge) >= 1
  const power = POWER_META[getPet(useGameStore((s) => s.selectedPetId)).power]
  // Steuerung erst ab "GO" zeigen. Vorher (Intro-Kamerafahrt + Countdown) laufen
  // die Vorstell-Sprechblasen unten – sonst liegen sie auf den Steuer-Tasten.
  const beforeStart = useHudStore((s) => s.intro || s.countdown > 0)
  if (beforeStart) return null

  return (
    <div className="touch-layer">
      {/* Pet-Power-Knopf – nur sichtbar, wenn die Jubel-Leiste voll ist */}
      {powerReady && (
        <button
          className="tc-btn"
          {...hold('power')}
          aria-label={`Pet-Power: ${power.label}`}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 132,
            transform: 'translateX(-50%)',
            width: 'auto',
            minWidth: 128,
            padding: '10px 18px',
            borderRadius: 999,
            fontWeight: 900,
            fontSize: 15,
            color: '#241800',
            background: `linear-gradient(135deg, ${power.color}, #ffcf3f)`,
            boxShadow: `0 0 22px ${power.color}`,
            border: '2px solid #fff',
            animation: 'none',
          }}
        >
          {power.emoji} {power.label}!
        </button>
      )}
      <div className="touch-left">
        <button className="tc-btn steer" {...hold('steerLeft')} aria-label="Links">
          ◄
        </button>
        <button className="tc-btn steer" {...hold('steerRight')} aria-label="Rechts">
          ►
        </button>
        {/* Item: leuchtet nur, wenn du eins hast. Banane ablegen, Rakete zünden, Schild an. */}
        <button
          className={'tc-btn item' + (item ? ' has' : '')}
          {...hold('useItem')}
          disabled={!item}
          aria-label="Item benutzen"
        >
          {item === 'rocket' ? '🚀' : item === 'shield' ? '🛡️' : item === 'banana' ? '🍌' : '–'}
        </button>
      </div>
      <div className="touch-right">
        <button className="tc-btn brake" {...hold('brake')} aria-label="Bremsen">
          BREMSE
        </button>
        <button
          className={'tc-btn drift-main' + (boostReady ? ' ready' : '')}
          {...hold('drift')}
          aria-label="Driften – loslassen zündet den Boost"
        >
          <span className="tc-drift-word">DRIFT</span>
          <span className="tc-drift-hint">{boostReady ? 'LOSLASSEN!' : 'halten'}</span>
        </button>
      </div>
    </div>
  )
}
