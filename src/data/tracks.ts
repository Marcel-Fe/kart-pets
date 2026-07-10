import { DEMO_UNLOCK_ALL } from './demo'

export type DecorKind = 'forest' | 'candy' | 'volcano' | 'city' | 'ice'
export type GroundKind = 'grass' | 'candy' | 'rock' | 'city' | 'ice'
export type SkyKind = 'day' | 'sunset' | 'night'

export interface TrackTheme {
  sky: SkyKind
  fog: string
  ground: string // Basis-Tönung des Bodens
  groundTex: GroundKind
  road: string
  decor: DecorKind
  accent: string // Randsteine/Items
  envPreset: 'park' | 'sunset' | 'night' | 'dawn' | 'city'
  ambient: number
  hemiSky: string
  hemiGround: string
}

export interface TrackDef {
  id: string
  name: string
  difficulty: string
  laps: number
  unlockAtLevel: number // ab welchem Spieler-Level wählbar (1 = von Anfang an)
  theme: TrackTheme
  // Kontrollpunkte (x, z) für die geschlossene Mittellinie der Strecke
  points: [number, number][]
}

// Erzeugt eine garantiert glatte, geschlossene Streckenschleife (Ellipse mit
// sanften „Lappen"). So lassen sich viele unterschiedliche, aber fahrbare
// Layouts ohne Handarbeit definieren (kein Selbstschnitt bei amp <= ~0.2).
function makeLoop(rx: number, rz: number, lobes: number, amp: number, rot: number, n = 12): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rf = 1 + amp * Math.sin(lobes * a)
    const x0 = Math.cos(a) * rx * rf
    const z0 = Math.sin(a) * rz * rf
    const x = x0 * Math.cos(rot) - z0 * Math.sin(rot)
    const z = x0 * Math.sin(rot) + z0 * Math.cos(rot)
    pts.push([Math.round(x), Math.round(z)])
  }
  return pts
}

// Themen werden zwischen Strecken geteilt (gleiche Welt-Optik, andere Streckenform).
const THEME_FOREST: TrackTheme = {
  sky: 'day', fog: '#bcd6f0', ground: '#6fa04e', groundTex: 'grass', road: '#585c68',
  decor: 'forest', accent: '#ff5d6c', envPreset: 'park', ambient: 0.25, hemiSky: '#bfe3ff', hemiGround: '#3a7a48',
}
const THEME_CANDY: TrackTheme = {
  sky: 'day', fog: '#ffd9ef', ground: '#ffc8e6', groundTex: 'candy', road: '#b98cff',
  decor: 'candy', accent: '#ff3fa0', envPreset: 'dawn', ambient: 0.4, hemiSky: '#ffd6f2', hemiGround: '#ff8fc4',
}
const THEME_VOLCANO: TrackTheme = {
  sky: 'sunset', fog: '#5a2a22', ground: '#4a3a36', groundTex: 'rock', road: '#3a3438',
  decor: 'volcano', accent: '#ff7a1f', envPreset: 'sunset', ambient: 0.3, hemiSky: '#ff8a4a', hemiGround: '#2a1410',
}
const THEME_ICE: TrackTheme = {
  sky: 'day', fog: '#cfe9ff', ground: '#eaf6ff', groundTex: 'ice', road: '#bfe0f5',
  decor: 'ice', accent: '#4fd0ff', envPreset: 'dawn', ambient: 0.35, hemiSky: '#dff1ff', hemiGround: '#9fc6e6',
}
const THEME_CITY: TrackTheme = {
  sky: 'night', fog: '#0c0824', ground: '#161033', groundTex: 'city', road: '#2a2150',
  decor: 'city', accent: '#b56bff', envPreset: 'night', ambient: 0.22, hemiSky: '#3a2a7a', hemiGround: '#070411',
}

export const TRACKS: TrackDef[] = [
  {
    id: 'fluesterwald',
    name: 'Wald-Rallye',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 1,
    theme: {
      sky: 'day',
      fog: '#bcd6f0',
      ground: '#6fa04e',
      groundTex: 'grass',
      road: '#585c68',
      decor: 'forest',
      accent: '#ff5d6c',
      envPreset: 'park',
      ambient: 0.25,
      hemiSky: '#bfe3ff',
      hemiGround: '#3a7a48',
    },
    points: [
      [0, 120], [80, 95], [125, 30], [105, -55], [40, -105],
      [-45, -115], [-115, -70], [-135, 15], [-95, 85], [-35, 110],
    ],
  },
  {
    id: 'candychaos',
    name: 'Candy Chaos',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 1,
    theme: {
      sky: 'day',
      fog: '#ffd9ef',
      ground: '#ffc8e6',
      groundTex: 'candy',
      road: '#b98cff',
      decor: 'candy',
      accent: '#ff3fa0',
      envPreset: 'dawn',
      ambient: 0.4,
      hemiSky: '#ffd6f2',
      hemiGround: '#ff8fc4',
    },
    // Der Zacken [70,-70] -> [110,-120] erzeugte einen 3,6-m-Knick (unfahrbar,
    // Kart braucht bei Vollgas ~13,6 m). Jetzt ein weiter, schneller Bogen.
    points: [
      [0, 110], [95, 90], [120, 10], [95, -60], [55, -115],
      [0, -132], [-80, -95], [-125, -20], [-90, 70], [-30, 100],
    ],
  },
  {
    id: 'vulkanrasen',
    name: 'Vulkan Boost',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 2,
    theme: {
      sky: 'sunset',
      fog: '#5a2a22',
      ground: '#4a3a36',
      groundTex: 'rock',
      road: '#3a3438',
      decor: 'volcano',
      accent: '#ff7a1f',
      envPreset: 'sunset',
      ambient: 0.3,
      hemiSky: '#ff8a4a',
      hemiGround: '#2a1410',
    },
    points: [
      [0, 130], [70, 90], [130, 40], [120, -40], [60, -90],
      [-30, -120], [-110, -85], [-130, 0], [-100, 80], [-40, 120],
    ],
  },
  {
    id: 'skylinecity',
    name: 'Eis-Gipfel',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 3,
    theme: {
      sky: 'day',
      fog: '#cfe9ff',
      ground: '#eaf6ff',
      groundTex: 'ice',
      road: '#bfe0f5',
      decor: 'ice',
      accent: '#4fd0ff',
      envPreset: 'dawn',
      ambient: 0.35,
      hemiSky: '#dff1ff',
      hemiGround: '#9fc6e6',
    },
    points: [
      [0, 115], [90, 95], [120, 25], [95, -55], [35, -110],
      [-50, -110], [-110, -60], [-128, 20], [-90, 88], [-30, 108],
    ],
  },
  {
    id: 'sternenkolonie',
    name: 'Neon Galaxy',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 4,
    theme: {
      sky: 'night',
      fog: '#0c0824',
      ground: '#161033',
      groundTex: 'city',
      road: '#2a2150',
      decor: 'city',
      accent: '#b56bff',
      envPreset: 'night',
      ambient: 0.22,
      hemiSky: '#3a2a7a',
      hemiGround: '#070411',
    },
    points: [
      [0, 125], [85, 100], [128, 30], [108, -60], [40, -115],
      [-45, -120], [-120, -70], [-135, 18], [-95, 90], [-35, 115],
    ],
  },
  // --- Weitere Strecken (geteilte Themen, eigene Streckenform) ---
  {
    id: 'waldsprint',
    name: 'Wald-Sprint',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 5,
    theme: THEME_FOREST,
    points: makeLoop(136, 108, 2, 0.12, 0.35),
  },
  {
    id: 'zuckerwirbel',
    name: 'Zucker-Wirbel',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 6,
    theme: THEME_CANDY,
    points: makeLoop(104, 122, 3, 0.16, 0),
  },
  {
    id: 'lavaring',
    name: 'Lava-Ring',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 7,
    theme: THEME_VOLCANO,
    points: makeLoop(130, 128, 2, 0.14, 0.8),
  },
  {
    id: 'gletschergleiter',
    name: 'Gletscher-Gleiter',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 8,
    theme: THEME_ICE,
    points: makeLoop(122, 106, 3, 0.1, 0.4),
  },
  {
    id: 'neonkreisel',
    name: 'Neon-Kreisel',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 9,
    theme: THEME_CITY,
    points: makeLoop(114, 126, 4, 0.12, 0),
  },
  // --- Ausbau: zwei weitere Strecken je Welt. Alle mit scripts/test-tracks.ts
  // auf Selbstueberschneidung, enge Knicke und Laenge geprueft.
  {
    id: 'baumkronenkurve',
    name: 'Baumkronen-Kurve',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 10,
    theme: THEME_FOREST,
    points: makeLoop(120, 132, 3, 0.1, 1.1),
  },
  {
    id: 'moosschlucht',
    name: 'Moos-Schlucht',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 11,
    theme: THEME_FOREST,
    points: makeLoop(142, 100, 2, 0.16, 1.9),
  },
  {
    id: 'karamellkurve',
    name: 'Karamell-Kurve',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 12,
    theme: THEME_CANDY,
    points: makeLoop(126, 112, 2, 0.13, 2.4),
  },
  {
    id: 'bonbonbasar',
    name: 'Bonbon-Basar',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 13,
    theme: THEME_CANDY,
    points: makeLoop(110, 130, 4, 0.09, 0.6),
  },
  {
    id: 'ascheweg',
    name: 'Asche-Weg',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 14,
    theme: THEME_VOLCANO,
    points: makeLoop(134, 118, 3, 0.12, 2.1),
  },
  {
    id: 'kraterrand',
    name: 'Krater-Rand',
    difficulty: 'Experte',
    laps: 3,
    unlockAtLevel: 15,
    theme: THEME_VOLCANO,
    points: makeLoop(118, 136, 2, 0.15, 1.3),
  },
  {
    id: 'polarpiste',
    name: 'Polar-Piste',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 16,
    theme: THEME_ICE,
    points: makeLoop(128, 114, 4, 0.1, 1.6),
  },
  {
    id: 'frostspirale',
    name: 'Frost-Spirale',
    difficulty: 'Experte',
    laps: 3,
    unlockAtLevel: 17,
    theme: THEME_ICE,
    points: makeLoop(112, 128, 2, 0.14, 0.2),
  },
  {
    id: 'hochhaushatz',
    name: 'Hochhaus-Hatz',
    difficulty: 'Schwer',
    laps: 3,
    unlockAtLevel: 18,
    theme: THEME_CITY,
    points: makeLoop(140, 106, 3, 0.11, 2.7),
  },
  {
    id: 'mitternachtsmeile',
    name: 'Mitternachts-Meile',
    difficulty: 'Experte',
    laps: 3,
    unlockAtLevel: 19,
    theme: THEME_CITY,
    points: makeLoop(116, 134, 2, 0.16, 1.05),
  },
]

export function getTrack(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]
}

// Emoji je Welt – für Karten ohne eigenes Vorschaubild (sauberer Platzhalter).
export const DECOR_EMOJI: Record<DecorKind, string> = {
  forest: '🌲',
  candy: '🍭',
  volcano: '🌋',
  city: '🌃',
  ice: '❄️',
}

// In der Demo alle Strecken frei; sonst Level-Sperre (`unlockAtLevel`). Schalter
// zentral in `data/demo.ts`.
export function isTrackUnlocked(track: TrackDef, playerLevel: number): boolean {
  return DEMO_UNLOCK_ALL || playerLevel >= track.unlockAtLevel
}

export const ROAD_WIDTH = 16
