# Lessons — KART PETS

## Reifen drehten falsch (gieren statt rollen) — 2026-07-11
**Symptom (Marcel):** Räder drehten sich um die Hochachse (links/rechts) statt zu rollen.
**Ursache:** In `ViperKart.tsx` trug die Spin-Gruppe die Quer-Orientierung `rotation={[0,0,π/2]}`
UND wurde in `KartModel.tsx` per `rotation.y` animiert. Bei Euler XYZ wird die z=90°-Orientierung
zuerst angewandt, dann Ry → effektiv Gieren um Welt-Y (Plattenteller) statt Rollen.
**Fix:** Orientierung in eine INNERE statische Gruppe verschieben, die Spin-Gruppe bleibt
orientierungsfrei und rollt sauber um X (`rotation.x`). Regel: Animations-Achse nie mit einer
festen Orientierung auf derselben Gruppe mischen — Rotation und Ausrichtung trennen (nesten).

## ChromaticAberration crasht das Rennen intermittierend — 2026-07-11
Der `<ChromaticAberration>`-Effekt (@react-three/postprocessing 3.0.4) warf
sporadisch `Converting circular structure to JSON` (property `children` → Array =
ein Three-Object3D wird irgendwo `JSON.stringify`-t) und machte den 3D-Canvas
schwarz — in ~1 von 4 Rennstarts, auch im Production-Build. Symptom war schwer zu
fassen (intermittierend, Fehler maskiert die echte Ursache).
**Diagnose-Trick:** Rennen mehrfach in frischen Playwright-Kontexten starten und
`pageerror` + WebGL-Draw-Calls zählen (multi-run). So fiel auf, dass der Fehler
schon OHNE die neue Änderung auftrat → Ursache war der Chroma-Effekt, nicht der
verdächtigte Kart-Umbau. **Fix:** Effekt entfernt. Lehre: bei intermittierendem
Blank-Canvas zuerst das zuletzt hinzugefügte Postprocessing verdächtigen und per
Multi-Run gegen den Vorzustand isolieren, nicht die naheliegendste Änderung.

## Software-Render: Race-Szene ist zu schwer zum Screenshoten
Die volle Renn-Szene (Strecke + 4 Karts + GLB + Postprocessing) rendert headless
per Software so langsam, dass `page.screenshot()` mit Default-30s-Timeout scheitert.
Verlässlich sind dann NUR: (a) Draw-Calls/`pageerror` per rAF zählen (multi-run),
(b) EINEN Screenshot mit sehr langem Timeout (`timeout=120000`) und kleinem
Viewport (700×500). Die Garage (eigener PetModel3D-Canvas, ein Modell) ist dagegen
problemlos screenshotbar.

## Die Fahrphysik-Konstanten hängen aneinander — 2026-07-18
`ACCEL` von 26 auf 14.5 gesenkt (für mehr Schwung) — prompt blieb das Kart im Gras auf
**0 km/h** stehen statt nur langsamer zu werden. Ursache: `GRASS_DRAG` (22) war stillschweigend
gegen das alte `ACCEL` kalibriert. Solange `GRASS_DRAG > ACCEL`, ist die Netto-Beschleunigung
im Gras dauerhaft negativ → das Kart wird abgewürgt und kommt nie wieder heraus.
**Regel:** `GRASS_DRAG` muss immer deutlich unter `ACCEL` liegen; die Klemme auf `OFFTRACK_MAX`
macht den Ausflug ins Grüne teuer genug. Nach JEDER Änderung an `ACCEL`/`COAST`/`DRAG` die
anderen Konstanten mitmessen — `npm run test:driving` deckt genau das auf.

## Sim-Testskripte müssen `k.t` selbst pflegen — 2026-07-18
Ein KI-Testlauf gegen `updateAI` ergab 98 % Gras und 1 km/h — sah aus wie ein kaputtes Spiel,
war aber der Testaufbau. `updateAI` zielt auf `curve.pointAt(k.t + 0.025)`, aktualisiert `k.t`
aber **nicht** selbst; im Rennen macht das `updateProgress` in der RaceScene-Schleife. Ohne das
zielt die KI ewig auf denselben Punkt, kreist darum und landet im Gras.
**Regel:** In jeder Sim-Schleife außerhalb von RaceScene `k.t = curve.project(k.x, k.z).t`
setzen (oder `updateProgress` aufrufen), bevor `updateAI` läuft. Bei absurden Messwerten zuerst
den eigenen Testaufbau verdächtigen, nicht den Produktivcode.

## MeshPhysicalMaterial `transmission` ist ein Perf-Killer — 2026-07-11
Ein Glas-Material mit `transmission > 0` löst je Objekt einen KOMPLETTEN zusätzlichen
Szenen-Renderpass aus. Vier Karts mit Windschutz-Glas: 317 → 561 Draw-Calls/Bild.
**Fix:** Für Deko-Glas kein `transmission` — `transparent` + `opacity` + `clearcoat` reicht
für den Look und kostet nichts extra. Draw-Calls nach jeder Material-Änderung messen
(WebGL `drawElements`/`drawArrays` patchen, rAF-Frames zählen).
