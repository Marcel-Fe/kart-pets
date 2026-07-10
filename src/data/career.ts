// Karrieremodus „Fynnox' Weg zum Ruhm" – Kapitel mit je mehreren Rennen, drei
// Sterne pro Rennen (Platz / Münzen / ohne Treffer) und eine Story rund um den
// Rivalen Drako. Reine Daten & Logik ohne React/Three – unit-getestet in
// scripts/test-career.ts. Freischaltungen & Belohnungen laufen über den gameStore.

export interface CareerRace {
  trackId: string
  goalPlace: number // Ziel-Stern 1: Platz <= goalPlace
  goalCoins: number // Ziel-Stern 2: gesammelte Münzen >= goalCoins
  // Ziel-Stern 3 ist immer „ohne Treffer durchkommen" (hits === 0)
  intro: string // kurzer Story-Beat vor dem Rennen (Fynnox-Perspektive)
}

export interface CareerChapter {
  id: string
  title: string
  blurb: string // Kapitel-Einleitung
  requiredStars: number // so viele Gesamt-Sterne schalten das Kapitel frei
  races: CareerRace[]
}

export const STARS_PER_RACE = 3

// 4 Kapitel à 3 Rennen (12 Rennen, max. 36 Sterne). Thematisch nach Welt.
export const CAREER: CareerChapter[] = [
  {
    id: 'ch1',
    title: 'Erste Runden',
    blurb: 'Niemand kennt Fynnox – noch nicht. Im Flüsterwald beginnt der Weg an die Spitze.',
    requiredStars: 0,
    races: [
      { trackId: 'fluesterwald', goalPlace: 3, goalCoins: 6, intro: 'Dein allererstes Rennen. Zeig, dass du hierher gehörst.' },
      { trackId: 'waldsprint', goalPlace: 2, goalCoins: 8, intro: 'Die Leute schauen zu. Ein guter Platz macht neugierig.' },
      { trackId: 'baumkronenkurve', goalPlace: 1, goalCoins: 8, intro: 'Drako lacht über den „Neuling". Stopf ihm das Maul – mit einem Sieg.' },
    ],
  },
  {
    id: 'ch2',
    title: 'Zuckerrausch',
    blurb: 'Der erste Ruhm ruft. In der Bonbonwelt warten schnellere Gegner und süße Fallen.',
    requiredStars: 4,
    races: [
      { trackId: 'candychaos', goalPlace: 3, goalCoins: 9, intro: 'Neues Terrain, klebrige Kurven. Ruhig bleiben.' },
      { trackId: 'zuckerwirbel', goalPlace: 2, goalCoins: 10, intro: 'Die Fans rufen deinen Namen. Enttäusch sie nicht.' },
      { trackId: 'karamellkurve', goalPlace: 1, goalCoins: 10, intro: 'Drako: „Zufallssiege." Beweis, dass es keiner war.' },
    ],
  },
  {
    id: 'ch3',
    title: 'Feuertaufe',
    blurb: 'Jetzt wird es heiß. Auf den Vulkanpisten trennt sich die Spreu vom Weizen.',
    requiredStars: 10,
    races: [
      { trackId: 'vulkanrasen', goalPlace: 3, goalCoins: 11, intro: 'Hitze, Asche, enge Ränge. Volle Konzentration.' },
      { trackId: 'lavaring', goalPlace: 2, goalCoins: 12, intro: 'Ein Sturz hier kostet alles. Fahr sauber.' },
      { trackId: 'ascheweg', goalPlace: 1, goalCoins: 12, intro: 'Drako spürt die Bedrohung. Er fährt härter denn je.' },
    ],
  },
  {
    id: 'ch4',
    title: 'Gipfelsturm',
    blurb: 'Das große Finale: von den Eisgipfeln bis in die Neonstadt. Ein letzter Kampf um den Ruhm.',
    requiredStars: 16,
    races: [
      { trackId: 'gletschergleiter', goalPlace: 2, goalCoins: 12, intro: 'Eiskalt und schnell. Nur die Besten sind noch dabei.' },
      { trackId: 'polarpiste', goalPlace: 1, goalCoins: 13, intro: 'Der Titel ist zum Greifen nah. Halt den Kopf klar.' },
      { trackId: 'hochhaushatz', goalPlace: 1, goalCoins: 14, intro: 'Das FINALE gegen Drako. Alles oder nichts – werde berühmt.' },
    ],
  },
]

/** Eindeutiger Schlüssel eines Karriere-Rennens für die Sterne-Persistenz. */
export function raceKey(chapterId: string, raceIndex: number): string {
  return `${chapterId}:${raceIndex}`
}

/** Bewertet ein beendetes Rennen: 0–3 Sterne (Platz, Münzen, ohne Treffer). */
export function evaluateStars(
  result: { playerRank: number; coinsCollected: number; hits: number },
  race: CareerRace,
): number {
  let s = 0
  if (result.playerRank <= race.goalPlace) s++
  if (result.coinsCollected >= race.goalCoins) s++
  if (result.hits === 0) s++
  return s
}

/** Summe aller verdienten Sterne. */
export function totalStars(stars: Record<string, number>): number {
  let sum = 0
  for (const k in stars) sum += stars[k]
  return sum
}

/** Sterne eines Kapitels (für die Fortschrittsanzeige). */
export function chapterStars(chapter: CareerChapter, stars: Record<string, number>): number {
  let sum = 0
  chapter.races.forEach((_, i) => (sum += stars[raceKey(chapter.id, i)] ?? 0))
  return sum
}

/** Ein Kapitel ist frei, sobald genügend Gesamt-Sterne erreicht sind. */
export function chapterUnlocked(chapter: CareerChapter, stars: Record<string, number>): boolean {
  return totalStars(stars) >= chapter.requiredStars
}

/** Ist dieses Rennen spielbar? Erstes Rennen frei, sonst braucht es ≥1 Stern im Vorgänger. */
export function raceUnlocked(chapter: CareerChapter, raceIndex: number, stars: Record<string, number>): boolean {
  if (!chapterUnlocked(chapter, stars)) return false
  if (raceIndex === 0) return true
  return (stars[raceKey(chapter.id, raceIndex - 1)] ?? 0) > 0
}

// --- Belohnungen: Sterne-Meilensteine speisen Diamanten/Münzen & schalten Pets frei ---
export interface StarReward {
  at: number // ab so vielen Gesamt-Sternen
  diamonds?: number
  coins?: number
  petId?: string
  label: string
}

export const STAR_REWARDS: StarReward[] = [
  { at: 3, diamonds: 40, label: 'Erste Erfolge' },
  { at: 6, coins: 500, label: 'Aufsteiger' },
  { at: 9, petId: 'lupix', label: 'Neuer Freund: Lupix' },
  { at: 15, diamonds: 60, label: 'Bekannter Name' },
  { at: 21, petId: 'owlio', label: 'Neuer Freund: Owlio' },
  { at: 27, diamonds: 80, coins: 1000, label: 'Star der Szene' },
  { at: 33, petId: 'flami', label: 'Neuer Freund: Flami' },
  { at: 36, petId: 'pingu', diamonds: 150, label: 'Legende – Weg zum Ruhm vollendet!' },
]

/** Belohnungen, die durch den Sprung von prevTotal auf newTotal neu erreicht wurden. */
export function newlyUnlockedRewards(prevTotal: number, newTotal: number): StarReward[] {
  return STAR_REWARDS.filter((r) => r.at > prevTotal && r.at <= newTotal)
}
