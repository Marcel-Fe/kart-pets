// Baut einen Asset-Pfad relativ zum Vite-base (z. B. '/kart-pets/').
// So funktionieren Bilder/Modelle sowohl lokal ('/') als auch auf GitHub Pages ('/kart-pets/').
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
