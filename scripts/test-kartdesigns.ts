import {
  KART_DESIGNS,
  designById,
  designStatus,
  DEFAULT_DESIGN_ID,
} from '../src/data/kartDesigns.ts'

let fails = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
  if (!cond) fails++
}

// --- Katalog-Sanity ---
{
  ok('mindestens 3 Designs', KART_DESIGNS.length >= 3)
  ok('Standard ist gratis', designById('standard').price === 0)
  ok('DEFAULT_DESIGN_ID existiert', KART_DESIGNS.some((d) => d.id === DEFAULT_DESIGN_ID))
  ok('jedes Design hat body+chassis', KART_DESIGNS.every((d) => d.body && d.chassis))
  ok('jedes Design hat Vorschau-Farben', KART_DESIGNS.every((d) => d.swatch.length >= 1))
  const ids = KART_DESIGNS.map((d) => d.id)
  ok('IDs sind eindeutig', new Set(ids).size === ids.length)
  ok('unbekannte ID fällt auf Standard zurück', designById('gibtsnicht').id === 'standard')
}

// --- Kauf-Zustände ---
{
  const gold = designById('gold') // 1200
  ok('Standard ist immer owned', designStatus(designById('standard'), 0, []) === 'owned')
  ok('gekauftes Design ist owned', designStatus(gold, 0, ['gold']) === 'owned')
  ok('genug Münzen -> buyable', designStatus(gold, 1200, []) === 'buyable')
  ok('zu wenig Münzen -> insufficient', designStatus(gold, 1199, []) === 'insufficient')
}

console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tests bestanden')
process.exit(fails ? 1 : 0)
