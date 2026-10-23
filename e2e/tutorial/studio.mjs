// Studio video tutorial Sehari: merekam aplikasi asli di dalam "panggung"
// 16:9 (HP di kiri, judul bab & keterangan di kanan, jari penunjuk), sambil
// mencatat kapan tiap narasi diucapkan supaya suaranya bisa dipasang pas.
//
// Butuh server (:8787) dan vite (:5173) menyala. Narasi memakai edge-tts
// (suara id-ID) dan disimpan di cache supaya rekaman ulang tidak mengunduh lagi.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

export const APP = process.env.APP_URL || 'http://localhost:5173';
export const OUT = process.env.TUT_OUT || 'e2e/out/tutorial';
const VOICE = process.env.TUT_VOICE || 'id-ID-GadisNeural';
const NM = '/@fs/home/user/jurnal/node_modules';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Narasi ──────────────────────────────────────────────────────────────────

export function tts(text) {
  fs.mkdirSync(`${OUT}/tts`, { recursive: true });
  const key = createHash('sha1').update(`${VOICE}|${text}`).digest('hex').slice(0, 16);
  const file = `${OUT}/tts/${key}.mp3`;
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) {
    for (let i = 0; i < 4; i++) {
      try {
        const args = ['-m', 'edge_tts', '--voice', VOICE, '--rate=-4%', '--text', text, '--write-media', file];
        if (process.env.HTTPS_PROXY) args.splice(2, 0, '--proxy', process.env.HTTPS_PROXY);
        execFileSync('python3', args, { env: { ...process.env, SSL_CERT_FILE: '/root/.ccr/ca-bundle.crt' }, stdio: 'pipe', timeout: 60000 });
        if (fs.statSync(file).size > 1000) break;
      } catch (e) {
        if (i === 3) throw e;
      }
    }
  }
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
  return { file, dur };
}

// ── Panggung ────────────────────────────────────────────────────────────────

function stageHtml(chapters, start) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<link rel="stylesheet" href="${NM}/@fontsource-variable/fraunces/opsz.css">
<link rel="stylesheet" href="${NM}/@fontsource-variable/fraunces/opsz-italic.css">
<link rel="stylesheet" href="${NM}/@fontsource/literata/400.css">
<link rel="stylesheet" href="${NM}/@fontsource/literata/400-italic.css">
<link rel="stylesheet" href="${NM}/@fontsource/ibm-plex-mono/400.css">
<link rel="stylesheet" href="${NM}/@fontsource/ibm-plex-mono/500.css">
<link rel="stylesheet" href="${NM}/@fontsource/caveat/700.css">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1920px;height:1080px;overflow:hidden}
#stage{position:absolute;left:0;top:0;width:1280px;height:720px;transform:scale(1.5);transform-origin:0 0;overflow:hidden}
#stage{background:radial-gradient(1200px 700px at 20% 10%,#ffffff 0%,#eef2ff 45%,#dfe6ff 100%);font-family:"Literata",Georgia,serif;color:#1b1d3a}
.dots{position:absolute;inset:0;background-image:radial-gradient(#2a14d614 1.2px,transparent 1.3px);background-size:22px 22px;mask:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent)}
.phone{position:absolute;left:150px;top:12px;width:384px;height:696px;border-radius:46px;background:#14152b;padding:12px;box-shadow:0 30px 60px -20px #1b1d3a66,0 0 0 1px #ffffff22 inset}
.phone::before{content:"";position:absolute;top:18px;left:50%;width:84px;height:22px;margin-left:-42px;border-radius:12px;background:#14152b;z-index:3}
.screen{width:360px;height:672px;border-radius:36px;overflow:hidden;background:#fff;isolation:isolate}
.phone iframe{width:360px;height:672px;border:0;display:block}
.panel{position:absolute;left:610px;top:0;width:610px;height:720px;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:40px 0}
.brand{position:absolute;left:610px;top:34px;display:flex;align-items:center;gap:10px;font-family:"Fraunces Variable";font-style:italic;font-size:26px;color:#2a14d6}
.brand svg{width:30px;height:30px}
.kicker{font-family:"IBM Plex Mono";font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#2a14d6aa}
.title{font-family:"Fraunces Variable";font-style:italic;font-weight:500;font-size:54px;line-height:1.02;color:#2a14d6;letter-spacing:-.02em}
.cap{font-size:25px;line-height:1.5;color:#1b1d3a;min-height:150px;transition:opacity .35s,transform .35s}
.cap.out{opacity:0;transform:translateY(8px)}
.toc{position:absolute;left:610px;bottom:30px;display:flex;gap:6px;flex-wrap:wrap;width:620px}
.toc span{font-family:"IBM Plex Mono";font-size:11.5px;padding:4px 9px;border-radius:99px;background:#2a14d60f;color:#2a14d688}
.toc span.on{background:#2a14d6;color:#fff}
.toc span.done{color:#2a14d6cc}
.finger{position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:#2a14d633;border:2.5px solid #2a14d6cc;box-shadow:0 4px 12px #2a14d644;pointer-events:none;z-index:20;opacity:0;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .25s}
.finger.on{opacity:1}
.finger.press{animation:press .35s ease}
@keyframes press{50%{scale:.75;background:#2a14d677}}
.ripple{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #2a14d6;pointer-events:none;z-index:19;animation:rip .6s ease-out forwards}
@keyframes rip{to{transform:scale(3.4);opacity:0}}
.intro{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:center;padding-left:150px;background:linear-gradient(135deg,#2a14d6,#4a39e8 55%,#7b6cf2);color:#fff;transition:opacity .6s, transform .6s;}
.intro.hide{opacity:0;pointer-events:none;transform:scale(1.02)}
.intro .n{font-family:"IBM Plex Mono";font-size:20px;letter-spacing:.3em;opacity:.75}
.intro h1{font-family:"Fraunces Variable";font-style:italic;font-weight:500;font-size:92px;line-height:1;margin:14px 0 16px;letter-spacing:-.02em}
.intro p{font-size:28px;opacity:.9;max-width:900px;line-height:1.4}
.intro .hand{font-family:Caveat;font-size:40px;opacity:.85;margin-top:30px}
.intro::after{content:"";position:absolute;inset:0;background-image:radial-gradient(#ffffff22 1.5px,transparent 1.6px);background-size:26px 26px;mask:linear-gradient(90deg,transparent 40%,#000)}
</style></head><body><div id="sync" style="position:absolute;right:0;bottom:0;width:12px;height:12px;background:#000;z-index:999"></div><div id="stage">
<div class="dots"></div>
<div class="phone"><div class="screen"><iframe name="app" src="${APP}${start}" allow="clipboard-read; clipboard-write"></iframe></div></div>
<div class="brand"><svg viewBox="0 0 24 24" fill="none" stroke="#2a14d6" stroke-width="1.8" stroke-linecap="round"><path d="M12 21V11"/><path d="M12 13c-4 0-6-2.5-6-6 3.5 0 6 2 6 6Z"/><path d="M12 11c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6Z"/><path d="M7 21h10"/></svg>sehari</div>
<div class="panel"><div class="kicker" id="kicker"></div><div class="title" id="title"></div><p class="cap" id="cap"></p></div>
<div class="toc" id="toc">${chapters.map((c, i) => `<span data-i="${i}">${c.short}</span>`).join('')}</div>
<div class="finger" id="finger"></div>
<div class="intro hide" id="intro"><div class="n" id="in"></div><h1 id="it"></h1><p id="ip"></p><div class="hand" id="ih"></div></div>
<script>
const $=(id)=>document.getElementById(id);let ft;
window.studio={
  mark(){const m=document.getElementById('sync');m.style.background=m.style.background==='rgb(255, 255, 255)'?'#000':'#fff'},
  chapter(i,kicker,title){$('kicker').textContent=kicker;$('title').textContent=title;document.querySelectorAll('#toc span').forEach(s=>{const k=+s.dataset.i;s.className=k===i?'on':k<i?'done':''})},
  cap(t){const c=$('cap');c.classList.add('out');setTimeout(()=>{c.textContent=t;c.classList.remove('out')},300)},
  intro(n,t,p,h){$('in').textContent=n;$('it').textContent=t;$('ip').textContent=p||'';$('ih').textContent=h||'';$('intro').classList.remove('hide')},
  outro(){$('intro').classList.add('hide')},
  move(x,y){x/=1.5;y/=1.5;const f=$('finger');f.classList.add('on');f.style.transform='translate('+x+'px,'+y+'px)';clearTimeout(ft);ft=setTimeout(()=>f.classList.remove('on'),2200)},
  press(x,y){x/=1.5;y/=1.5;const f=$('finger');f.classList.remove('press');void f.offsetWidth;f.classList.add('press');const r=document.createElement('div');r.className='ripple';r.style.left=x+'px';r.style.top=y+'px';document.body.appendChild(r);setTimeout(()=>r.remove(),700)}
};
</script></div></body></html>`;
}

// ── Perekam ─────────────────────────────────────────────────────────────────

export async function record(chapters, { start = '/', before } = {}) {
  // Narasi dibuat dulu semua, supaya perekaman tidak menunggu jaringan.
  for (const ch of chapters) {
    ch.introVoice = tts(ch.intro);
    for (const s of ch.steps) s.voice = tts(s.say);
  }
  fs.mkdirSync(`${OUT}/raw`, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errors = [];
  const shared = { browser, errors };
  if (before) await before(shared);
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: `${OUT}/raw`, size: { width: 1920, height: 1080 } },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await ctx.route(`${APP}/__studio`, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: stageHtml(chapters, start) }));
  const page = await ctx.newPage();
  const t0 = Date.now();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/favicon|401|ERR_FILE|net::/.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  await page.goto(`${APP}/__studio`);
  await page.waitForTimeout(1500);
  const app = page.frame({ name: 'app' });
  const now = () => (Date.now() - t0) / 1000;
  const h = helpers(page, app, shared);
  const timeline = { voice: [], chapters: [], marks: [] };
  // Tiap peristiwa membalik warna penanda di pojok; perakit membaca balikan itu dari video.
  const mark = async (what) => {
    await page.evaluate(() => studio.mark());
    timeline.marks.push({ t: now(), what });
  };
  await sleep(300);
  await mark('awal');

  for (const [i, ch] of chapters.entries()) {
    const c = { id: ch.id, title: ch.title, start: now() };
    timeline.chapters.push(c);
    await mark(`bab:${ch.id}`);
    console.log(`▶ ${ch.id}`);
    await page.evaluate(([i, k, t]) => studio.chapter(i, k, t), [i, ch.kicker, ch.title]);
    await page.evaluate(([n, t, p, hh]) => studio.intro(n, t, p, hh), [ch.kicker, ch.title, ch.sub ?? '', ch.hand ?? '']);
    if (ch.setup) await ch.setup(h);
    await sleep(400);
    timeline.voice.push({ t: now(), file: ch.introVoice.file, m: timeline.marks.length });
    await mark('suara');
    await sleep(ch.introVoice.dur * 1000 + 500);
    await page.evaluate(() => studio.outro());
    await sleep(500);
    c.body = now();
    c.bodyMark = timeline.marks.length;
    await mark(`isi:${ch.id}`);
    for (const s of ch.steps) {
      await page.evaluate((t) => studio.cap(t), s.cap ?? s.say);
      await sleep(250);
      timeline.voice.push({ t: now(), file: s.voice.file, m: timeline.marks.length });
      await mark('suara');
      try {
        await Promise.all([s.run ? s.run(h) : null, sleep(s.voice.dur * 1000 + 300)]);
      } catch (e) {
        errors.push(`step "${s.say.slice(0, 40)}": ${e.message.split('\n')[0]}`);
        console.log(`  ✗ ${e.message.split('\n')[0]}`);
      }
      await sleep(s.pause ?? 250);
    }
    c.end = now();
  }
  await sleep(800);
  timeline.total = now();
  timeline.endMark = timeline.marks.length;
  await mark('akhir');
  await sleep(800);
  const video = page.video();
  await ctx.close();
  const path = await video.path();
  fs.writeFileSync(`${OUT}/timeline.json`, JSON.stringify({ video: path, ...timeline }, null, 2));
  await browser.close();
  console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'rekaman bersih, tanpa error');
  return { video: path, timeline, errors };
}

function helpers(page, app, shared) {
  const loc = (t) => (typeof t === 'string' ? app.locator(t).first() : t);
  const h = {
    page,
    app,
    shared,
    $: (sel) => app.locator(sel),
    wait: (ms) => sleep(ms),
    /** Pindah halaman di dalam aplikasi (tanpa memuat ulang); `reload` untuk data segar. */
    async go(path, { reload = false } = {}) {
      if (reload) await app.goto(`${APP}${path}`);
      else
        await app.evaluate((p) => {
          history.pushState(null, '', p);
          window.dispatchEvent(new PopStateEvent('popstate'));
          window.scrollTo({ top: 0 });
        }, path);
      await sleep(reload ? 1400 : 700);
    },
    async point(t) {
      const l = loc(t);
      await l.scrollIntoViewIfNeeded().catch(() => {});
      const b = await l.boundingBox();
      if (!b) return null;
      const x = b.x + b.width / 2;
      const y = b.y + Math.min(b.height / 2, 40);
      await page.evaluate(([x, y]) => studio.move(x, y), [x, y]);
      await sleep(480);
      return { x, y, l };
    },
    async tap(t, opts = {}) {
      const p = await h.point(t);
      if (!p) throw new Error(`tidak terlihat: ${t}`);
      await page.evaluate(([x, y]) => studio.press(x, y), [p.x, p.y]);
      await p.l.click(opts);
      await sleep(opts.after ?? 350);
    },
    async type(t, text, delay = 32) {
      await h.tap(t);
      await loc(t).pressSequentially(text, { delay });
      await sleep(250);
    },
    async fill(t, text) {
      await h.tap(t);
      await loc(t).fill(text);
    },
    /** Gulir pelan di dalam layar HP. */
    async scroll(dy, steps = 12) {
      const box = await page.locator('iframe[name=app]').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, dy / steps);
        await sleep(28);
      }
      await sleep(300);
    },
    async top() {
      await app.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await sleep(500);
    },
  };
  return h;
}
