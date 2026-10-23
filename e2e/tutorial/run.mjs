// Rekam video tutorial: TUT_OUT=folder node e2e/tutorial/run.mjs [jumlah-bab]
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTERS } from './chapters.mjs';
import { APP, record } from './studio.mjs';

const n = Number(process.argv[2] || CHAPTERS.length);

// Pemanasan: minta Vite menyiapkan semua halaman dulu, supaya rekaman tidak
// menampilkan layar memuat saat sebuah halaman pertama kali dibuka.
async function warm({ browser }) {
  const root = 'apps/web/src/pages';
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.tsx') && files.push(path.join(d, e.name))));
  walk(root);
  const c = await browser.newContext();
  const p = await c.newPage();
  await p.goto(APP);
  await p.waitForTimeout(1500);
  for (const f of files) await p.evaluate((u) => import(u).catch(() => {}), `/${f.replace('apps/web/', '')}`);
  await c.close();
  console.log(`dipanaskan: ${files.length} halaman`);
}

await record(CHAPTERS.slice(0, n), { start: '/', before: warm });
