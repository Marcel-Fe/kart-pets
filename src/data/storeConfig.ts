// Zentraler Store-Schalter (analog DEMO_UNLOCK_ALL). Solange `false`, ist der
// Shop komplett inaktiv – alle Buttons zeigen „bald verfügbar", genau wie bisher.
//
// Erst auf `true` setzen, wenn die App wirklich in den App-/Play-Store geht.
// Dann greifen die In-Game-Käufe (Diamanten↔Münzen, Kosmetik mit Münzen).
//
// WICHTIG: Echtgeld-Pakete (currency 'eur') bleiben auch bei STORE_LIVE=true
// deaktiviert, bis eine native Kaufabwicklung (Google Play Billing / Apple
// StoreKit über einen Wrapper wie Capacitor/TWA) angebunden ist – im reinen
// Web/PWA gibt es keine erlaubte Echtgeld-Schnittstelle. Bis dahin verdient man
// Diamanten über die Karriere (Sterne-Belohnungen).
export const STORE_LIVE = false
