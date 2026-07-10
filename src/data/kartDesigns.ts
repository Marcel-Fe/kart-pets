// Kart-Lackierungen (Kosmetik). Ändern die Grundfarben des selbstgebauten
// ViperKart im Rennen. Rein optisch – kein Fahrvorteil. Reine Daten & Logik,
// unit-getestet in scripts/test-kartdesigns.ts.

export interface KartDesign {
  id: string
  name: string
  price: number // in Münzen (0 = von Anfang an frei)
  body: string // Motorhaube/Nase
  chassis: string // Bodenplatte/Seitenkästen
  swatch: string[] // Farben für die Vorschau-Kacheln in der Garage
}

export const KART_DESIGNS: KartDesign[] = [
  { id: 'standard', name: 'Standard', price: 0, body: '#ff7d1e', chassis: '#2f6bd6', swatch: ['#ff7d1e', '#2f6bd6'] },
  { id: 'gold', name: 'Goldrausch', price: 1200, body: '#e8b23a', chassis: '#2a2320', swatch: ['#e8b23a', '#2a2320'] },
  { id: 'neon', name: 'Neonwelle', price: 1500, body: '#ff2fb0', chassis: '#181140', swatch: ['#ff2fb0', '#22e0ff'] },
  { id: 'carbon', name: 'Carbon', price: 2000, body: '#464c58', chassis: '#15171c', swatch: ['#464c58', '#8a93a6'] },
  { id: 'mint', name: 'Minze', price: 900, body: '#2fe0a6', chassis: '#123c34', swatch: ['#2fe0a6', '#123c34'] },
]

export const DEFAULT_DESIGN_ID = 'standard'

export function designById(id: string): KartDesign {
  return KART_DESIGNS.find((d) => d.id === id) ?? KART_DESIGNS[0]
}

export type DesignStatus = 'owned' | 'buyable' | 'insufficient'

/** Zustand einer Design-Kachel in der Garage. */
export function designStatus(design: KartDesign, coins: number, owned: string[]): DesignStatus {
  if (design.price === 0 || owned.includes(design.id)) return 'owned'
  return coins >= design.price ? 'buyable' : 'insufficient'
}
