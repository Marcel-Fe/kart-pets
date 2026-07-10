import {
  buyStatus,
  applyPurchase,
  findShopItem,
  SHOP,
  type Wallet,
  type ShopItem,
} from '../src/data/shop.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}

const wallet = (coins: number, diamonds: number, cos: string[] = []): Wallet => ({
  coins,
  diamonds,
  ownedCosmetics: cos,
})
const coinItem = findShopItem('coin-s')! // 1000 Münzen für 100 💎
const skinItem = findShopItem('skin')! // Kosmetik für 800 🪙
const eurItem = findShopItem('dia-s')! // 500 💎 für 4,99 €

// --- Store aus: alles gesperrt ---
{
  ok('Store aus -> Münzpaket gesperrt', buyStatus(coinItem, wallet(0, 999), false) === 'store-off')
  ok('Store aus -> Kosmetik gesperrt', buyStatus(skinItem, wallet(9999, 0), false) === 'store-off')
  ok('Store aus -> €-Paket gesperrt', buyStatus(eurItem, wallet(0, 0), false) === 'store-off')
}

// --- Store an ---
{
  ok('€-Paket braucht native IAP', buyStatus(eurItem, wallet(0, 0), true) === 'needs-iap')
  ok('genug Diamanten -> Münzpaket kaufbar', buyStatus(coinItem, wallet(0, 100), true) === 'ok')
  ok('zu wenig Diamanten -> gesperrt', buyStatus(coinItem, wallet(0, 99), true) === 'insufficient')
  ok('genug Münzen -> Kosmetik kaufbar', buyStatus(skinItem, wallet(800, 0), true) === 'ok')
  ok('zu wenig Münzen -> gesperrt', buyStatus(skinItem, wallet(799, 0), true) === 'insufficient')
  ok('bereits besessene Kosmetik -> owned', buyStatus(skinItem, wallet(9999, 0, ['skin']), true) === 'owned')
}

// --- Kauf anwenden ---
{
  const afterCoins = applyPurchase(coinItem, wallet(0, 250))
  ok('Münzpaket: Diamanten abgezogen', afterCoins.diamonds === 150, `${afterCoins.diamonds}`)
  ok('Münzpaket: Münzen gutgeschrieben', afterCoins.coins === 1000, `${afterCoins.coins}`)

  const afterSkin = applyPurchase(skinItem, wallet(1000, 0))
  ok('Kosmetik: Münzen abgezogen', afterSkin.coins === 200, `${afterSkin.coins}`)
  ok('Kosmetik: Besitz vermerkt', afterSkin.ownedCosmetics.includes('skin'))

  // doppelter Kosmetik-Kauf verdoppelt den Besitz nicht
  const twice = applyPurchase(skinItem, afterSkin)
  ok('Kosmetik nicht doppelt im Besitz', twice.ownedCosmetics.filter((c) => c === 'skin').length === 1)
}

// --- Katalog-Sanity: jedes Item hat grant + Preis ---
{
  const all: ShopItem[] = SHOP.flatMap((s) => s.items)
  ok('alle Items haben grant', all.every((i) => i.grant !== undefined))
  ok('alle Preise > 0', all.every((i) => i.price > 0))
  ok('findShopItem findet bekanntes Item', findShopItem('coin-l')?.id === 'coin-l')
  ok('findShopItem: unbekannt -> undefined', findShopItem('gibtsnicht') === undefined)
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
