"""Zerlegt jedes freigestellte Pet in einen Kopf-Overlay (oberer Bereich, weich
auslaufend) fuer das 2.5D-Marionetten-Rig. Der Overlay ist deckungsgleich mit dem
Vollbild -> im Frontend einfach ueberlagern. Feder-Kante am Hals verhindert Naht."""
from PIL import Image
import numpy as np
import os, json

SRC = 'public/art/pets-cut'
OUT = 'public/art/pets-parts'
os.makedirs(OUT, exist_ok=True)

# Anteil der Figurhoehe (ab Oberkante des sichtbaren Bereichs), der zum Kopf gehoert.
# Grosszuegig gewaehlt: lieber etwas Schulter mitnehmen als Kinn abschneiden.
HEAD_FRAC = {
    'drako': 0.56, 'flami': 0.44, 'fynnox': 0.40, 'lupix': 0.52, 'neko': 0.66,
    'owlio': 0.62, 'pingu': 0.52, 'pompao': 0.52, 'zippo': 0.54,
}
FEATHER = 20  # px weicher Uebergang oberhalb der Schnittlinie

meta = {}
for fn in sorted(os.listdir(SRC)):
    pid = fn[:-4]
    im = Image.open(os.path.join(SRC, fn)).convert('RGBA')
    arr = np.array(im)
    alpha = arr[:, :, 3]
    ys = np.where(alpha.max(axis=1) > 12)[0]
    top, bot = int(ys[0]), int(ys[-1])
    h = bot - top
    frac = HEAD_FRAC.get(pid, 0.5)
    cut = top + frac * h            # Schnittlinie (Hals) in Pixeln
    neck_pct = round(cut / im.height * 100, 1)  # Drehpunkt fuer CSS transform-origin

    yy = np.arange(im.height).reshape(-1, 1)
    # Kopf: sichtbar oben, blendet nach unten aus (0 ab Schnittlinie)
    head_fade = np.clip((cut - yy) / FEATHER, 0.0, 1.0)
    head = arr.copy()
    head[:, :, 3] = (alpha * head_fade).astype(np.uint8)
    Image.fromarray(head).save(os.path.join(OUT, f'{pid}-head.png'))

    # Koerper: Kopf herausgeloest, blendet nach oben aus (0 ab cut-FEATHER).
    # Ueberlappband [cut-FEATHER, cut] -> nahtloser Uebergang, keine Luecke.
    body_fade = np.clip((yy - (cut - FEATHER)) / FEATHER, 0.0, 1.0)
    body = arr.copy()
    body[:, :, 3] = (alpha * body_fade).astype(np.uint8)
    Image.fromarray(body).save(os.path.join(OUT, f'{pid}-body.png'))

    meta[pid] = {'neck': neck_pct}
    print(f'{pid}: cut@{frac} neck={neck_pct}%')

with open(os.path.join(OUT, 'meta.json'), 'w') as f:
    json.dump(meta, f, indent=2)
print('done ->', OUT)
