/**
 * Halaman web publik: kartu Wrap yang dibagikan (tanpa isi pribadi), gambar
 * kartu untuk Story/OG, pendaratan tautan undangan, dan halaman bayar tiruan
 * untuk pengembangan.
 */
import { CIRCLE_KIND_LABEL, type PublicWrapData } from '@sehari/core';
import { doodleToSvg, gardenDoodleFor, getDoodle, INK, PAPER } from '@sehari/doodles';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Services } from '../context';
import { schema } from '../db';
import { fulfillOrder } from '../routes/billing';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const LAVENDER = '#A9A4E8';
const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

/** Kartu 1080x1920 (rasio Story) bergaya taman tahunan. */
export function wrapCardSvg(d: PublicWrapData, slug: string): string {
  const W = 1080;
  const H = 1920;
  const titles: Record<string, string> = { week: 'Minggu Kita', month: 'Bulan Kita', year: 'Tahun Kita', moment: 'Kapsul Momen' };
  const title = d.chapterTitle ?? titles[d.scope] ?? 'Sehari';
  const garden = d.garden;
  const cols = d.scope === 'year' ? 19 : d.scope === 'month' ? 7 : 7;
  const cell = Math.floor(840 / cols);
  const gx = (W - cell * cols) / 2;
  const gy = 560;
  let cells = '';
  garden.forEach((sealed, i) => {
    const x = gx + (i % cols) * cell;
    const y = gy + Math.floor(i / cols) * cell;
    if (sealed) {
      const doodle = gardenDoodleFor(`${slug}:${i}`);
      const inner = doodleToSvg(doodle, { color: INK, size: cell * 0.92, strokeWidth: 2.6 })
        .replace(/^<svg[^>]*>/, '')
        .replace(/<\/svg>$/, '');
      cells += `<g transform="translate(${x + cell * 0.04} ${y + cell * 0.04}) scale(${(cell * 0.92) / 64})">${inner}</g>`;
    } else {
      cells += `<circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${Math.max(2.5, cell * 0.05)}" fill="${INK}" opacity="0.55"/>`;
    }
  });
  const rows = Math.ceil(garden.length / cols);
  const paletteY = gy + rows * cell + 80;
  const total = d.palette.reduce((a, p) => a + p.share, 0) || 1;
  let px = 120;
  const palette = d.palette
    .map((p) => {
      const w = (840 * p.share) / total;
      const r = `<rect x="${px}" y="${paletteY}" width="${Math.max(8, w - 8)}" height="56" rx="14" fill="${p.color}"/>`;
      px += w;
      return r;
    })
    .join('');
  const sprout = doodleToSvg(getDoodle('tunas'), { color: INK, size: 140 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const song = d.themeSong
    ? `<text x="${W / 2}" y="${paletteY + 170}" text-anchor="middle" font-family="${MONO}" font-size="30" fill="${LAVENDER}">lagu tema</text>
       <text x="${W / 2}" y="${paletteY + 220}" text-anchor="middle" font-family="${MONO}" font-size="38" fill="${INK}">${esc(d.themeSong.title)} — ${esc(d.themeSong.artist)}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" rx="64" fill="#EEEEF0"/>
  <g transform="translate(${W / 2 - 70} 150) scale(${140 / 64})">${sprout}</g>
  <text x="${W / 2}" y="370" text-anchor="middle" font-family="${MONO}" font-size="60" fill="${INK}">${esc(title)}</text>
  <text x="${W / 2}" y="440" text-anchor="middle" font-family="${MONO}" font-size="34" fill="${LAVENDER}">${esc(d.label)} · ${esc(CIRCLE_KIND_LABEL[d.circleKind].toLowerCase())}</text>
  ${cells}
  ${palette}
  ${song}
  <text x="120" y="${H - 150}" font-family="${MONO}" font-size="40" fill="${INK}">${d.sealedDays}<tspan fill="${LAVENDER}"> / ${d.totalDays} hari dititipkan</tspan></text>
  <text x="${W - 120}" y="${H - 150}" text-anchor="end" font-family="${MONO}" font-size="40" fill="${INK}">${d.streak > 0 ? `api ${d.streak}` : ''}</text>
  <text x="${W / 2}" y="${H - 90}" text-anchor="middle" font-family="${MONO}" font-size="26" fill="${LAVENDER}">sehari · udah nyegel hari ini?</text>
</svg>`;
}

function page(title: string, body: string, head = ''): string {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${head}
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--paper:${PAPER};--ink:${INK};--soft:${LAVENDER};--card:#EEEEF0}
@media (prefers-color-scheme:dark){:root{--paper:#000;--ink:#B9B2FF;--soft:#6B66A8;--card:#121214}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:${MONO};display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
main{max-width:460px;width:100%;text-align:center}img{width:100%;border-radius:28px}a.btn,button{display:block;width:100%;background:var(--ink);color:var(--paper);border:0;border-radius:10px;padding:16px;font:inherit;text-decoration:none;margin-top:16px;cursor:pointer}
p{line-height:1.6}.soft{color:var(--soft)}
</style></head><body><main>${body}</main></body></html>`;
}

export function webRoutes(s: Services) {
  const r = new Hono();

  r.get('/', (c) =>
    c.html(page('Sehari', `<h1>sehari</h1><p>kapsul waktu harian, diisi bersama orang yang kamu pilih.</p><p class="soft">hari ini cuma terjadi sekali. simpan bareng dia.</p><a class="btn" href="${s.cfg.appUrl}">buka aplikasi</a>`)),
  );

  r.get('/health', (c) => c.json({ ok: true, time: s.now().toISOString() }));

  r.get('/w/:slug{[a-z0-9]+\\.svg}', async (c) => {
    const slug = c.req.param('slug').replace(/\.svg$/, '');
    const [w] = await s.db.select().from(schema.publicWraps).where(and(eq(schema.publicWraps.slug, slug), isNull(schema.publicWraps.revokedAt)));
    if (!w) return c.notFound();
    return c.body(wrapCardSvg(w.data as PublicWrapData, slug), 200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' });
  });

  r.get('/w/:slug{[a-z0-9]+\\.png}', async (c) => {
    const slug = c.req.param('slug').replace(/\.png$/, '');
    const [w] = await s.db.select().from(schema.publicWraps).where(and(eq(schema.publicWraps.slug, slug), isNull(schema.publicWraps.revokedAt)));
    if (!w) return c.notFound();
    const { Resvg } = await import('@resvg/resvg-js');
    const png = new Resvg(wrapCardSvg(w.data as PublicWrapData, slug), { fitTo: { mode: 'width', value: 1080 }, font: { loadSystemFonts: true, defaultFontFamily: 'monospace' } })
      .render()
      .asPng();
    return c.body(new Uint8Array(png), 200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' });
  });

  r.get('/w/:slug', async (c) => {
    const slug = c.req.param('slug');
    const [w] = await s.db.select().from(schema.publicWraps).where(and(eq(schema.publicWraps.slug, slug), isNull(schema.publicWraps.revokedAt)));
    if (!w) return c.html(page('Sehari', '<p>Kartu ini sudah ditarik oleh pemiliknya.</p>'), 404);
    const d = w.data as PublicWrapData;
    const img = `${s.cfg.publicUrl}/w/${slug}.png`;
    const head = `<meta property="og:title" content="${esc(d.chapterTitle ?? 'Sehari')}"><meta property="og:description" content="${d.sealedDays} hari dititipkan bersama"><meta property="og:image" content="${img}"><meta name="twitter:card" content="summary_large_image">`;
    return c.html(
      page(
        d.chapterTitle ?? 'Sehari',
        `<img src="/w/${slug}.svg" alt="Kartu Wrap: ${d.sealedDays} dari ${d.totalDays} hari dititipkan"><p class="soft">isinya tetap milik lingkaran kecil mereka. yang dibagi hanya jejaknya.</p><a class="btn" href="${s.cfg.appUrl}">mulai menyimpan harimu</a>`,
        head,
      ),
    );
  });

  /** Tautan undangan: rahasia ada di fragmen (#...), yang tidak pernah sampai ke server. */
  r.get('/j/:token', (c) =>
    c.html(
      page(
        'Undangan Sehari',
        `<p>seseorang mengundangmu ke lingkaran kecilnya.</p><a class="btn" id="go" href="#">buka undangan</a>
<script>
var t=${JSON.stringify(c.req.param('token'))};var f=location.hash;
var app=${JSON.stringify(s.cfg.appUrl)}+'/j/'+t+f;
document.getElementById('go').href=app;
location.replace('sehari://j/'+t+'?k='+encodeURIComponent(f.slice(1)));setTimeout(function(){location.replace(app)},900);
</script>`,
      ),
    ),
  );

  if (s.payments.name === 'dev') {
    r.get('/dev/pay/:orderId', async (c) => {
      const [o] = await s.db.select().from(schema.orders).where(eq(schema.orders.id, c.req.param('orderId')));
      if (!o) return c.notFound();
      return c.html(
        page(
          'Bayar (mode pengembangan)',
          `<p class="soft">mode pengembangan — tidak ada uang yang berpindah.</p><h2>${esc(o.product)}</h2><p>Rp${o.amountIdr.toLocaleString('id-ID')}</p>
<form method="post" action="/dev/pay/${o.id}"><button type="submit">bayar dengan QRIS (tiruan)</button></form>`,
        ),
      );
    });
    r.post('/dev/pay/:orderId', async (c) => {
      await fulfillOrder(s, c.req.param('orderId'), `dev_${c.req.param('orderId')}`);
      return c.html(page('Terima kasih', `<p>pembayaran berhasil.</p><a class="btn" href="${s.cfg.appUrl}/aku/pesanan?status=berhasil">kembali ke aplikasi</a>`));
    });
  }

  return r;
}
