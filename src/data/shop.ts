// Shop-Katalog (Anzeige + Preise). Echtes Bezahlen (€) folgt mit dem App-Store-Release.
export type ShopCurrency = 'coins' | 'diamonds' | 'eur'

// Was ein Kauf gutschreibt. Kosmetik-Käufe merken sich den Besitz (cosmetic-id).
export interface ShopGrant {
  coins?: number
  diamonds?: number
  cosmetic?: string
}

export interface ShopItem {
  id: string
  name: string
  emoji: string
  desc: string
  price: number
  currency: ShopCurrency
  color: string
  grant: ShopGrant
}

export interface ShopSection {
  title: string
  note?: string
  items: ShopItem[]
}

export const SHOP: ShopSection[] = [
  {
    title: '💎 Diamanten-Pakete',
    note: 'Echtgeld – verfügbar mit dem App-Release',
    items: [
      { id: 'dia-s', name: 'Handvoll', emoji: '💎', desc: '500 Diamanten', price: 4.99, currency: 'eur', color: '#3fa9ff', grant: { diamonds: 500 } },
      { id: 'dia-m', name: 'Beutel', emoji: '💎', desc: '1.200 Diamanten', price: 9.99, currency: 'eur', color: '#3fa9ff', grant: { diamonds: 1200 } },
      { id: 'dia-l', name: 'Truhe', emoji: '💎', desc: '2.500 Diamanten', price: 19.99, currency: 'eur', color: '#3fa9ff', grant: { diamonds: 2500 } },
    ],
  },
  {
    title: '🪙 Münz-Pakete',
    note: 'Mit Diamanten eintauschen',
    items: [
      { id: 'coin-s', name: 'Münzsack', emoji: '🪙', desc: '1.000 Münzen', price: 100, currency: 'diamonds', color: '#ffcf3f', grant: { coins: 1000 } },
      { id: 'coin-m', name: 'Münzkiste', emoji: '🪙', desc: '3.000 Münzen', price: 250, currency: 'diamonds', color: '#ffcf3f', grant: { coins: 3000 } },
      { id: 'coin-l', name: 'Münzberg', emoji: '🪙', desc: '7.500 Münzen', price: 500, currency: 'diamonds', color: '#ffcf3f', grant: { coins: 7500 } },
    ],
  },
  {
    title: '✨ Kosmetik & Pass',
    note: 'Rein optisch – kein Pay-to-Win',
    items: [
      { id: 'skin', name: 'Pet-Skin', emoji: '🎨', desc: 'Neuer Look für dein Pet', price: 800, currency: 'coins', color: '#b56bff', grant: { cosmetic: 'skin' } },
      { id: 'design', name: 'Kart-Design', emoji: '🏎️', desc: 'Exklusive Kart-Lackierung', price: 1200, currency: 'coins', color: '#ff7a2f', grant: { cosmetic: 'design' } },
      { id: 'pass', name: 'Season-Pass', emoji: '🎟️', desc: 'Saison-Belohnungen & Pets', price: 9.99, currency: 'eur', color: '#36e07a', grant: { cosmetic: 'pass' } },
    ],
  },
]

export function priceLabel(item: ShopItem): string {
  if (item.currency === 'eur') return `${item.price.toFixed(2).replace('.', ',')} €`
  if (item.currency === 'diamonds') return `💎 ${item.price}`
  return `🪙 ${item.price}`
}

// Alle Kauf-Zustände eines Buttons. Reine Logik (unit-getestet), damit Shop-UI
// und gameStore dieselbe Entscheidung treffen.
export type BuyStatus = 'ok' | 'store-off' | 'needs-iap' | 'owned' | 'insufficient'

export interface Wallet {
  coins: number
  diamonds: number
  ownedCosmetics: string[]
}

/** Kann dieses Item jetzt gekauft werden? */
export function buyStatus(item: ShopItem, w: Wallet, storeLive: boolean): BuyStatus {
  if (item.grant.cosmetic && w.ownedCosmetics.includes(item.grant.cosmetic)) return 'owned'
  if (!storeLive) return 'store-off' // Store noch nicht scharf -> „bald verfügbar"
  if (item.currency === 'eur') return 'needs-iap' // Echtgeld nur über native Store-Anbindung
  const have = item.currency === 'diamonds' ? w.diamonds : w.coins
  if (have < item.price) return 'insufficient'
  return 'ok'
}

/** Wendet einen (gültigen) Kauf auf die Geldbörse an – zieht ab und schreibt gut. */
export function applyPurchase(item: ShopItem, w: Wallet): Wallet {
  let { coins, diamonds } = w
  let ownedCosmetics = w.ownedCosmetics
  if (item.currency === 'diamonds') diamonds -= item.price
  else if (item.currency === 'coins') coins -= item.price
  coins += item.grant.coins ?? 0
  diamonds += item.grant.diamonds ?? 0
  if (item.grant.cosmetic && !ownedCosmetics.includes(item.grant.cosmetic)) {
    ownedCosmetics = [...ownedCosmetics, item.grant.cosmetic]
  }
  return { coins, diamonds, ownedCosmetics }
}

/** Item per Id im Katalog finden. */
export function findShopItem(id: string): ShopItem | undefined {
  for (const s of SHOP) {
    const hit = s.items.find((it) => it.id === id)
    if (hit) return hit
  }
  return undefined
}
