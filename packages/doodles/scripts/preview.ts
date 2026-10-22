/**
 * Membuat preview.html berisi semua doodle + contoh "taman setahun".
 * Jalankan: npx tsx scripts/preview.ts
 */
import { DOODLES, GARDEN_IDS, INK, PAPER, doodleToSvg, gardenDoodleFor } from '../src/index';
import type { Doodle } from '../src/types';

// Paket ini sengaja tanpa @types/node (tsconfig "types": []), jadi API Node diambil lewat getBuiltinModule.
interface NodeProcess {
  getBuiltinModule(id: 'node:fs'): { writeFileSync(path: string, data: string): void };
  getBuiltinModule(id: 'node:path'): { join(...p: string[]): string; dirname(p: string): string };
  getBuiltinModule(id: 'node:url'): { fileURLToPath(u: string): string };
}
const g = globalThis as unknown as {
  process: NodeProcess;
  console: { log(...a: unknown[]): void; warn(...a: unknown[]): void };
};
const { writeFileSync } = g.process.getBuiltinModule('node:fs');
const path = g.process.getBuiltinModule('node:path');
const { fileURLToPath } = g.process.getBuiltinModule('node:url');
const log = g.console;
const here = path.dirname(fileURLToPath((import.meta as unknown as { url: string }).url));
const out = path.join(here, '..', 'preview.html');

/** Kotak pembatas kira-kira dengan menyampel kurva (hanya M/L/C/Q/Z yang dipakai). */
function bbox(paths: string[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number): void => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const d of paths) {
    const toks = d.match(/[MLCQZ]|-?\d*\.?\d+/g) ?? [];
    let i = 0;
    let cx = 0;
    let cy = 0;
    let cmd = '';
    const num = (): number => Number(toks[i++]);
    while (i < toks.length) {
      const t = toks[i]!;
      if (/[MLCQZ]/.test(t)) {
        cmd = t;
        i++;
        if (cmd === 'Z') continue;
      }
      if (cmd === 'M' || cmd === 'L') {
        cx = num();
        cy = num();
        add(cx, cy);
      } else if (cmd === 'C') {
        const a = [num(), num(), num(), num(), num(), num()] as const;
        for (let s = 1; s <= 12; s++) {
          const u = s / 12;
          const v = 1 - u;
          add(
            v * v * v * cx + 3 * v * v * u * a[0] + 3 * v * u * u * a[2] + u * u * u * a[4],
            v * v * v * cy + 3 * v * v * u * a[1] + 3 * v * u * u * a[3] + u * u * u * a[5],
          );
        }
        cx = a[4];
        cy = a[5];
      } else if (cmd === 'Q') {
        const a = [num(), num(), num(), num()] as const;
        for (let s = 1; s <= 12; s++) {
          const u = s / 12;
          const v = 1 - u;
          add(v * v * cx + 2 * v * u * a[0] + u * u * a[2], v * v * cy + 2 * v * u * a[1] + u * u * a[3]);
        }
        cx = a[2];
        cy = a[3];
      } else {
        i++;
      }
    }
  }
  return [x0, y0, x1, y1];
}

const warnings: string[] = [];
const ids = new Set<string>();
for (const d of DOODLES) {
  if (ids.has(d.id)) warnings.push(`duplikat id: ${d.id}`);
  ids.add(d.id);
  const [x0, y0, x1, y1] = bbox([...d.strokes, ...(d.fills ?? [])]);
  const lo = d.category === 'ui' ? 6 : 3.5;
  const hi = d.category === 'ui' ? 58 : 60.5;
  if (x0 < lo || y0 < lo || x1 > hi || y1 > hi)
    warnings.push(`${d.id}: keluar batas [${x0.toFixed(1)}, ${y0.toFixed(1)}, ${x1.toFixed(1)}, ${y1.toFixed(1)}]`);
}

const cats = [...new Set(DOODLES.map((d) => d.category))];
const cell = (d: Doodle): string =>
  `<figure class="cell" id="d-${d.id}"><div class="big">${doodleToSvg(d, { size: 96 })}</div>` +
  `<div class="small">${doodleToSvg(d, { size: 24, strokeWidth: 3 })}${doodleToSvg(d, { size: 40, strokeWidth: 2.6 })}</div>` +
  `<figcaption>${d.id}</figcaption></figure>`;

const sections = cats
  .map((c) => {
    const list = DOODLES.filter((d) => d.category === c);
    return `<section id="cat-${c}"><h2>${c} <small>${list.length}</small></h2><div class="grid">${list.map(cell).join('')}</div></section>`;
  })
  .join('\n');

const SEALED = 260;
const garden: string[] = [];
for (let day = 0; day < 365; day++) {
  if (day < SEALED) {
    const d = gardenDoodleFor(`lingkaran-contoh:2026:${day}`);
    garden.push(`<span class="g" title="${d.id}">${doodleToSvg(d, { size: 22, strokeWidth: 3.4 })}</span>`);
  } else garden.push('<span class="g dot"></span>');
}

const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sehari Doodles</title>
<style>
  :root { --ink: ${INK}; --paper: ${PAPER}; }
  body { margin: 0; padding: 24px; background: var(--paper); color: var(--ink); font: 14px/1.4 ui-rounded, system-ui, sans-serif; }
  h1 { margin: 0 0 4px; } h2 { margin: 28px 0 10px; text-transform: capitalize; } h2 small { opacity: .5; font-weight: 400; }
  .warn { background: #fff3; border: 1.5px dashed var(--ink); padding: 8px 12px; border-radius: 10px; white-space: pre-wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 10px; }
  .cell { margin: 0; background: #ededef; border-radius: 14px; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .big svg { display: block; outline: 1px dashed #2a14d622; }
  .small { display: flex; gap: 10px; align-items: center; }
  figcaption { font-size: 12px; opacity: .85; }
  .garden-card { width: 372px; background: #ededef; border-radius: 22px; padding: 18px 16px 22px; box-shadow: 0 1px 0 #0001; }
  .garden-card h3 { margin: 0 0 2px; font-size: 22px; } .garden-card p { margin: 0 0 12px; opacity: .6; }
  .garden { display: flex; flex-wrap: wrap; gap: 0; }
  .g { width: 22px; height: 24px; display: flex; align-items: center; justify-content: center; }
  .g svg { display: block; }
  .dot::after { content: ''; width: 3px; height: 3px; border-radius: 50%; background: var(--ink); opacity: .28; }
</style></head><body>
<h1>Sehari — doodles</h1>
<p>${DOODLES.length} doodle · ${GARDEN_IDS.length} bisa tumbuh di taman</p>
${warnings.length ? `<div class="warn">${warnings.join('\n')}</div>` : ''}
<section id="garden"><h2>Taman</h2>
  <div class="garden-card"><h3>2026</h3><p>${SEALED} hari tersegel · ${365 - SEALED} lagi</p><div class="garden">${garden.join('')}</div></div>
</section>
${sections}
</body></html>
`;

writeFileSync(out, html);
log.log(`preview → ${out} (${DOODLES.length} doodle)`);
if (warnings.length) log.warn(warnings.join('\n'));
