// Orang kedua (Bima) yang bermain di balik layar: menerima undangan,
// menulis & menyegel, ikut janji, ikut mau mimpi, dan mengirim surat.
import { APP, sleep } from './studio.mjs';

export async function onboard(p, name, email, city, { show, skipEmail } = {}) {
  const h = show; // kalau ada, gerakkan jari di panggung
  const tap = async (sel) => (h ? h.tap(sel) : p.locator(sel).first().click());
  const type = async (sel, t) => (h ? h.type(sel, t) : p.locator(sel).first().fill(t));
  if (!skipEmail) {
    if (!h) await p.goto(`${APP}/masuk`);
    await type('input[type=email]', email);
    await tap('button:has-text("kirim kode")');
  }
  const codeEl = p.locator('text=/kode: \\d{6}/');
  await codeEl.waitFor();
  const code = (await codeEl.textContent()).match(/\d{6}/)[0];
  // Petunjuk kode hanya ada di mode pengembangan; sembunyikan dari rekaman.
  await codeEl.evaluate((e) => (e.style.visibility = 'hidden')).catch(() => {});
  await type('input[autocomplete=one-time-code]', code);
  await p.waitForURL(/mulai\/profil/);
  await sleep(h ? 500 : 0);
  await type('input[placeholder^="misalnya"]', name);
  await type('input[placeholder="1999"]', '1998');
  await type('input[placeholder="Cari kota…"]', city);
  await tap(`button:has-text("${city}")`);
}

export async function keys(p, { show } = {}) {
  const h = show;
  const tap = async (sel) => (h ? h.tap(sel) : p.locator(sel).first().click());
  await tap('button:has-text("lanjut")');
  await p.waitForURL(/mulai\/kunci/);
  await p.locator('.card .title.ink').nth(2).waitFor();
  return async () => {
    const rows = await p.locator('.card .title.ink').allTextContents();
    const last = rows[rows.length - 1].trim().split(/\s+/).pop();
    await tap('button:has-text("sudah kusimpan")');
    if (h) await h.type('input[placeholder="XXXX"]', last, 90);
    else await p.fill('input[placeholder="XXXX"]', last);
    await tap('button:has-text("simpan kunci")');
    await p.waitForURL(/mulai\/undang/);
  };
}

export async function partner(browser, inviteUrl, tag) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  await p.goto(inviteUrl);
  await p.click('button:has-text("terima undangan")');
  await onboard(p, 'Bima', `bima-${tag}@contoh.id`, 'Yogyakarta');
  const finish = await keys(p);
  await finish();
  await p.waitForURL(/\/l\//, { timeout: 20000 });
  const api = (method, path, body) =>
    p.evaluate(
      async ([m, u, b]) => {
        const r = await fetch(`/v1${u}`, { method: m, headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}`, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
        return r.json().catch(() => null);
      },
      [method, path, body],
    );
  return {
    page: p,
    api,
    async writeAndSeal(text, line) {
      await p.goto(`${APP}/hari`);
      await p.waitForSelector('.page');
      await sleep(1200);
      const box = await p.locator('.page').boundingBox();
      await p.mouse.click(box.x + box.width * 0.18, box.y + box.width * 0.4);
      await p.keyboard.type(text);
      await p.click('.dock-done');
      await sleep(700);
      await p.setInputFiles('input[type=file][accept="image/*"]', 'e2e/tutorial/assets/kopi.jpg');
      await sleep(2500);
      await p.click('.dock-seal');
      await p.fill('.seal-overlay input.field', line);
      await p.focus('.hold-btn');
      await p.keyboard.press('Enter');
      await p.waitForSelector('text=selesai', { timeout: 20000 });
      await p.click('.seal-overlay button:has-text("selesai")');
    },
    async whenLetter(text, moment) {
      await p.goto(`${APP}/surat/tulis?kind=when`);
      await p.waitForSelector('[data-testid=letter-text]');
      await sleep(600);
      await p.locator(`.pill:has-text("${moment}")`).first().click();
      await p.fill('[data-testid=letter-text]', text);
      await p.click('[data-testid=letter-send]');
      await p.waitForSelector('[data-testid=letter-sent]');
    },
    async joinMeet(meetId) {
      await p.goto(`${APP}/janji/${meetId}`);
      await p.waitForSelector('.ticket');
      await p.click('.seg button:has-text("ikut")');
      await sleep(500);
      await p.click('button:has-text("tulis harapan")');
      await p.fill('.sheet textarea', 'semoga dia nggak telat lagi.');
      await p.click('.sheet button:has-text("segel harapan")');
      await sleep(700);
      await p.click('button:has-text("aku sudah sampai")');
      await sleep(400);
      await p.click('button:has-text("tandai: kita ketemu")');
      await sleep(800);
    },
    async likeAll(circleId) {
      const ds = await api('GET', `/circles/${circleId}/dreams`);
      for (const d of ds ?? []) if (!d.likes.length || d.likes.length < 2) await api('POST', `/dreams/${d.id}/like`);
    },
  };
}
