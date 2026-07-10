import { useGameStore } from '../store/gameStore'
import { SHOP, priceLabel, buyStatus, type ShopItem } from '../data/shop'
import { STORE_LIVE } from '../data/storeConfig'

// Button-Text je Kauf-Zustand.
function ctaLabel(status: ReturnType<typeof buyStatus>, item: ShopItem): string {
  switch (status) {
    case 'owned':
      return '✓ Gekauft'
    case 'store-off':
      return 'bald verfügbar'
    case 'needs-iap':
      return priceLabel(item)
    case 'insufficient':
      return priceLabel(item)
    default:
      return priceLabel(item)
  }
}

function subLabel(status: ReturnType<typeof buyStatus>): string {
  if (status === 'store-off') return 'bald verfügbar'
  if (status === 'needs-iap') return 'im App-Store'
  if (status === 'insufficient') return 'zu wenig'
  return ''
}

export function Shop() {
  const coins = useGameStore((s) => s.coins)
  const diamonds = useGameStore((s) => s.diamonds)
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics ?? [])
  const buyShopItem = useGameStore((s) => s.buyShopItem)
  const setScreen = useGameStore((s) => s.setScreen)

  const wallet = { coins, diamonds, ownedCosmetics }

  return (
    <div className="screen garage">
      <div className="garage-head">
        <button className="back-btn" onClick={() => setScreen('menu')}>
          ‹ Zurück
        </button>
        <div className="shop-currencies">
          <div className="currency">
            <span className="coin">🪙</span> {coins}
          </div>
          <div className="currency">
            <span className="coin">💎</span> {diamonds}
          </div>
        </div>
      </div>

      <h2 className="section-title">🛒 Shop</h2>
      <p className="hint" style={{ width: '100%', maxWidth: 460 }}>
        Fair Play: Alles ist auch ohne Kauf erspielbar. Münzen verdienst du in Rennen &
        Aufgaben, Diamanten in der Karriere. Echte Käufe sind rein optisch – kein Pay-to-Win.
      </p>

      {SHOP.map((section) => (
        <div key={section.title} className="shop-section">
          <div className="section-head">
            <h2>{section.title}</h2>
          </div>
          {section.note && <p className="hint shop-note">{section.note}</p>}
          <div className="shop-grid">
            {section.items.map((item) => {
              const status = buyStatus(item, wallet, STORE_LIVE)
              const disabled = status !== 'ok'
              const sub = subLabel(status)
              return (
                <div key={item.id} className="shop-card" style={{ borderColor: `${item.color}66` }}>
                  <span className="shop-emoji" style={{ background: `${item.color}22` }}>
                    {item.emoji}
                  </span>
                  <div className="shop-name">{item.name}</div>
                  <div className="shop-desc">{item.desc}</div>
                  <button
                    className="buy-btn shop-buy"
                    style={{ background: item.color, opacity: disabled ? 0.55 : 1 }}
                    disabled={disabled}
                    onClick={() => buyShopItem(item.id)}
                  >
                    {ctaLabel(status, item)}
                  </button>
                  {sub && <span className="shop-soon">{sub}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
