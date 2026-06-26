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

export const TRACKS: TrackDef[] = [
  {
    id: 'fluesterwald',
    name: 'Wald-Rallye',
    difficulty: 'Normal',
    laps: 3,
    unlockAtLevel: 1,
    theme: {
      sky: 'day',
      fog: '#cfe3ff',
      ground: '#ffffff',
      groundTex: 'grass',
      road: '#cfd2e0',
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
    points: [
      [0, 110], [95, 90], [120, 10], [70, -70], [110, -120],
      [10, -130], [-80, -95], [-125, -20], [-90, 70], [-30, 100],
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
]

export function getTrack(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]
}

export const ROAD_WIDTH = 16
