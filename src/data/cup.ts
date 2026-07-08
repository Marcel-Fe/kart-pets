// Der „Goldene Cup" – eine Meisterschaft über mehrere Strecken mit Punkte-Tabelle
// und einem Erzrivalen. Reine Logik/Text, keine neuen Assets.

export const CUP_TRACKS = ['fluesterwald', 'candychaos', 'vulkanrasen', 'sternenkolonie']
export const CUP_POINTS = [0, 10, 6, 3, 1] // Index = Platz (1..4)

// Erzrivale: der amtierende Champion Drako. Spielt man selbst Drako, tritt Neko an.
export function rivalId(playerId: string): string {
  return playerId === 'drako' ? 'neko' : 'drako'
}

// Kurzer Spruch des Rivalen vor jedem Rennen (index = Rennnummer, 0-basiert).
export function rivalTaunt(index: number, rivalName: string): string {
  const lines = [
    `${rivalName} grinst: „Der Goldene Cup gehört MIR. Versuch's ruhig, Neuling."`,
    `${rivalName} schnaubt: „Ein Rennen gewonnen? Zufall. Das wird sich nicht wiederholen."`,
    `${rivalName}: „Vorletztes Rennen. Du kommst trotzdem nicht an mir vorbei."`,
    `${rivalName} stößt Rauch aus: „Das FINALE. Zeig mir alles, was du hast – es reicht nicht."`,
  ]
  return lines[index] ?? lines[lines.length - 1]
}

// Abschluss-Text je nach Endplatzierung des Spielers.
export function cupOutro(playerRank: number, rivalName: string): { title: string; text: string } {
  if (playerRank === 1)
    return {
      title: '🏆 CHAMPION!',
      text: `Du hast ${rivalName} entthront und den Goldenen Cup geholt! Die ganze Werkstatt jubelt.`,
    }
  if (playerRank === 2)
    return {
      title: 'So knapp!',
      text: `Platz 2 – ${rivalName} hatte am Ende die Nase vorn. Nächste Saison holst du dir den Pokal.`,
    }
  return {
    title: 'Guter Kampf!',
    text: `Platz ${playerRank} in der Gesamtwertung. ${rivalName} lacht noch – aber du kommst wieder.`,
  }
}

// Pet-Id aus einer Renn-Ergebnis-Id ableiten (z. B. "drako-ai0" -> "drako").
export function petIdFromEntry(id: string): string {
  return id.replace(/-(p|ai\d+)$/, '')
}
