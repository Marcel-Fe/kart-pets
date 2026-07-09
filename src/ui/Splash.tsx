import { useEffect, useRef, useState } from 'react'
import { asset } from '../utils/asset'

// Studio-Intro beim App-Start (wie bei professionellen Spielen): Mascot Fynnox +
// „PET CARS"-Logo, blendet nach der Animation automatisch weg. Tippen überspringt.
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    setLeaving(true)
    window.setTimeout(onDone, 460) // nach dem Weg-Blenden
  }

  useEffect(() => {
    const t = window.setTimeout(finish, 2700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={'splash' + (leaving ? ' leaving' : '')} onClick={finish} role="button" aria-label="Intro überspringen">
      <div className="splash-studio">FYNNOX&nbsp;GAMES</div>
      <div className="splash-stage">
        <div className="splash-glow" />
        <img className="splash-mascot" src={asset('/art/pets-cut/fynnox.png')} alt="Fynnox" draggable={false} />
      </div>
      <div className="splash-title">
        <span>PET</span>
        <span>CARS</span>
      </div>
      <div className="splash-sub">DAS GROSSE ABENTEUER</div>
      <div className="splash-bar"><span /></div>
      <div className="splash-skip">Tippen zum Überspringen</div>
    </div>
  )
}
