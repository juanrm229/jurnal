// Uji web app (PWA): dua orang mendaftar, membuat Duo, menulis di halaman,
// menempel foto & stiker, menyegel, lalu membuka hari bersama.
// Jalankan server (:8787) dan `npm run dev:web` (:5173) dulu.
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
const APP = process.env.APP_URL || 'http://localhost:5173';
mkdirSync('e2e/out', { recursive: true });
const proxy = process.env.E2E_PROXY ? { server: process.env.E2E_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', proxy });
const tag = Date.now().toString(36);
const errors = [];
const only = process.argv[2];

async function ctx(w = 400, h = 860) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5, permissions: ['clipboard-read', 'clipboard-write'], ignoreHTTPSErrors: !!proxy });
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('response', (r) => r.status() === 404 && errors.push(`404: ${r.url()}`));
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

// MAILTM=1: pakai kotak surat sekali pakai (api.mail.tm) untuk menguji email kode sungguhan.
const MT = 'https://api.mail.tm';
async function mailtmAddress(name) {
  const dom = (await (await fetch(`${MT}/domains`)).json())['hydra:member'][0].domain;
  const address = `${name.toLowerCase()}${tag}@${dom}`;
  await fetch(`${MT}/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address, password: 'Sehari-uji-123' }) });
  return address;
}
async function mailtmCode(address) {
  const { token } = await (await fetch(`${MT}/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address, password: 'Sehari-uji-123' }) })).json();
  for (let i = 0; i < 40; i++) {
    const list = (await (await fetch(`${MT}/messages`, { headers: { authorization: `Bearer ${token}` } })).json())['hydra:member'] ?? [];
    if (list.length) {
      const m = await (await fetch(`${MT}/messages/${list[0].id}`, { headers: { authorization: `Bearer ${token}` } })).json();
      console.log(`  ✉️  email diterima dari ${m.from?.address} — "${m.subject}"`);
      return (m.text || m.intro).match(/(\d{6})/)[1];
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('email kode tidak sampai dalam 2 menit');
}

async function onboard(p, name, email, city) {
  if (process.env.MAILTM) email = await mailtmAddress(name);
  await p.goto(`${APP}/masuk`);
  await p.fill('input[type=email]', email);
  await p.click('button:has-text("kirim kode")');
  // Mode produksi tidak mengembalikan kode; baca dari log email konsol (CODE_LOG).
  let code;
  if (process.env.MAILTM) code = await mailtmCode(email);
  else if (process.env.CODE_LOG) {
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
  await a.click('.dock-done');
  await a.waitForTimeout(600);
  // Foto
  await a.setInputFiles('input[type=file][accept="image/*"]', 'e2e/foto.jpg');
  await a.waitForTimeout(1500);
  await shot(a, '12b-photo');
  // Stiker
  await a.click('.dock button:has-text("stiker")');
  await a.waitForTimeout(400);
  await shot(a, '12c-stiker');
  await a.locator('.sheet .pill:has-text("selotip")').click();
  await a.waitForTimeout(300);
  await shot(a, '12d-selotip');
  await a.locator('.sheet .sticker-cell').nth(7).click();
  await a.waitForTimeout(500);
  await a.click('.dock button:has-text("stiker")');
  await a.locator('.sheet .pill:has-text("perasaan")').click();
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
  await shot(a, '13a-today-selected');
  await a.click('.dock-done');
  await a.waitForTimeout(300);
  await shot(a, '13-today-filled');
  await a.click('.dock button:has-text("lainnya")');
  await a.waitForTimeout(400);
  await shot(a, '13b-lainnya');
  await a.keyboard.press('Escape');
  await a.click('.dock button:has-text("lainnya")');
  await a.click('.tile:has-text("kartu & pertanyaan")');
  await a.waitForTimeout(700);
  await shot(a, '14-kartu');
  await a.click('.sheet button:has-text("tarik kartu lain")');
  await a.locator('.sheet .pill:has-text("Renungan")').click();
  await a.waitForTimeout(600);
  await shot(a, '14b-kartu-dek');
  await a.keyboard.press('Escape');

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
  await b.click('.dock-done');
  await b.waitForTimeout(800);

  // Segel keduanya
  for (const [p, n] of [[a, 'a'], [b, 'b']]) {
    await p.click('.dock-seal');
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
  await shot(a, '40-together');
  await a.locator('.pager-tabs button').nth(1).click();
  await a.waitForTimeout(900);
  await shot(a, '40b-together-partner');
  // Karya: tulis esai, terbitkan ke lingkaran, dibaca & diberi catatan oleh B.
  await a.goto(`${APP}/karya`);
  await a.waitForTimeout(1200);
  await shot(a, '60-karya-kosong');
  await a.click('button:has-text("tulis karya baru")');
  await a.waitForTimeout(400);
  await shot(a, '61-karya-jenis');
  await a.click('.kind-card:has-text("esai pribadi")');
  await a.waitForSelector('.write-body');
  await a.fill('.write-title', 'Sendok yang Selalu Ikut Pindah');
  await a.fill('.write-sub', 'esai kecil tentang rumah');
  await a.click('.write-body');
  await a.keyboard.type('Setiap kali pindah, aku selalu membawa benda yang sama: sebuah sendok yang tidak pernah kupakai.\n\nIbu menyelipkannya di koper pertama, katanya supaya aku ingat makan.\n\n> rumah adalah tempat seseorang menunggumu pulang.\n\n❦\n\nSudah tiga kos, dua kota — sendok itu masih di sana.');
  await a.waitForSelector('.write-status:has-text("✓")', { timeout: 15000 });
  await shot(a, '62-karya-tulis');
  await a.click('.write-top button:has-text("terbitkan")');
  await a.waitForTimeout(400);
  await a.locator('.reader-opt').nth(1).click();
  await shot(a, '63-karya-terbit');
  await a.click('.sheet button:has-text("terbitkan")');
  await a.waitForURL(/\/karya\/w[^/]+$/, { timeout: 15000 });
  await a.waitForTimeout(1200);
  await shot(a, '64-karya-baca', true);
  await b.goto(`${APP}/karya`);
  await b.waitForTimeout(800);
  await b.click('.seg button:has-text("dari lingkaran")');
  await b.waitForTimeout(800);
  await shot(b, '65-karya-feed');
  await b.locator('.shelf-item').first().click();
  await b.waitForSelector('.prose');
  await b.click('.react-row button:has-text("kena di hati")');
  await b.fill('.notes input', 'bagian sendoknya bikin aku nangis.');
  await b.click('.notes button:has-text("kirim")');
  await b.waitForSelector('.note:has-text("sendoknya")', { timeout: 10000 });
  await shot(b, '66-karya-catatan');
  // Janji temu: acak rencana, kirim ajakan, struk, harapan, saling tandai ketemu, cerita & foto.
  await a.goto(`${APP}/janji/acak`);
  await a.waitForTimeout(800);
  await a.click('.pill:has-text("hemat")');
  await a.click('.spin-btn');
  await a.waitForTimeout(2600);
  await a.locator('.reel-lock').first().click();
  await shot(a, '70-acak');
  await a.click('button:has-text("jadikan rencana")');
  await a.waitForSelector('.plan-form');
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  await a.fill('input[type=datetime-local]', `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`);
  await a.fill('.plan-title', 'Malam Minggu Hemat');
  await shot(a, '71-janji-form', true);
  await a.click('button:has-text("kirim ajakan")');
  await a.waitForSelector('.receipt canvas.printed', { timeout: 15000 });
  await a.waitForTimeout(1600);
  await shot(a, '72-struk');
  await a.keyboard.press('Escape');
  await a.click('button:has-text("tulis harapan")');
  await a.fill('.sheet textarea', 'semoga kita ketawa sampai sakit perut.');
  await a.click('.sheet button:has-text("segel harapan")');
  await a.waitForTimeout(800);
  const meetUrl = a.url().split('?')[0];
  await b.goto(meetUrl);
  await b.waitForSelector('.ticket');
  await b.click('.seg button:has-text("ikut")');
  await b.click('button:has-text("tulis harapan")');
  await b.fill('.sheet textarea', 'semoga dia nggak telat lagi.');
  await b.click('.sheet button:has-text("segel harapan")');
  await b.waitForTimeout(600);
  await shot(b, '73-janji-b');
  await b.click('button:has-text("aku sudah sampai")');
  await b.click('button:has-text("tandai: kita ketemu")');
  await a.reload();
  await a.waitForSelector('.ticket');
  await a.click('button:has-text("kita ketemu ✓")');
  await a.waitForSelector('.stamp-big', { timeout: 10000 });
  await a.waitForTimeout(700);
  await shot(a, '74-ketemu');
  await a.click('button:has-text("tulis cerita")');
  await a.fill('.sheet input[placeholder^="judul"]', 'Hujan, Martabak, dan Payung Satu');
  await a.locator('.heart-btn').nth(4).click();
  await a.fill('.sheet textarea', 'Kamu telat sepuluh menit, tapi bawa martabak. Jadi impas.\nKita duduk di bawah tenda sampai hujannya berhenti.');
  await a.fill('.sheet input[placeholder="momen terbaik"]', 'waktu kamu salah sebut nama menu');
  await a.click('.sheet button:has-text("simpan cerita")');
  await a.waitForTimeout(800);
  await a.setInputFiles('.janji-detail input[type=file]', 'e2e/foto.jpg');
  await a.waitForSelector('.memory-polaroid img', { timeout: 15000 });
  await a.waitForTimeout(600);
  await shot(a, '75-kenangan-janji', true);
  await a.click('.ticket-actions button:has-text("struk")');
  await a.waitForSelector('.receipt canvas.printed');
  await a.waitForTimeout(1600);
  await shot(a, '76-struk-ketemu');
  await a.keyboard.press('Escape');

  // Suara: nyalakan musik & efek dari halaman aku, pastikan tidak ada galat.
  await a.goto(`${APP}/aku`);
  await a.waitForTimeout(800);
  await a.locator('label:has-text("musik latar") [role=switch]').click();
  await a.locator('label:has-text("suara mengetik") [role=switch]').click();
  await a.waitForTimeout(2500);
  console.log('  🎵 musik:', await a.evaluate(() => JSON.parse(localStorage.getItem('sehari.sound') || '{}').music));
  await shot(a, '55-suara');
  await a.locator('label:has-text("musik latar") [role=switch]').click();
  await a.goto(`${APP}/aku/profil`);
  await a.waitForTimeout(1200);
  await a.locator('.avatar-grid button').nth(5).click();
  await a.locator('.bg-dot').nth(2).click();
  await a.waitForTimeout(500);
  await shot(a, '42-avatar');
  await b.goto(`${APP}/hari/${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}`);
  await b.goto(`${APP}/hari`);
  await a.setViewportSize({ width: 1280, height: 900 });
  await a.waitForTimeout(1200);
  await shot(a, '41-together-desktop', true);
  // Halaman lain yang butuh sesi
  for (const [path, n] of [['/lingkaran', 'lingkaran'], ['/kenangan', 'kenangan'], ['/aku', 'aku'], ['/aku/tema', 'tema'], ['/surat', 'surat'], ['/surat/tulis', 'surat-tulis']]) {
    await a.goto(APP + path);
    await a.waitForTimeout(1500);
    await shot(a, `50-${n}`);
  }
  // Di server sungguhan (MAILTM), hapus lagi akun uji supaya tidak tertinggal.
  if (process.env.MAILTM) {
    for (const p of [a, b]) {
      const st = await p.evaluate(async () => {
        const t = localStorage.getItem('sehari.token');
        const r = await fetch('/v1/me?confirm=HAPUS', { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
        return r.status;
      });
      console.log(`  🧹 akun uji dihapus (${st})`);
    }
  }
}

if (!only || only === 'landing') await landing();
if (!only || only === 'flow') await flow();
await browser.close();
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'ok, tanpa error');
