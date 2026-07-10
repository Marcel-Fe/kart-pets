import {
  CAREER,
  evaluateStars,
  totalStars,
  chapterStars,
  chapterUnlocked,
  raceUnlocked,
  raceKey,
  newlyUnlockedRewards,
  chapterComplete,
  careerComplete,
  CAREER_FINALE,
  STAR_REWARDS,
  type CareerRace,
} from '../src/data/career.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}

const race: CareerRace = { trackId: 't', goalPlace: 2, goalCoins: 10, intro: '' }

// --- Sterne-Bewertung ---
{
  ok('alle Ziele erfüllt = 3 Sterne', evaluateStars({ playerRank: 1, coinsCollected: 12, hits: 0 }, race) === 3)
  ok('nur Platz erfüllt = 1 Stern', evaluateStars({ playerRank: 2, coinsCollected: 3, hits: 4 }, race) === 1)
  ok('nur Münzen erfüllt = 1 Stern', evaluateStars({ playerRank: 4, coinsCollected: 10, hits: 2 }, race) === 1)
  ok('nur ohne-Treffer = 1 Stern', evaluateStars({ playerRank: 4, coinsCollected: 0, hits: 0 }, race) === 1)
  ok('Platz genau am Ziel zählt', evaluateStars({ playerRank: 2, coinsCollected: 0, hits: 5 }, race) === 1)
  ok('Münzen genau am Ziel zählen', evaluateStars({ playerRank: 4, coinsCollected: 10, hits: 5 }, race) === 1)
  ok('nichts erfüllt = 0 Sterne', evaluateStars({ playerRank: 3, coinsCollected: 9, hits: 1 }, race) === 0)
}

// --- Struktur-Sanity: alle Kapitel & Rennen ---
{
  ok('4 Kapitel', CAREER.length === 4)
  const totalRaces = CAREER.reduce((n, c) => n + c.races.length, 0)
  ok('12 Rennen insgesamt', totalRaces === 12, `${totalRaces}`)
  ok('maximal 36 Sterne', totalRaces * 3 === 36)
  ok('Kapitel 1 ist ohne Sterne frei', CAREER[0].requiredStars === 0)
  ok('jedes Kapitel hat eine Drako-Reaktion', CAREER.every((c) => c.victory.length > 0))
  // requiredStars je Kapitel muss mit dem Vorgänger-Maximum erreichbar sein
  let cumulativeMax = 0
  let reachable = true
  for (const c of CAREER) {
    if (c.requiredStars > cumulativeMax) reachable = false
    cumulativeMax += c.races.length * 3
  }
  ok('jedes Kapitel ist erreichbar', reachable)
}

// --- Freischaltung ---
{
  const none: Record<string, number> = {}
  ok('Kapitel 1 sofort frei', chapterUnlocked(CAREER[0], none))
  ok('Kapitel 2 anfangs gesperrt', !chapterUnlocked(CAREER[1], none))
  ok('erstes Rennen von Kap 1 frei', raceUnlocked(CAREER[0], 0, none))
  ok('zweites Rennen anfangs gesperrt', !raceUnlocked(CAREER[0], 1, none))
  const oneStar = { [raceKey('ch1', 0)]: 1 }
  ok('zweites Rennen nach 1 Stern frei', raceUnlocked(CAREER[0], 1, oneStar))
  // 4 Sterne schalten Kapitel 2 frei
  const fourStars = { [raceKey('ch1', 0)]: 2, [raceKey('ch1', 1)]: 2 }
  ok('4 Sterne = 4 gesamt', totalStars(fourStars) === 4)
  ok('Kapitel 2 nach 4 Sternen frei', chapterUnlocked(CAREER[1], fourStars))
  ok('chapterStars zählt nur das Kapitel', chapterStars(CAREER[0], fourStars) === 4)
}

// --- Belohnungen ---
{
  ok('Sprung 0->3 gibt genau die 3-Sterne-Belohnung', newlyUnlockedRewards(0, 3).length === 1)
  ok('Sprung 2->3 zählt den Meilenstein 3', newlyUnlockedRewards(2, 3)[0].at === 3)
  ok('kein Doppel: 3->3 gibt nichts', newlyUnlockedRewards(3, 3).length === 0)
  ok('großer Sprung sammelt mehrere', newlyUnlockedRewards(0, 9).length === 3)
  ok('36 Sterne holen die Finale-Belohnung', newlyUnlockedRewards(35, 36).some((r) => r.at === 36))
  // Reward-Pets müssen echte Nicht-Core-Pet-IDs sein
  const rewardPets = STAR_REWARDS.filter((r) => r.petId).map((r) => r.petId)
  ok('jeder Reward-Pet hat eine ID', rewardPets.every(Boolean), `${rewardPets}`)
}

// --- Kapitel-/Karriere-Abschluss (Story-Trigger) ---
{
  const none: Record<string, number> = {}
  ok('leeres Kapitel ist nicht abgeschlossen', !chapterComplete(CAREER[0], none))
  // Kapitel 1 mit je 1 Stern in allen Rennen -> abgeschlossen
  const ch1done: Record<string, number> = {}
  CAREER[0].races.forEach((_, i) => (ch1done[raceKey('ch1', i)] = 1))
  ok('Kapitel 1 nach 1 Stern je Rennen abgeschlossen', chapterComplete(CAREER[0], ch1done))
  // ein Rennen ohne Stern -> nicht abgeschlossen
  const ch1partial = { ...ch1done }
  delete ch1partial[raceKey('ch1', CAREER[0].races.length - 1)]
  ok('ein Rennen ohne Stern -> nicht abgeschlossen', !chapterComplete(CAREER[0], ch1partial))
  ok('Karriere anfangs nicht abgeschlossen', !careerComplete(ch1done))
  // alle Rennen aller Kapitel mit 1 Stern -> Karriere komplett
  const all: Record<string, number> = {}
  CAREER.forEach((c) => c.races.forEach((_, i) => (all[raceKey(c.id, i)] = 1)))
  ok('alle Kapitel bestanden -> Karriere komplett', careerComplete(all))
  ok('Finale-Text ist gesetzt', CAREER_FINALE.length > 0)
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
