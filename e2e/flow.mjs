import { chromium } from 'playwright-core';
const APP = 'http://localhost:8081';
import { mkdirSync } from 'node:fs';
mkdirSync('e2e/out', { recursive: true });
// Uji ujung-ke-ujung di Expo web: dua orang mendaftar, membuat Duo, mengundang,
// Drop, menyegel, lalu saling membuka kapsul. Jalankan server & web dulu.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const tag = Date.now().toString(36);
const errors = [];
async function newUser() {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1.5, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`));
  return page;
}
const t = (p, id) => p.locator(`[data-testid="${id}"]:visible`).first();
const shot = (p, n) => p.screenshot({ path: `e2e/out/flow-${n}.png` });

async function onboard(page, name, email, cityQuery, cityId) {
  await t(page, 'welcome-start').click();
  await t(page, 'age-confirm').click();
  await t(page, 'email-input').fill(email);
  await t(page, 'email-submit').click();
  const code = (await t(page, 'dev-code').textContent()).match(/\d{6}/)[0];
  await t(page, 'code-input').fill(code);
  await t(page, 'code-submit').click();
  await t(page, 'pen-name').fill(name);
  await t(page, 'birth-year').fill('1998');
  await t(page, 'city-search').fill(cityQuery);
  await t(page, `city-${cityId}`).click();
  await t(page, 'profile-save').click();
  const rows = [];
  for (const i of [0, 2, 4]) rows.push((await t(page, `recovery-row-${i}`).textContent()).trim());
  const last = rows[2].split(/\s+/)[1];
  await t(page, 'recovery-saved').click();
  await t(page, 'recovery-check').fill(last);
  await t(page, 'recovery-commit').click();
}

// Raka
const raka = await newUser();
await raka.goto(APP, { waitUntil: 'networkidle' });
await onboard(raka, 'Raka', `raka.${tag}@contoh.id`, 'yogya', 'yogyakarta');
await t(raka, 'kind-duo').click();
await t(raka, 'circle-name').fill('Raka & Naya');
await t(raka, 'invite-send').click();
await t(raka, 'invite-done').click();
await raka.waitForTimeout(800);
await shot(raka, '1-raka-today');
// ambil tautan undangan dari halaman undang
await t(raka, 'tab-lingkaran').click();
await raka.waitForTimeout(600);
const circleCard = raka.locator('[data-testid^="circle-"]:not([data-testid^="circle-card-"]):visible').first();
await circleCard.click();
await t(raka, 'invite').click();
await raka.waitForFunction(() => document.querySelector('[data-testid="invite-url"]')?.textContent?.includes('#'));
const inviteUrl = (await t(raka, 'invite-url').textContent()).trim();
console.log('invite', inviteUrl.replace(/#.*/, '#…'));
await shot(raka, '2-raka-invite');

// Naya membuka tautan (server landing → app /j/:token#frag)
const naya = await newUser();
const appInvite = inviteUrl.replace('http://localhost:8787', APP);
await naya.goto(appInvite, { waitUntil: 'networkidle' });
await naya.waitForTimeout(1500);
await shot(naya, '3-naya-invite');
await t(naya, 'accept-invite').click();
await onboard(naya, 'Naya', `naya.${tag}@contoh.id`, 'balik', 'balikpapan');
await naya.waitForTimeout(2500);
await shot(naya, '4-naya-circle');

// Raka Drop teks ke Duo
await raka.goto(`${APP}/hari-ini`, { waitUntil: 'networkidle' });
await t(raka, 'tab-drop').click();
await t(raka, 'drop-text').fill('nasi padang dekat kantor, hujan deras jam empat');
await t(raka, 'mood-hangat').click();
await t(raka, 'drop-send').click();
await raka.waitForTimeout(1200);
await shot(raka, '5-raka-after-drop');

// Naya membuka hari ini: kapsul Raka masih tertutup
await naya.goto(`${APP}/hari-ini`, { waitUntil: 'networkidle' });
await naya.waitForTimeout(1000);
const nayaCircle = naya.locator('[data-testid^="circle-card-"]:visible').first();
await nayaCircle.click();
await t(naya, 'open-today').click();
await naya.waitForTimeout(1200);
await shot(naya, '6-naya-locked');
// Naya Drop warna lalu segel dengan kalimat terakhir
await naya.goto(`${APP}/drop`, { waitUntil: 'networkidle' });
await t(naya, 'mode-mood').click();
await t(naya, 'mood-rindu').first().click();
await t(naya, 'drop-send').click();
await naya.waitForTimeout(1000);
await t(naya, 'seal-cta').click();
await t(naya, 'last-line').fill('hujan di dua kota, hari yang sama');
await t(naya, 'seal-submit').click();
await t(naya, 'seal-success').waitFor();
await naya.waitForTimeout(800);
await shot(naya, '7-naya-sealed');
const resultCard = naya.locator('[data-testid^="seal-result-"]').first();
await resultCard.click();
await naya.waitForTimeout(1500);
await shot(naya, '8-naya-opened');
const visible = await naya.getByText('nasi padang dekat kantor').count();
console.log('naya sees raka drop:', visible > 0);
if (!visible) throw new Error('Naya tidak melihat Drop Raka setelah menyegel');

// Raka segel → lihat dua sisi
await raka.goto(`${APP}/segel`, { waitUntil: 'networkidle' });
await t(raka, 'seal-submit').click();
await t(raka, 'seal-success').waitFor();
await raka.locator('[data-testid^="seal-result-"]').first().click();
await raka.waitForTimeout(1500);
await shot(raka, '9-raka-two-sides');
const seesLine = (await raka.getByText('hujan di dua kota').count()) > 0;
console.log('raka sees naya last line:', seesLine);
if (!seesLine) throw new Error('Raka tidak melihat Kalimat Terakhir Naya');
// Peluk
const hug = raka.locator('[data-testid^="react-hug-"]').first();
if (await hug.count()) { await hug.click(); await raka.waitForTimeout(800); }
await shot(raka, '10-raka-hug');
console.log(errors.filter((e) => !e.includes('useNativeDriver')).slice(0, 15).join('\n'));
await browser.close();
