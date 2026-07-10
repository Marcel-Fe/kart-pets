import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Screen, RaceResult } from '../types'
import { xpFromPoints } from '../data/progression'
import { costFor, type UpgradeArea } from '../data/upgrades'
import { getDailyTask } from '../data/dailyTasks'
import { findShopItem, buyStatus, applyPurchase } from '../data/shop'
import { STORE_LIVE } from '../data/storeConfig'
import { designById, designStatus, DEFAULT_DESIGN_ID } from '../data/kartDesigns'
import { PETS } from '../data/pets'
import { CUP_TRACKS, CUP_POINTS, petIdFromEntry } from '../data/cup'
import {
  CAREER,
  evaluateStars,
  totalStars,
  raceKey,
  newlyUnlockedRewards,
  type StarReward,
} from '../data/career'

export const CORE_PET_IDS = ['fynnox', 'pompao', 'zippo', 'drako', 'neko']
export const EGG_COST = 400

function today(): string {
  return new Date().toDateString()
}

interface GameState {
  screen: Screen
  selectedPetId: string
  selectedTrackId: string
  coins: number
  diamonds: number
  totalPoints: number
  petXp: Record<string, number> // Gesamt-XP je Pet
  upgrades: Record<string, number> // Bereich -> gekaufte Stufe
  ownedPets: string[]
  ownedCosmetics: string[] // gekaufte Kosmetik (Skins/Designs/Pass)
  ownedDesigns: string[] // gekaufte Kart-Lackierungen
  selectedDesign: string // aktive Kart-Lackierung
  dailyProgress: Record<string, number> // metric -> Fortschritt heute
  claimedTasks: string[]
  dailyDate: string
  lastXpGain: number
  lastResult: RaceResult | null
  lastHatched: string | null
  tutorialSeen: boolean // Steuerungs-Tipps im ersten Rennen bereits gezeigt?

  // Goldener Cup (Meisterschaft)
  raceMode: 'free' | 'cup' | 'career' // transient: wie das nächste Rennen gewertet wird
  cupRaceIndex: number // abgeschlossene Cup-Rennen (0..CUP_TRACKS.length)
  cupPoints: Record<string, number> // petId -> Cup-Punkte

  // Karrieremodus „Fynnox' Weg zum Ruhm"
  careerStars: Record<string, number> // raceKey -> verdiente Sterne (0..3), persistiert
  careerChapterIdx: number // aktuell gefahrenes Kapitel (transient)
  careerRaceIdx: number // aktuell gefahrenes Rennen im Kapitel (transient)
  lastStars: number // Sterne im zuletzt beendeten Karriere-Rennen (für Result)
  lastRewards: StarReward[] // neu freigeschaltete Belohnungen (für Result)

  setScreen: (s: Screen) => void
  selectPet: (id: string) => void
  selectTrack: (id: string) => void
  buyUpgrade: (area: UpgradeArea) => void
  buyShopItem: (id: string) => void
  buyDesign: (id: string) => void
  selectDesign: (id: string) => void
  finishRace: (result: RaceResult) => void
  refreshDaily: () => void
  claimTask: (id: string) => void
  hatchEgg: () => void
  startFreeRace: () => void
  startCup: () => void
  startCupRace: () => void
  continueCup: () => void
  markTutorialSeen: () => void
  openCareer: () => void
  startCareerRace: (chapterIdx: number, raceIdx: number) => void
  continueCareer: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      screen: 'menu',
      selectedPetId: 'fynnox',
      selectedTrackId: 'fluesterwald',
      coins: 0,
      diamonds: 0,
      totalPoints: 0,
      petXp: {},
      upgrades: {},
      ownedPets: CORE_PET_IDS,
      ownedCosmetics: [],
      ownedDesigns: [DEFAULT_DESIGN_ID],
      selectedDesign: DEFAULT_DESIGN_ID,
      dailyProgress: {},
      claimedTasks: [],
      dailyDate: today(),
      lastXpGain: 0,
      lastResult: null,
      lastHatched: null,
      tutorialSeen: false,
      raceMode: 'free',
      cupRaceIndex: 0,
      cupPoints: {},
      careerStars: {},
      careerChapterIdx: 0,
      careerRaceIdx: 0,
      lastStars: 0,
      lastRewards: [],

      setScreen: (s) => set({ screen: s }),
      selectPet: (id) => set({ selectedPetId: id }),
      selectTrack: (id) => set({ selectedTrackId: id }),
      buyUpgrade: (area) =>
        set((state) => {
          const level = state.upgrades[area] ?? 0
          const cost = costFor(area, level)
          if (cost === null || state.coins < cost) return state
          return {
            coins: state.coins - cost,
            upgrades: { ...state.upgrades, [area]: level + 1 },
          }
        }),
      // Shop-Kauf (In-Game-Währung). €-Käufe brauchen native IAP und werden hier
      // bewusst NICHT abgewickelt – buyStatus liefert dann 'needs-iap' und blockt.
      buyShopItem: (id) =>
        set((state) => {
          const item = findShopItem(id)
          if (!item) return state
          const wallet = {
            coins: state.coins,
            diamonds: state.diamonds,
            ownedCosmetics: state.ownedCosmetics ?? [],
          }
          if (buyStatus(item, wallet, STORE_LIVE) !== 'ok') return state
          const next = applyPurchase(item, wallet)
          return { coins: next.coins, diamonds: next.diamonds, ownedCosmetics: next.ownedCosmetics }
        }),
      // Kart-Lackierung kaufen (Münzen) und direkt aktivieren.
      buyDesign: (id) =>
        set((state) => {
          const design = designById(id)
          const owned = state.ownedDesigns ?? [DEFAULT_DESIGN_ID]
          if (designStatus(design, state.coins, owned) !== 'buyable') return state
          return {
            coins: state.coins - design.price,
            ownedDesigns: [...owned, design.id],
            selectedDesign: design.id,
          }
        }),
      // Bereits besessene Lackierung auswählen.
      selectDesign: (id) =>
        set((state) => {
          const owned = state.ownedDesigns ?? [DEFAULT_DESIGN_ID]
          if (designStatus(designById(id), state.coins, owned) !== 'owned') return state
          return { selectedDesign: id }
        }),
      finishRace: (result) =>
        set((state) => {
          const gain = xpFromPoints(result.points)
          const id = state.selectedPetId
          // Tages-Reset prüfen, dann Tagesaufgaben-Zähler erhöhen.
          const fresh = state.dailyDate === today()
          const prog = fresh ? state.dailyProgress : {}
          const claimed = fresh ? state.claimedTasks : []

          // Im Cup: allen Fahrern Meisterschaftspunkte nach Platz gutschreiben.
          let cupPoints = state.cupPoints
          let cupRaceIndex = state.cupRaceIndex
          if (state.raceMode === 'cup') {
            cupPoints = { ...state.cupPoints }
            for (const e of result.entries) {
              const pid = petIdFromEntry(e.id)
              cupPoints[pid] = (cupPoints[pid] ?? 0) + (CUP_POINTS[e.rank] ?? 0)
            }
            cupRaceIndex = state.cupRaceIndex + 1
          }

          // In der Karriere: Sterne fürs Rennen gutschreiben (nur verbessern) und
          // dadurch neu erreichte Meilenstein-Belohnungen (Diamanten/Münzen/Pets) auszahlen.
          let careerStars = state.careerStars
          let lastStars = 0
          let lastRewards: StarReward[] = []
          let bonusCoins = 0
          let bonusDiamonds = 0
          let owned = state.ownedPets ?? CORE_PET_IDS
          if (state.raceMode === 'career') {
            const chapter = CAREER[state.careerChapterIdx]
            const race = chapter?.races[state.careerRaceIdx]
            if (race) {
              const key = raceKey(chapter.id, state.careerRaceIdx)
              lastStars = evaluateStars(result, race)
              const prevBest = state.careerStars[key] ?? 0
              const prevTotal = totalStars(state.careerStars)
              const best = Math.max(prevBest, lastStars)
              careerStars = { ...state.careerStars, [key]: best }
              const newTotal = totalStars(careerStars)
              lastRewards = newlyUnlockedRewards(prevTotal, newTotal)
              for (const r of lastRewards) {
                bonusCoins += r.coins ?? 0
                bonusDiamonds += r.diamonds ?? 0
                if (r.petId && !owned.includes(r.petId)) owned = [...owned, r.petId]
              }
            }
          }

          return {
            lastResult: result,
            lastXpGain: gain,
            coins: state.coins + result.coins + bonusCoins,
            diamonds: state.diamonds + bonusDiamonds,
            ownedPets: owned,
            totalPoints: state.totalPoints + result.points,
            petXp: { ...state.petXp, [id]: (state.petXp[id] ?? 0) + gain },
            dailyDate: today(),
            claimedTasks: claimed,
            dailyProgress: {
              races: (prog.races ?? 0) + 1,
              wins: (prog.wins ?? 0) + (result.playerRank === 1 ? 1 : 0),
              coins: (prog.coins ?? 0) + result.coins,
            },
            cupPoints,
            cupRaceIndex,
            careerStars,
            lastStars,
            lastRewards,
            screen: 'result',
          }
        }),
      refreshDaily: () =>
        set((state) => {
          if (state.dailyDate === today()) return state
          return { dailyDate: today(), dailyProgress: {}, claimedTasks: [] }
        }),
      claimTask: (id) =>
        set((state) => {
          const task = getDailyTask(id)
          if (!task) return state
          if ((state.claimedTasks ?? []).includes(id)) return state
          const progress = (state.dailyProgress ?? {})[task.metric] ?? 0
          if (progress < task.goal) return state
          return {
            coins: state.coins + task.reward,
            claimedTasks: [...(state.claimedTasks ?? []), id],
          }
        }),
      hatchEgg: () =>
        set((state) => {
          if (state.coins < EGG_COST) return state
          const owned = state.ownedPets ?? CORE_PET_IDS
          const locked = PETS.filter((p) => !owned.includes(p.id))
          if (locked.length === 0) return state
          const pick = locked[Math.floor(Math.random() * locked.length)]
          return {
            coins: state.coins - EGG_COST,
            ownedPets: [...owned, pick.id],
            lastHatched: pick.id,
          }
        }),

      // Freies Rennen: aktuelle Strecke, keine Cup-Wertung.
      startFreeRace: () => set({ raceMode: 'free', screen: 'race' }),
      // Cup starten (Tabelle zurücksetzen) und zur Cup-Übersicht.
      startCup: () => set({ cupRaceIndex: 0, cupPoints: {}, screen: 'cup' }),
      // Nächstes Cup-Rennen fahren: passende Strecke wählen, als Cup werten.
      startCupRace: () =>
        set((state) => ({
          raceMode: 'cup',
          selectedTrackId: CUP_TRACKS[state.cupRaceIndex] ?? CUP_TRACKS[0],
          screen: 'race',
        })),
      continueCup: () => set({ screen: 'cup' }),
      markTutorialSeen: () => set({ tutorialSeen: true }),

      // Karriere-Übersicht öffnen.
      openCareer: () => set({ screen: 'career' }),
      // Ein Karriere-Rennen starten: passende Strecke wählen, als Karriere werten.
      startCareerRace: (chapterIdx, raceIdx) =>
        set(() => {
          const race = CAREER[chapterIdx]?.races[raceIdx]
          return {
            raceMode: 'career',
            careerChapterIdx: chapterIdx,
            careerRaceIdx: raceIdx,
            selectedTrackId: race?.trackId ?? CAREER[0].races[0].trackId,
            screen: 'race',
          }
        }),
      continueCareer: () => set({ screen: 'career' }),
    }),
    {
      name: 'kart-pets-save',
      // Altstände, die screen noch gespeichert haben: beim Laden ins Menü zwingen.
      onRehydrateStorage: () => (state) => {
        if (state) state.screen = 'menu'
      },
      // Nur Spielstand speichern - transiente UI-States (screen, lastResult ...)
      // NICHT persistieren, sonst startet die App im zuletzt offenen Screen (z. B. Rennen).
      partialize: (state) => ({
        selectedPetId: state.selectedPetId,
        selectedTrackId: state.selectedTrackId,
        coins: state.coins,
        diamonds: state.diamonds,
        totalPoints: state.totalPoints,
        petXp: state.petXp,
        upgrades: state.upgrades,
        ownedPets: state.ownedPets,
        ownedCosmetics: state.ownedCosmetics,
        ownedDesigns: state.ownedDesigns,
        selectedDesign: state.selectedDesign,
        dailyProgress: state.dailyProgress,
        claimedTasks: state.claimedTasks,
        dailyDate: state.dailyDate,
        cupRaceIndex: state.cupRaceIndex,
        cupPoints: state.cupPoints,
        careerStars: state.careerStars,
        tutorialSeen: state.tutorialSeen,
      }),
    },
  ),
)
