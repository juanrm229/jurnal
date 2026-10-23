/**
 * Struk janji temu: kertas struk kasir yang digambar di canvas, lengkap
 * dengan tepi sobek, barcode, dan cap "KETEMU" bila kalian sudah bertemu.
 * Bisa disimpan sebagai PNG atau dibagikan.
 */
import { useEffect, useRef, useState } from 'react';
import { download, fmtWhen, type OpenMeet } from '@/lib/meets';
import { Doodle, useToast } from '@/ui/kit';

export interface ReceiptData {
  no: string;
  title: string;
  when: string;
  place: string;
  address?: string;
  lines: { label: string; value: string }[];
  people: string[];
  metAt?: string | null;
  circle: string;
}

export function receiptFrom(m: OpenMeet, names: string[], circle: string): ReceiptData {
  const p = m.plan!;
  const lines = [
    p.activity && { label: p.activity, value: '♥' },
    p.food && { label: `makan: ${p.food}`, value: 'kenyang' },
    p.dress && { label: `dresscode: ${p.dress}`, value: 'gaya' },
    p.challenge && { label: `misi: ${p.challenge}`, value: '✓' },
    p.question && { label: `obrolan: ${p.question}`, value: '∞' },
    p.budget && { label: `budget: ${p.budget}`, value: 'aman' },
  ].filter(Boolean) as ReceiptData['lines'];
  const met = m.wire.members.filter((x) => x.metAt).map((x) => x.metAt!).sort()[1] ?? null;
  return {
    no: m.wire.id.slice(-6).toUpperCase(),
    title: p.title,
    when: fmtWhen(m.wire.startsAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    place: p.place.name,
    address: p.place.address,
    lines,
    people: names,
    metAt: met,
    circle,
  };
}

const W = 720;

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export async function drawReceipt(canvas: HTMLCanvasElement, d: ReceiptData, ink: string) {
  await document.fonts?.ready;
  // Canvas hanya memakai huruf yang sudah dimuat — muat dulu secara eksplisit.
  await Promise.all(['700 44px "Caveat"', '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"'].map((f) => document.fonts?.load(f).catch(() => null)));
  const mono = (px: number, weight = 400) => `${weight} ${px}px "IBM Plex Mono", ui-monospace, monospace`;
  const hand = (px: number) => `700 ${px}px "Caveat", cursive`;
  const scale = 2;
  // Ukur tinggi dulu.
  const meas = document.createElement('canvas').getContext('2d')!;
  meas.font = mono(22);
  const pad = 56;
  const inner = W - pad * 2;
  let lineCount = 0;
  for (const l of d.lines) lineCount += wrap(meas, l.label, inner - 120).length;
  const addrLines = d.address ? wrap(meas, d.address, inner - 140).length : 0;
  const placeLines = wrap(meas, d.place, inner - 140).length;
  const H = 820 + lineCount * 34 + (placeLines + addrLines) * 32 + (d.metAt ? 40 : 0);
  canvas.width = W * scale;
  canvas.height = H * scale;
  canvas.style.aspectRatio = `${W} / ${H}`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, W, H);

  // Kertas dengan tepi sobek atas & bawah.
  const tooth = 14;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, tooth);
  for (let x = 0; x <= W; x += tooth * 2) {
    ctx.lineTo(x + tooth, 0);
    ctx.lineTo(x + tooth * 2, tooth);
  }
  ctx.lineTo(W, H - tooth);
  for (let x = W; x >= 0; x -= tooth * 2) {
    ctx.lineTo(x - tooth, H);
    ctx.lineTo(x - tooth * 2, H - tooth);
  }
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fdfcf8');
  g.addColorStop(1, '#f4f1e8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.shadowColor = 'transparent';
  // Butir kertas.
  const rnd = (() => {
    let s = hash(d.no);
    return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0) % 10000) / 10000;
  })();
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(60,50,30,${rnd() * 0.05})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
  }

  const text = (t: string, x: number, y: number, font: string, align: CanvasTextAlign = 'left', color = '#1d1c22') => {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  };
  const dash = (y: number) => {
    ctx.strokeStyle = 'rgba(30,30,40,0.55)';
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  let y = 86;
  text('✦  S E H A R I  ✦', W / 2, y, mono(26, 600), 'center', ink);
  y += 40;
  text('STRUK JANJI TEMU', W / 2, y, mono(20, 500), 'center');
  y += 30;
  text(d.circle.toLowerCase(), W / 2, y, mono(17), 'center', '#6b6a73');
  y += 40;
  text(`No. #${d.no}`, pad, y, mono(18));
  text(new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()), W - pad, y, mono(18), 'right');
  y += 26;
  dash(y);
  y += 40;
  // Judul janji dengan tulisan tangan.
  ctx.font = hand(44);
  for (const ln of wrap(ctx, d.title, inner)) {
    text(ln, W / 2, y, hand(44), 'center', ink);
    y += 46;
  }
  y += 6;
  text('KAPAN', pad, y, mono(18, 600));
  text(d.when, W - pad, y, mono(18), 'right');
  y += 34;
  text('DI MANA', pad, y, mono(18, 600));
  ctx.font = mono(18);
  for (const ln of wrap(ctx, d.place, inner - 140)) {
    text(ln, W - pad, y, mono(18), 'right');
    y += 30;
  }
  if (d.address) {
    for (const ln of wrap(ctx, d.address, inner - 140)) {
      text(ln, W - pad, y, mono(15), 'right', '#6b6a73');
      y += 28;
    }
  }
  y += 6;
  dash(y);
  y += 40;
  ctx.font = mono(20);
  for (const l of d.lines) {
    const parts = wrap(ctx, l.label, inner - 120);
    parts.forEach((p, i) => {
      text(i === 0 ? `1x ${p}` : `   ${p}`, pad, y, mono(20));
      if (i === 0) text(l.value, W - pad, y, mono(20), 'right');
      y += 34;
    });
  }
  y += 4;
  dash(y);
  y += 40;
  text('YANG DATANG', pad, y, mono(18, 600));
  text(d.people.join(' & ') || '—', W - pad, y, mono(18), 'right');
  y += 34;
  text('SUBTOTAL', pad, y, mono(18));
  text('rindu', W - pad, y, mono(18), 'right');
  y += 30;
  text('DISKON', pad, y, mono(18));
  text('jarak 100%', W - pad, y, mono(18), 'right');
  y += 30;
  text('PAJAK', pad, y, mono(18));
  text('peluk 11%', W - pad, y, mono(18), 'right');
  y += 40;
  text('TOTAL', pad, y, mono(26, 600));
  text('tak ternilai', W - pad, y, mono(26, 600), 'right', ink);
  y += 26;
  dash(y);
  y += 30;

  // Barcode semu dari nomor struk.
  const barcodeY = y;
  const bx = pad + 40;
  const bw = inner - 80;
  let x = bx;
  const bars = hash(d.no + d.title);
  let k = bars;
  while (x < bx + bw) {
    k = Math.imul(k ^ (k >>> 13), 1274126177) >>> 0;
    const wbar = 1.5 + (k % 4);
    if (k % 3) {
      ctx.fillStyle = '#1d1c22';
      ctx.fillRect(x, y, wbar, 74);
    }
    x += wbar + 2;
  }
  y += 98;
  text(`*${d.no}-${hash(d.title).toString(36).slice(0, 6).toUpperCase()}*`, W / 2, y, mono(15), 'center', '#6b6a73');
  y += 44;
  text('simpan struk ini.', W / 2, y, hand(34), 'center', ink);
  y += 34;
  text('bisa ditukar dengan satu pelukan.', W / 2, y, hand(34), 'center', ink);
  y += 44;
  text('— terima kasih sudah datang —', W / 2, y, mono(16), 'center', '#6b6a73');

  // Cap "KETEMU" bila keduanya sudah menandai.
  if (d.metAt) {
    ctx.save();
    ctx.translate(W - 210, barcodeY + 30);
    ctx.rotate(-0.2);
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = '#c0392b';
    ctx.fillStyle = '#c0392b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-120, -52, 240, 104, 16);
    ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-110, -42, 220, 84, 10);
    ctx.stroke();
    ctx.font = mono(42, 700);
    ctx.textAlign = 'center';
    ctx.fillText('KETEMU', 0, 8);
    ctx.font = mono(15, 600);
    ctx.fillText(new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d.metAt)).toUpperCase(), 0, 32);
    ctx.restore();
  }
  ctx.restore();
}

export function ReceiptView({ data }: { data: ReceiptData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const toast = useToast();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    void drawReceipt(ref.current!, data, ink.startsWith('color-mix') || !ink ? '#2A14D6' : ink).then(() => setReady(true));
  }, [data]);

  const blob = () => new Promise<Blob>((r) => ref.current!.toBlob((b) => r(b!), 'image/png'));
  const name = `struk-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`;

  return (
    <div className="receipt">
      <div className="receipt-paper">
        <canvas ref={ref} className={ready ? 'printed' : ''} />
      </div>
      <div className="row mt">
        <button className="btn soft grow" data-sound="chime" onClick={async () => download(name, await blob())}>
          <Doodle id="ui-unduh" size={20} color="currentColor" /> simpan gambar
        </button>
        <button
          className="btn grow"
          onClick={async () => {
            const file = new File([await blob()], name, { type: 'image/png' });
            const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
            if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: data.title }).catch(() => {});
            else {
              download(name, file);
              toast('Struk disimpan — tinggal kirim ke dia.');
            }
          }}>
          <Doodle id="ui-bagikan" size={20} color="currentColor" /> bagikan
        </button>
      </div>
    </div>
  );
}
