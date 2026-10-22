// Uji web app (PWA): dua orang mendaftar, membuat Duo, menulis di halaman,
// menempel foto & stiker, menyegel, lalu membuka hari bersama.
// Jalankan server (:8787) dan `npm run dev:web` (:5173) dulu.
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
const APP = process.env.APP_URL || 'http://localhost:5173';
mkdirSync('e2e/out', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const tag = Date.now().toString(36);
const errors = [];
const only = process.argv[2];

async function ctx(w = 400, h = 860) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && !/favicon|401/.test(m.text()) && errors.push(`console: ${m.text().slice(0, 240)}`));
  return p;
}
const shot = (p, n, full = false) => p.screenshot({ path: `e2e/out/web-${n}.png`, fullPage: full });



async function landing() {
  const p = await ctx(1280, 860);
  await p.goto(APP);
  await p.waitForTimeout(4200);
  await shot(p, '01-landing-desktop');
  await shot(p, '01-landing-full', true);
  const m = await ctx(390, 844);
  await m.goto(APP);
  await m.waitForTimeout(4200);
  await shot(m, '02-landing-mobile');
  await m.locator('#coba').scrollIntoViewIfNeeded();
  await m.waitForTimeout(800);
  await shot(m, '03-landing-play');
}

async function onboard(p, name, email, city) {
  await p.goto(`${APP}/masuk`);
  await p.fill('input[type=email]', email);
  await p.click('button:has-text("kirim kode")');
  // Mode produksi tidak mengembalikan kode; baca dari log email konsol (CODE_LOG).
  let code;
  if (process.env.CODE_LOG) {
    await p.waitForSelector('input[autocomplete=one-time-code]');
    const log = readFileSync(process.env.CODE_LOG, 'utf8');
    code = log.slice(log.lastIndexOf(email)).match(/(\d{6})/)[1];
  } else code = (await p.locator('text=/kode: \\d{6}/').textContent()).match(/\d{6}/)[0];
  await p.fill('input[autocomplete=one-time-code]', code);
  await p.waitForURL(/mulai\/profil/);
  await p.fill('input[placeholder^="misalnya"]', name);
  await p.fill('input[placeholder="1999"]', '1998');
  await p.fill('input[placeholder="Cari kota…"]', city);
  await p.locator(`button:has-text("${city}")`).first().click();
  await shot(p, `10-profil-${name}`);
  await p.click('button:has-text("lanjut")');
  await p.waitForURL(/mulai\/kunci/);
  await p.locator('.card .title.ink').nth(2).waitFor();
  const rows = await p.locator('.card .title.ink').allTextContents();
  const last = rows[rows.length - 1].trim().split(/\s+/).pop();
  await p.click('button:has-text("sudah kusimpan")');
  await p.fill('input[placeholder="XXXX"]', last);
  await shot(p, `10b-kunci-${name}`);
  await p.click('button:has-text("simpan kunci")');
  await p.waitForURL(/mulai\/undang/);
}

async function flow() {
  const a = await ctx();
  await onboard(a, 'Naya', `naya-${tag}@contoh.id`, 'Jakarta');
  await shot(a, '11-undang');
  await a.click('button:has-text("kirim undangan")');
  const url = (await a.locator('.sticky .tiny').textContent()).trim();
  await a.click('button:has-text("ke halaman hari ini")');
  await a.waitForURL(/\/hari$/);
  await a.waitForTimeout(800);
  await shot(a, '12-today-empty');

  // Tulis di kertas
  const page = a.locator('.page');
  const box = await page.boundingBox();
  await a.mouse.click(box.x + box.width * 0.2, box.y + box.width * 0.35);
  await a.keyboard.type('hari ini hujan, kita batal pergi.');
  await a.keyboard.press('Escape');
  await a.waitForTimeout(600);
  // Foto
  await a.setInputFiles('input[type=file][accept="image/*"]', 'e2e/foto.jpg');
  await a.waitForTimeout(1500);
  await shot(a, '12b-photo');
  // Stiker
  await a.click('.toolbar button:has-text("stiker")');
  await a.locator('.sheet button[title]').nth(3).click();
  await a.waitForTimeout(800);
  // Geser fotonya ke atas tulisan
  const photo = a.locator('.el:has(.polaroid)').first();
  const pb = await photo.boundingBox();
  await a.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await a.mouse.down();
  await a.mouse.move(pb.x + pb.width / 2 - 80, pb.y + pb.height / 2 - 60, { steps: 8 });
  await a.mouse.up();
  await a.waitForTimeout(900);
  await shot(a, '13-today-filled');

  // B bergabung
  const b = await ctx();
  await b.goto(url);
  await b.waitForTimeout(800);
  await shot(b, '20-join');
  await b.click('button:has-text("terima undangan")');
  await onboard(b, 'Bima', `bima-${tag}@contoh.id`, 'Yogyakarta');
  await b.waitForURL(/\/l\//, { timeout: 15000 });
  await b.waitForTimeout(800);
  await shot(b, '21-circle-home');
  await b.goto(`${APP}/hari`);
  await b.waitForTimeout(1200);
  const bbox = await b.locator('.page').boundingBox();
  await b.mouse.click(bbox.x + bbox.width * 0.15, bbox.y + bbox.width * 0.4);
  await b.keyboard.type('capek. tapi ada es teh gratis.');
  await b.keyboard.press('Escape');
  await b.waitForTimeout(800);

  // Segel keduanya
  for (const [p, n] of [[a, 'a'], [b, 'b']]) {
    await p.click('button:has-text("segel")');
    await p.fill('.seal-overlay input.field', n === 'a' ? 'hujan yang baik.' : 'besok lebih ringan.');
    await shot(p, `30-seal-${n}`);
    await p.focus('.hold-btn');
    await p.keyboard.press('Enter');
    await p.waitForSelector('text=selesai', { timeout: 15000 });
    await p.waitForTimeout(600);
    await shot(p, `31-sealed-${n}`);
    await p.click('.seal-overlay button:has-text("selesai")');
  }
  await a.locator('a:has-text("buka bersama")').first().click();
  await a.waitForTimeout(2600);
  await shot(a, '40-together', true);
  await a.setViewportSize({ width: 1280, height: 900 });
  await a.waitForTimeout(1200);
  await shot(a, '41-together-desktop', true);
  // Halaman lain yang butuh sesi
  for (const [path, n] of [['/lingkaran', 'lingkaran'], ['/kenangan', 'kenangan'], ['/aku', 'aku'], ['/aku/tema', 'tema'], ['/surat', 'surat'], ['/surat/tulis', 'surat-tulis']]) {
    await a.goto(APP + path);
    await a.waitForTimeout(1500);
    await shot(a, `50-${n}`);
  }
  const cid = (await b.url()).match(/\/l\/([^/]+)/)?.[1];
  void cid;
}

if (!only || only === 'landing') await landing();
if (!only || only === 'flow') await flow();
await browser.close();
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'ok, tanpa error');
