import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Screen, RaceResult } from '../types'
import { xpFromPoints } from '../data/progression'
import { costFor, type UpgradeArea } from '../data/upgrades'
import { getDailyTask } from '../data/dailyTasks'
import { PETS } from '../data/pets'
import { CUP_TRACKS, CUP_POINTS, petIdFromEntry } from '../data/cup'

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
  dailyProgress: Record<string, number> // metric -> Fortschritt heute
  claimedTasks: string[]
  dailyDate: string
  lastXpGain: number
  lastResult: RaceResult | null
  lastHatched: string | null

  // Goldener Cup (Meisterschaft)
  raceMode: 'free' | 'cup' // transient: wie das nächste Rennen gewertet wird
  cupRaceIndex: number // abgeschlossene Cup-Rennen (0..CUP_TRACKS.length)
  cupPoints: Record<string, number> // petId -> Cup-Punkte

  setScreen: (s: Screen) => void
  selectPet: (id: string) => void
  selectTrack: (id: string) => void
  buyUpgrade: (area: UpgradeArea) => void
  finishRace: (result: RaceResult) => void
  refreshDaily: () => void
  claimTask: (id: string) => void
  hatchEgg: () => void
  startFreeRace: () => void
  startCup: () => void
  startCupRace: () => void
  continueCup: () => void
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
      dailyProgress: {},
      claimedTasks: [],
      dailyDate: today(),
      lastXpGain: 0,
      lastResult: null,
      lastHatched: null,
      raceMode: 'free',
      cupRaceIndex: 0,
      cupPoints: {},

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

          return {
            lastResult: result,
            lastXpGain: gain,
            coins: state.coins + result.coins,
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
        dailyProgress: state.dailyProgress,
        claimedTasks: state.claimedTasks,
        dailyDate: state.dailyDate,
        cupRaceIndex: state.cupRaceIndex,
        cupPoints: state.cupPoints,
      }),
    },
  ),
)
