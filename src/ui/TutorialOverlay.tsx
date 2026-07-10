import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

// Kurze Steuerungs-Tipps, die nur im allerersten Rennen erscheinen. Jeder Tipp
// blendet einige Sekunden ein und wechselt dann weiter; Antippen springt vor.
const TIPS = [
  '🚗 Gas läuft automatisch – konzentrier dich aufs Lenken!',
  '💨 Halte DRIFT in Kurven – beim Loslassen zündet der BOOST!',
  '🌟 Fahr dicht an den jubelnden Fans vorbei – das lädt deine Pet-Power!',
]
const TIP_MS = 5000

export function TutorialOverlay() {
  const seen = useGameStore((s) => s.tutorialSeen)
  const markSeen = useGameStore((s) => s.markTutorialSeen)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (seen || step >= TIPS.length) return
    const t = window.setTimeout(() => setStep((s) => s + 1), TIP_MS)
    return () => window.clearTimeout(t)
  }, [step, seen])

  useEffect(() => {
    if (!seen && step >= TIPS.length) markSeen()
  }, [step, seen, markSeen])

  if (seen || step >= TIPS.length) return null

  return (
    <div
      onClick={() => setStep((s) => s + 1)}
      style={{
        position: 'absolute',
        top: '18%',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 440,
        width: '88%',
        textAlign: 'center',
        padding: '12px 16px',
        borderRadius: 14,
        background: 'rgba(12,14,28,0.9)',
        border: '2px solid #3fa9ff',
        color: '#eaf4ff',
        fontWeight: 700,
        fontSize: 16,
        zIndex: 30,
        cursor: 'pointer',
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      }}
    >
      {TIPS[step]}
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
        Tippen zum Weiter · {step + 1}/{TIPS.length}
      </div>
    </div>
  )
}
