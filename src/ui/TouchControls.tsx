import { controls } from '../game/controls'
import { useHudStore } from '../store/hudStore'

type Key = 'steerLeft' | 'steerRight' | 'drift' | 'brake' | 'useItem'

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

  return (
    <div className="touch-layer">
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
