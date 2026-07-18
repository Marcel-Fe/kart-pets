3D-Pet-Modelle — aktuell NICHT im Spiel verwendet
=================================================

fynnox.glb      (3.4 MB) Rohfassung aus Tripo
fynnox_hd.glb   (393 KB) optimiert, Anzugfarbe von gruen auf blau korrigiert

Warum liegt das hier ungenutzt?
-------------------------------
Die Charaktere im Spiel sind Marcels gemaltes 2D-Artwork, das animiert wird
(DriverSprite in src/game/KartModel.tsx, PetPuppet in src/ui/PetPuppet.tsx).
Nur Fynnox existiert als 3D-Modell — es einzubauen wuerde ihn sichtbar von den
acht anderen Pets abheben. Die Dateien bleiben als Reserve liegen, falls die
Look-Richtung spaeter doch auf 3D wechselt.

Falls das je gebraucht wird
---------------------------
Der Renderer dafuer war src/ui/PetModel3D.tsx (Canvas + useGLTF, normalisiert
Groesse und dreht das Modell). Er liegt in der Git-History:

    git log --diff-filter=D -- src/ui/PetModel3D.tsx
    git show <commit>^:src/ui/PetModel3D.tsx

Wichtig dabei: Fynnox blickt im Modell zur Kamera. Damit er im Rennen den
Ruecken zeigt, braucht er einen Rotations-Offset von [0, Math.PI, 0].
