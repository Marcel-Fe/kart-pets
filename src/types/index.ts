export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'

export type EarType = 'fox' | 'panda' | 'rabbit' | 'cat' | 'dragon'

// Tier-spezifische „Pet-Power", ausgelöst durch die volle Jubel-Leiste.
export type PetPower = 'fire' | 'jump' | 'invincible' | 'scare'

export interface Pet {
  id: string
  name: string
  emoji: string
  role: string
  rarity: Rarity
  color: string // kart body color
  image?: string // path to character portrait PNG (fallback: emoji)
  cutImage?: string // freigestelltes PNG (transparent) für großen Held/Podest
  raceImage?: string // freigestellte RÜCKANSICHT (Pet im Kart von hinten) fürs Rennen
  kartImage?: string // freigestelltes Kart-PNG (3/4-Ansicht) für die Garage
  model3d?: string // generiertes 3D-Modell (GLB) des Pets, von allen Seiten sichtbar
  model3dRot?: [number, number, number] // Rotations-Offset (rad), damit das Pet in Fahrtrichtung blickt
  model: string // path to GLB kart model
  earType: EarType // shape of the animal figure
  speed: number // 1..10 -> affects max speed
  control: number // 1..10 -> affects steering/grip
  ability: string
  personality: string
  power: PetPower // Jubel-Leisten-Fähigkeit
}

export interface AIStyle {
  name: string
  speedFactor: number // multiplier on max speed
  skill: number // 0..1 how well it sticks to the racing line
  aggression: number // 0..1 how much it drifts/boosts
}

export interface RaceResultEntry {
  id: string
  name: string
  emoji: string
  isPlayer: boolean
  rank: number
  laps: number
}

export interface RaceResult {
  entries: RaceResultEntry[]
  playerRank: number
  points: number
  coins: number // Belohnung (nicht die eingesammelten Münzen)
  coinsCollected: number // im Rennen eingesammelte Münzen (für Karriere-Sternenziel)
  hits: number // wie oft der Spieler getroffen wurde (0 = Stern „ohne Treffer")
}

export type Screen = 'menu' | 'race' | 'result' | 'petprofile' | 'garage' | 'dailies' | 'eggs' | 'shop' | 'tracks' | 'cup' | 'career'
