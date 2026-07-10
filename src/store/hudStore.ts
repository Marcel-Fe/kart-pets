import { create } from 'zustand'
import type { Item } from '../game/hazards'

// Live-Renndaten fürs HUD. Getrennt vom Spielstand, damit nur das HUD
// neu rendert – nicht der teure 3D-Canvas.
interface HudState {
  position: number
  totalRacers: number
  lap: number
  totalLaps: number
  boostCharge: number // 0..1
  countdown: number // >0 = Countdown läuft (3,2,1), 0 = GO/fahren
  intro: boolean // true während der Vorstart-Kamerafahrt (Sprechblasen sichtbar)
  speedKmh: number
  coins: number // im Rennen eingesammelte Münzen
  item: Item // gehaltenes Item (Banane, Rakete oder Schild)
  cheerCharge: number // 0..1 Füllstand der Jubel-Leiste
  powerFlash: string | null // kurzer Text beim Auslösen der Pet-Power (sonst null)
  set: (p: Partial<HudState>) => void
}

export const useHudStore = create<HudState>((set) => ({
  position: 1,
  totalRacers: 4,
  lap: 1,
  totalLaps: 3,
  boostCharge: 0,
  countdown: 3,
  intro: false,
  speedKmh: 0,
  coins: 0,
  item: null,
  cheerCharge: 0,
  powerFlash: null,
  set: (p) => set(p),
}))
