// Uji regresi: satu orang dengan dua Duo. Raka menulis dan pernah memilih
// audiens sebelum Duo kedua ada; halaman harus tetap sampai ke dua Duo.
// Jalankan server (:8787) dan vite (:5173) dulu: node e2e/multiduo.mjs
import { chromium } from 'playwright-core';
import { keys, onboard } from './tutorial/people.mjs';
const APP = 'http://localhost:5173';
const OUT = process.env.OUT || 'e2e/out';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tag = Date.now().toString(36);
const logs = [];
async function person(name) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await c.newPage();
  p.on('pageerror', (e) => logs.push(`${name} pageerror ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && logs.push(`${name} console ${m.text().slice(0, 200)}`));
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
const write = async (p, text) => {
  await p.goto(`${APP}/hari`);
  await p.waitForSelector('.page');
  await p.waitForTimeout(1200);
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
};

const a = await person('Raka');
await onboard(a, 'Raka', `raka-${tag}@contoh.id`, 'Jakarta');
await (await keys(a))();
await a.click('button:has-text("kirim undangan")');
const url1 = (await a.locator('.sticky .tiny').textContent()).trim();
await a.click('button:has-text("ke halaman hari ini")');
const n = await person('Naya');
await join(n, url1, 'Naya', 'Bandung');
// Raka menulis dulu dan pernah memilih audiens, SEBELUM duo kedua ada.
await write(a, 'halaman raka untuk dua duo');
const c1 = await a.evaluate(async () => (await (await fetch('/v1/circles', { headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}` } })).json()).map((c) => c.id));
await a.evaluate((ids) => localStorage.setItem('sehari.pageCircles', JSON.stringify(ids)), c1);
// Duo kedua
await a.goto(`${APP}/l/baru`);
await a.waitForTimeout(800);
await a.fill('input.field', 'Raka & Sari');
await a.click('button:has-text("buat")');
await a.waitForURL(/\/undang/);
await a.waitForSelector('button:has-text("salin tautan")');
await a.click('button:has-text("salin tautan")');
const url2 = await a.evaluate(() => navigator.clipboard.readText());
const s = await person('Sari');
await join(s, url2, 'Sari', 'Surabaya');
console.log('circles A:', await a.evaluate(async () => (await (await fetch('/v1/circles', { headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}` } })).json()).map((c) => `${c.kind}:${c.status}:${c.members.length}`)));
await a.goto(`${APP}/hari`);
await a.waitForSelector('[data-testid=new-circle-prompt]', { timeout: 15000 });
await a.screenshot({ path: `${OUT}/a-prompt.png` });
await a.click('[data-testid=new-circle-prompt] button:has-text("ya, bagikan")');
await a.waitForTimeout(2500);
await a.screenshot({ path: `${OUT}/a-today.png` });
const myday = await a.evaluate(async () => (await (await fetch(`/v1/days/${new Date().toISOString().slice(0, 10)}`, { headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}` } })).json()));
console.log('A drops:', JSON.stringify(myday.drops?.map((d) => ({ aud: d.audience, c: d.circleIds.length }))));
await seal(a);
for (const [p, t] of [[n, 'naya di sini'], [s, 'sari di sini']]) { await write(p, t); await seal(p); }
for (const [p, nm] of [[n, 'naya'], [s, 'sari']]) {
  const cs = await p.evaluate(async () => (await (await fetch('/v1/circles', { headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}` } })).json()).map((c) => c.id));
  const day = new Date().toLocaleDateString('en-CA', { timeZone: nm === 'naya' ? 'Asia/Jakarta' : 'Asia/Jakarta' });
  await p.goto(`${APP}/l/${cs[0]}/hari/${day}`);
  await p.waitForTimeout(3000);
  await p.locator('.pager-tabs button:has-text("Raka")').click().catch((e) => logs.push('tab ' + e.message));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${nm}-together.png` });
  const seen = await p.locator('text=halaman raka').count();
  console.log(nm, seen ? '✓ melihat halaman Raka' : '✗ TIDAK melihat halaman Raka');
  if (!seen) process.exitCode = 1;
}
console.log(logs.join('\n'));
await b.close();
