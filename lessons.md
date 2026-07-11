# Lessons — KART PETS

## Reifen drehten falsch (gieren statt rollen) — 2026-07-11
**Symptom (Marcel):** Räder drehten sich um die Hochachse (links/rechts) statt zu rollen.
**Ursache:** In `ViperKart.tsx` trug die Spin-Gruppe die Quer-Orientierung `rotation={[0,0,π/2]}`
UND wurde in `KartModel.tsx` per `rotation.y` animiert. Bei Euler XYZ wird die z=90°-Orientierung
zuerst angewandt, dann Ry → effektiv Gieren um Welt-Y (Plattenteller) statt Rollen.
**Fix:** Orientierung in eine INNERE statische Gruppe verschieben, die Spin-Gruppe bleibt
orientierungsfrei und rollt sauber um X (`rotation.x`). Regel: Animations-Achse nie mit einer
festen Orientierung auf derselben Gruppe mischen — Rotation und Ausrichtung trennen (nesten).

## MeshPhysicalMaterial `transmission` ist ein Perf-Killer — 2026-07-11
Ein Glas-Material mit `transmission > 0` löst je Objekt einen KOMPLETTEN zusätzlichen
Szenen-Renderpass aus. Vier Karts mit Windschutz-Glas: 317 → 561 Draw-Calls/Bild.
**Fix:** Für Deko-Glas kein `transmission` — `transparent` + `opacity` + `clearcoat` reicht
für den Look und kostet nichts extra. Draw-Calls nach jeder Material-Änderung messen
(WebGL `drawElements`/`drawArrays` patchen, rAF-Frames zählen).
