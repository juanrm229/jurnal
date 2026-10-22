/** Membuat aset PNG doodle untuk widget iOS (Assets.xcassets/<id>.imageset). */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { doodleToSvg, getDoodle, GARDEN_IDS } from '@sehari/doodles';

const root = path.resolve(import.meta.dirname, '../targets/widget/Assets.xcassets');
mkdirSync(root, { recursive: true });
writeFileSync(path.join(root, 'Contents.json'), JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2));
for (const id of [...GARDEN_IDS, 'tunas', 'penyiram']) {
  const dir = path.join(root, `${id}.imageset`);
  mkdirSync(dir, { recursive: true });
  const png = new Resvg(doodleToSvg(getDoodle(id), { color: '#000000', size: 192, strokeWidth: 2.6 }), { fitTo: { mode: 'width', value: 192 } }).render().asPng();
  writeFileSync(path.join(dir, `${id}.png`), png);
  writeFileSync(
    path.join(dir, 'Contents.json'),
    JSON.stringify({ images: [{ filename: `${id}.png`, idiom: 'universal' }], info: { author: 'xcode', version: 1 }, properties: { 'template-rendering-intent': 'template' } }, null, 2),
  );
}
console.log('aset widget dibuat di', root);
