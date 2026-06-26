import { asset } from '../utils/asset'
import type { Pet } from '../types'

type Variant = 'chip' | 'card' | 'hero'

const EMOJI_CLASS: Record<Variant, string> = {
  chip: 'pet-emoji',
  card: 'pet-card-glyph',
  hero: 'profile-emoji',
}

// Zeigt das Charakter-Portrait (aus dem Roster), Fallback ist das Emoji.
export function PetAvatar({ pet, variant = 'chip' }: { pet: Pet; variant?: Variant }) {
  if (pet.image) {
    return <img className={`pet-avatar pet-avatar-${variant}`} src={asset(pet.image)} alt={pet.name} />
  }
  return <span className={EMOJI_CLASS[variant]}>{pet.emoji}</span>
}
