export type UpgradeArea = 'motor' | 'reifen' | 'booster' | 'panzer'

export interface UpgradeDef {
  id: UpgradeArea
  name: string
  emoji: string
  beschreibung: string
  statLabel: string
  color: string
  maxLevel: number
  costs: number[] // Kosten für Kauf Stufe i -> i+1 (Länge = maxLevel)
  effects: number[] // Effektfaktor bei Stufe 0..maxLevel (Länge = maxLevel+1, [0] = 1 neutral)
}

// Faire, multiplikative Boni – kein extremer Sprung (analog levelBonus in raceSim).
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'motor',
    name: 'Motor',
    emoji: '⚙️',
    beschreibung: 'Mehr Topspeed auf den Geraden – dein Kart fährt schneller.',
    statLabel: 'Tempo',
    color: '#ff7a2f',
    maxLevel: 5,
    costs: [120, 250, 450, 750, 1200],
    effects: [1, 1.03, 1.06, 1.09, 1.12, 1.15],
  },
  {
    id: 'reifen',
    name: 'Reifen',
    emoji: '🛞',
    beschreibung: 'Mehr Grip in Kurven – du rutschst weniger und hältst die Linie.',
    statLabel: 'Kontrolle',
    color: '#3fc1ff',
    maxLevel: 5,
    costs: [100, 220, 400, 700, 1100],
    effects: [1, 1.025, 1.05, 1.075, 1.1, 1.125],
  },
  {
    id: 'booster',
    name: 'Booster',
    emoji: '🚀',
    beschreibung: 'Schnelleres Beschleunigen nach Start und Kurven.',
    statLabel: 'Boost',
    color: '#b56bff',
    maxLevel: 5,
    costs: [140, 280, 480, 800, 1300],
    effects: [1, 1.04, 1.08, 1.12, 1.16, 1.2],
  },
  {
    id: 'panzer',
    name: 'Panzer',
    emoji: '🛡️',
    beschreibung: 'Weniger Tempoverlust bei Zusammenstößen mit Gegnern.',
    statLabel: 'Schutz',
    color: '#36e07a',
    maxLevel: 5,
    costs: [110, 240, 420, 720, 1150],
    effects: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
  },
]

const BY_ID: Record<UpgradeArea, UpgradeDef> = UPGRADES.reduce(
  (acc, def) => {
    acc[def.id] = def
    return acc
  },
  {} as Record<UpgradeArea, UpgradeDef>,
)

export function getUpgrade(area: UpgradeArea): UpgradeDef {
  return BY_ID[area]
}

// Effektfaktor bei gegebener Stufe (geclampt). Stufe 0 = neutral (1.0).
export function effectFor(area: UpgradeArea, level: number): number {
  const def = BY_ID[area]
  const lvl = Math.max(0, Math.min(level, def.maxLevel))
  return def.effects[lvl]
}

// Kosten, um von `level` auf `level+1` zu kommen. null = bereits maximal.
export function costFor(area: UpgradeArea, level: number): number | null {
  const def = BY_ID[area]
  if (level >= def.maxLevel) return null
  return def.costs[level]
}
