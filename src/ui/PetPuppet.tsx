import { useState } from 'react'
import { asset } from '../utils/asset'
import type { Pet } from '../types'

// Drehpunkt (transform-origin Y in %) fuer das Kopf-Nicken je Pet – aus pets-parts/meta.json.
const NECK: Record<string, number> = {
  drako: 57.2, flami: 44.4, fynnox: 36.8, lupix: 55.3, neko: 66.9,
  owlio: 63.1, pingu: 54.6, pompao: 53.2, zippo: 55.0,
}

/**
 * 2.5D-Marionette: Koerper-Layer (Kopf herausgeloest) + Kopf-Overlay, das leicht
 * nickt. Faellt bei fehlenden Teil-Bildern auf das ganze Standbild zurueck.
 */
export function PetPuppet({ pet, className }: { pet: Pet; className?: string }) {
  const [broken, setBroken] = useState(false)
  const [hop, setHop] = useState(false)
  const base = pet.cutImage ?? pet.image
  const hasParts = pet.id in NECK

  if (!base) return null

  function bounce() {
    setHop(true)
    window.setTimeout(() => setHop(false), 620)
  }

  const cls = 'puppet' + (className ? ' ' + className : '') + (hop ? ' puppet-hop' : '')

  if (broken || !hasParts) {
    return (
      <div className={cls} onClick={bounce}>
        <img className="puppet-layer puppet-solo" src={asset(base)} alt={pet.name} />
      </div>
    )
  }

  return (
    <div className={cls} onClick={bounce}>
      <img
        className="puppet-layer puppet-body"
        src={asset(`/art/pets-parts/${pet.id}-body.png`)}
        alt=""
        onError={() => setBroken(true)}
      />
      <img
        className="puppet-layer puppet-head"
        style={{ transformOrigin: `50% ${NECK[pet.id]}%` }}
        src={asset(`/art/pets-parts/${pet.id}-head.png`)}
        alt={pet.name}
        onError={() => setBroken(true)}
      />
    </div>
  )
}
