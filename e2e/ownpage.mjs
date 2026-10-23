// Uji peramban: halaman terpisah per lingkaran. Ana punya Duo dengan pacar dan
// Duo dengan teman; Duo teman diberi "halaman sendiri". Pacar hanya melihat
// halaman utama, teman hanya melihat halaman khususnya.
// Jalankan server (:8787) dan vite (:5173) dulu: node e2e/ownpage.mjs
import { chromium } from 'playwright-core';
import { keys, onboard } from './tutorial/people.mjs';
const APP = 'http://localhost:5173';
const OUT = process.env.OUT || 'e2e/out';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tag = Date.now().toString(36);
const logs = [];
async function person(name) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await c.newPage();
  p.on('pageerror', (e) => logs.push(`${name} pageerror ${e.message}`));
  p.on('response', (r) => r.url().includes('/v1/') && r.status() >= 400 && logs.push(`${name} ${r.status()} ${r.request().method()} ${r.url().replace(APP, '')}`));
  return p;
}
const join = async (p, url, name, city) => {
  await p.goto(url);
  await p.click('button:has-text("terima undangan")');
  await onboard(p, name, `${name.toLowerCase()}-${tag}@contoh.id`, city);
  await (await keys(p))();
  await p.waitForURL(/\/l\//, { timeout: 20000 });
};
const type = async (p, text) => {
  const box = await p.locator('.page').boundingBox();
  await p.mouse.click(box.x + box.width * 0.2, box.y + box.width * 0.35);
  await p.keyboard.type(text);
  await p.click('.dock-done');
  await p.waitForTimeout(1500);
};
const seal = async (p) => {
  await p.click('.dock-seal');
  await p.fill('.seal-overlay input.field', 'selesai.');
  await p.focus('.hold-btn');
  await p.keyboard.press('Enter');
  await p.waitForSelector('text=selesai', { timeout: 20000 });
  await p.click('.seal-overlay button:has-text("selesai")');
  await p.waitForTimeout(1200);
};
const circles = (p) => p.evaluate(async () => (await (await fetch('/v1/circles', { headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}` } })).json()).map((c) => c.id));

const a = await person('Ana');
await onboard(a, 'Ana', `ana-${tag}@contoh.id`, 'Jakarta');
await (await keys(a))();
await a.click('button:has-text("kirim undangan")');
const url1 = (await a.locator('.sticky .tiny').textContent()).trim();
await a.click('button:has-text("ke halaman hari ini")');
const pacar = await person('Pacar');
await join(pacar, url1, 'Bima', 'Bandung');
await a.goto(`${APP}/l/baru`);
await a.waitForTimeout(800);
await a.fill('input.field', 'Ana & Sinta');
await a.click('button:has-text("buat")');
await a.waitForSelector('button:has-text("salin tautan")');
await a.click('button:has-text("salin tautan")');
const url2 = await a.evaluate(() => navigator.clipboard.readText());
const teman = await person('Teman');
await join(teman, url2, 'Sinta', 'Surabaya');
const [d1, d2] = await circles(a);

// Nyalakan halaman sendiri untuk duo teman lewat lembar "untuk siapa".
await a.goto(`${APP}/hari`);
await a.waitForSelector('.page');
await a.waitForTimeout(1200);
await a.click('.for-chip');
await a.waitForTimeout(500);
await a.screenshot({ path: `${OUT}/own-1-sheet.png` });
await a.locator('.sheet label:has-text("Ana & Sinta") [role=switch]').click();
await a.waitForTimeout(1500);
await a.keyboard.press('Escape');
await a.waitForSelector(`[data-testid=page-tab-${d2}]`);
// Di tab teman sekarang
await a.waitForTimeout(800);
await type(a, 'curhat kerjaan untuk sinta');
await a.screenshot({ path: `${OUT}/own-2-tab-teman.png` });
await seal(a);
await a.locator('.page-tabs button:has-text("halaman utama")').click();
await a.waitForTimeout(800);
await type(a, 'cerita memalukan untuk bima');
await a.screenshot({ path: `${OUT}/own-3-utama.png` });
await seal(a);
for (const [p, cid, t] of [[pacar, d1, 'hai ana'], [teman, d2, 'halo ana']]) {
  await p.goto(`${APP}/hari`);
  await p.waitForSelector('.page');
  await p.waitForTimeout(1200);
  await type(p, t);
  await seal(p);
}
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const check = async (p, cid, want, notWant, nm) => {
  await p.goto(`${APP}/l/${cid}/hari/${day}`);
  await p.waitForTimeout(2500);
  await p.locator('.pager-tabs button:has-text("Ana")').click().catch(() => {});
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/own-4-${nm}.png` });
  const ok = (await p.locator(`text=${want}`).count()) > 0 && (await p.locator(`text=${notWant}`).count()) === 0;
  console.log(nm, ok ? `✓ hanya melihat "${want}"` : '✗ SALAH');
  if (!ok) process.exitCode = 1;
};
await check(pacar, d1, 'cerita memalukan', 'curhat kerjaan', 'pacar');
await check(teman, d2, 'curhat kerjaan', 'cerita memalukan', 'teman');
console.log(logs.length ? logs.join('\n') : 'tanpa error');
await b.close();
