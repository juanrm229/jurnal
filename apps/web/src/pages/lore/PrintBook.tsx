/**
 * Cetak buku "Tahun Kita": pilih sampul → alamat → pesan → persetujuan
 * eksplisit → buku disusun di peramban (dialog cetak → simpan PDF) → dikirim
 * ke percetakan. Di deployment ini cetak gratis, jadi harga tidak ditampilkan.
 */
import {
  type ChapterWire,
  type CheckoutResult,
  type DropWire,
  formatClock,
  formatDayLong,
  formatMonth,
  type Genre,
  type Keyring,
  monthKey,
  openEnvelope,
  type OrderWire,
  type Product,
  type VolumeWire,
} from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, openDrop, useKeyring } from '@/lib/data';
import { store } from '@/lib/storage';
import { Doodle, Growing, Sheet, Toggle } from '@/ui/kit';
import { Btn, ErrLine, errorText, genreById, nameIn } from './board';

type Step = 'choose' | 'ship' | 'paying' | 'consent' | 'making' | 'web' | 'done';

export interface BookOrderRef {
  orderId: string;
  circleId: string;
  year: number;
}

/**
 * Pasangan pesanan→jilid juga disimpan di perangkat ini supaya pesanan yang
 * sudah dibayar bisa dilanjutkan (server lama tidak mengirim lingkaran & tahun).
 */
const ORDERS_KEY = 'board.bookOrders';
export async function bookOrderRefs(): Promise<BookOrderRef[]> {
  return store.json<BookOrderRef[]>(ORDERS_KEY) ?? [];
}
function rememberOrder(ref: BookOrderRef) {
  const list = store.json<BookOrderRef[]>(ORDERS_KEY) ?? [];
  store.set(ORDERS_KEY, JSON.stringify([...list.filter((x) => x.orderId !== ref.orderId), ref]));
}

export function useBookOrders(poll = false) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<OrderWire[]>('/billing/orders'),
    refetchInterval: poll ? 3000 : false,
    select: (o) => o.filter((x) => x.product.startsWith('book_')),
  });
}

export function PrintBook({ circle, year, meId, resumeOrderId, onClose }: { circle: CircleView; year: number; meId: string; resumeOrderId?: string; onClose: () => void }) {
  const ring = useKeyring();
  const [step, setStep] = useState<Step>(resumeOrderId ? 'consent' : 'choose');
  const [product, setProduct] = useState<Product | null>(null);
  const [ship, setShip] = useState({ name: '', phone: '', address: '', city: '', postalCode: '' });
  const [orderId, setOrderId] = useState<string | null>(resumeOrderId ?? null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get<Product[]>('/billing/products'), select: (p) => p.filter((x) => x.kind === 'book') });
  const orders = useBookOrders(step === 'paying');
  const order = orders.data?.find((o) => o.id === orderId);

  useEffect(() => {
    if (step === 'paying' && order?.status === 'paid') setStep(order.bookStatus === 'awaiting_file' || !order.bookStatus ? 'consent' : 'done');
  }, [step, order?.status, order?.bookStatus]);

  const shipOk = !!(ship.name.trim() && ship.phone.trim().length >= 8 && ship.address.trim().length >= 10 && ship.city.trim() && /^\d{5}$/.test(ship.postalCode.trim()));

  const buildHtml = async () => {
    if (!ring) throw new Error('Kunci belum siap di perangkat ini.');
    const book = await collectBook(circle, year, ring, meId);
    return buildBookHtml(book);
  };

  const showPreview = async () => {
    setPreviewing(true);
    setErr(null);
    try {
      setPreview(html ?? (await buildHtml()));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setPreviewing(false);
    }
  };

  const checkout = async () => {
    if (!product) return;
    setBusy(true);
    setErr(null);
    // Buka tab lebih dulu (masih dalam gestur klik) supaya tidak diblokir peramban.
    const tab = window.open('about:blank', '_blank');
    try {
      const r = await api.post<CheckoutResult>('/billing/checkout', {
        product: product.code,
        circleId: circle.id,
        year,
        shipping: { name: ship.name.trim(), phone: ship.phone.trim(), address: ship.address.trim(), city: ship.city.trim(), postalCode: ship.postalCode.trim() },
        method: 'qris',
      });
      setOrderId(r.orderId);
      rememberOrder({ orderId: r.orderId, circleId: circle.id, year });
      if (r.status === 'paid') {
        tab?.close();
        setStep('consent');
      } else {
        setStep('paying');
        if (tab) tab.location.href = r.paymentUrl;
        else window.open(r.paymentUrl, '_blank');
      }
      void orders.refetch();
    } catch (e) {
      tab?.close();
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (bytes: Uint8Array) => {
    await api.upload(`/billing/orders/${orderId}/book-file?consent=1`, bytes, 'application/pdf');
    void orders.refetch();
    setStep('done');
  };

  const make = async () => {
    if (!ring || !orderId) return;
    setBusy(true);
    setErr(null);
    setStep('making');
    try {
      const doc = await buildHtml();
      setHtml(doc);
      // Peramban tidak bisa membuat PDF sendiri: buka dialog cetak untuk HTML buku ini.
      printHtml(doc);
      setStep('web');
    } catch (e) {
      setErr(errorText(e));
      setStep('consent');
    } finally {
      setBusy(false);
    }
  };

  const pickPdf = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setBusy(true);
      setErr(null);
      try {
        await upload(new Uint8Array(await f.arrayBuffer()));
      } catch (e) {
        setErr(errorText(e));
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const title = `${circle.name} · ${year}`;
  const STEPS: Step[] = ['choose', 'ship', 'consent', 'web', 'done'];
  const at = Math.max(0, STEPS.indexOf(step === 'paying' ? 'ship' : step === 'making' ? 'web' : step));

  return (
    <div className="card col lore-print">
      <div className="row" style={{ gap: 12 }}>
        <Doodle id="ui-cetak" size={34} draw />
        <div className="grow">
          <div className="h2">cetak buku</div>
          <div className="tiny soft">{title}</div>
        </div>
        <button className="btn ghost sm auto" onClick={() => void showPreview()} disabled={previewing || !ring}>
          {previewing ? 'menyusun…' : 'pratinjau'}
        </button>
      </div>
      <div className="lore-steps" aria-hidden>
        {['sampul', 'alamat', 'setuju', 'berkas', 'selesai'].map((s, i) => (
          <span key={s} className={i <= at ? 'on' : ''}>
            {s}
          </span>
        ))}
      </div>

      {step === 'choose' ? (
        products.isLoading ? (
          <Growing />
        ) : (
          <>
            <div className="row wrap" style={{ gap: 10 }}>
              {(products.data ?? []).map((p) => {
                const on = product?.code === p.code;
                const hard = p.code === 'book_hardcover';
                return (
                  <button key={p.code} className={`lore-choice lore-book-opt ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setProduct(p)}>
                    <span className={`lore-mini-book ${hard ? 'hard' : ''}`}>
                      <Doodle id={hard ? 'buku' : 'buku-terbuka'} size={30} />
                    </span>
                    <span className="grow" style={{ textAlign: 'left' }}>
                      <span className="ink" style={{ display: 'block' }}>{hard ? 'hardcover' : 'sampul lunak'}</span>
                      <span className="tiny soft">{p.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Btn disabled={!product} onClick={() => setStep('ship')}>
              lanjut ke alamat
            </Btn>
          </>
        )
      ) : null}

      {step === 'ship' ? (
        <>
          <label className="col gap-sm">
            <span className="label">nama penerima</span>
            <input className="field" value={ship.name} autoComplete="name" onChange={(e) => setShip({ ...ship, name: e.target.value })} />
          </label>
          <label className="col gap-sm">
            <span className="label">nomor hp</span>
            <input className="field" type="tel" inputMode="tel" autoComplete="tel" value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} />
          </label>
          <label className="col gap-sm">
            <span className="label">alamat</span>
            <textarea className="field" style={{ minHeight: 80 }} autoComplete="street-address" value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} />
          </label>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label className="col gap-sm grow">
              <span className="label">kota</span>
              <input className="field" value={ship.city} autoComplete="address-level2" onChange={(e) => setShip({ ...ship, city: e.target.value })} />
            </label>
            <label className="col gap-sm" style={{ width: 120 }}>
              <span className="label">kode pos</span>
              <input className="field" inputMode="numeric" autoComplete="postal-code" value={ship.postalCode} onChange={(e) => setShip({ ...ship, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })} />
            </label>
          </div>
          <p className="tiny soft" style={{ margin: 0 }}>Alamat dipakai untuk pengiriman saja.</p>
          <Btn disabled={!shipOk} loading={busy} onClick={() => void checkout()} icon="kado">
            pesan bukunya
          </Btn>
          <Btn kind="ghost" className="sm" onClick={() => setStep('choose')}>
            kembali
          </Btn>
        </>
      ) : null}

      {step === 'paying' ? (
        <div className="col center" style={{ alignItems: 'center' }}>
          <Growing label="menunggu konfirmasi pesanan…" />
          <p className="small soft center" style={{ margin: 0 }}>Selesaikan konfirmasi di tab yang terbuka. Layar ini lanjut sendiri setelah pesanan diterima.</p>
          <Btn kind="ghost" className="sm auto" onClick={() => void orders.refetch()}>
            sudah? cek lagi
          </Btn>
        </div>
      ) : null}

      {step === 'consent' ? (
        <div className="col">
          <div className="sticky" style={{ background: 'var(--sticky-peach)', transform: 'rotate(-0.6deg)' }}>
            <div className="h2" style={{ color: 'inherit' }}>sebelum dikirim ke percetakan</div>
            <p className="small" style={{ margin: '6px 0' }}>Isi buku akan dibaca percetakan. Bagian ini tidak lagi end-to-end.</p>
            <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Buku disusun di perangkatmu dari isi yang sudah dibuka di sini.</li>
              <li>Isinya termasuk tulisan anggota lain di jilid ini. Pastikan mereka setuju.</li>
              <li>Drop “hanya aku” dan Ruang Hening tidak ikut dicetak. Catatan kaki hanya ikut bila pemiliknya memilih “ikut cetak”.</li>
            </ul>
          </div>
          <Toggle label="aku mengerti dan setuju" value={agree} onChange={setAgree} />
          <Btn disabled={!agree || !ring} loading={busy} onClick={() => void make()}>
            susun buku & kirim
          </Btn>
        </div>
      ) : null}

      {step === 'making' ? <Growing label="menyusun halaman demi halaman…" /> : null}

      {step === 'web' ? (
        <div className="col">
          <p className="small" style={{ margin: 0 }}>
            Dialog cetak sudah dibuka untuk isi buku ini. Pilih <b>“Simpan sebagai PDF”</b>, lalu unggah berkasnya di sini supaya sampai di percetakan.
          </p>
          <Btn kind="soft" icon="ui-cetak" onClick={() => html && printHtml(html)}>
            buka dialog cetak lagi
          </Btn>
          <Btn loading={busy} icon="ui-unduh" onClick={pickPdf}>
            unggah PDF yang sudah disimpan
          </Btn>
        </div>
      ) : null}

      {step === 'done' ? (
        <div className="col center" style={{ alignItems: 'center', gap: 6 }}>
          <Doodle id="kado" size={56} draw />
          <div className="h2 center">berkasnya sudah sampai di percetakan</div>
          <p className="small soft center" style={{ margin: 0 }}>Jilid ini sedang dicetak. Kabar pengirimannya ada di daftar pesanan.</p>
        </div>
      ) : null}

      <ErrLine>{err}</ErrLine>
      {step !== 'making' ? (
        <Btn kind="ghost" className="sm" onClick={onClose}>
          {step === 'done' ? 'tutup' : 'batal'}
        </Btn>
      ) : null}

      <Sheet open={!!preview} onClose={() => setPreview(null)} title="pratinjau buku">
        {preview ? <iframe title="pratinjau buku" srcDoc={preview} className="lore-preview" sandbox="allow-same-origin" /> : null}
        <p className="tiny soft center">ukuran A5 · tampilan di sini hanya perkiraan</p>
      </Sheet>
    </div>
  );
}

function printHtml(html: string) {
  const frame = document.createElement('iframe');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => frame.remove(), 60_000);
    }
  }, 400);
}

// ── Isi buku ────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const KIND_NOTE: Partial<Record<string, string>> = {
  photo: 'foto',
  screenshot: 'tangkapan layar',
  video: 'video',
  voice: 'voice note',
  song: 'lagu',
  mood: 'warna hari ini',
};

export interface BookEntry {
  author: string;
  time: string;
  kind: string;
  text: string;
  note?: string;
  footnotes: string[];
}

export interface BookInput {
  circleName: string;
  year: number;
  genre?: Genre;
  members: string[];
  chapters: Record<string, string>;
  days: { day: string; entries: BookEntry[]; lastLines: { author: string; text: string }[] }[];
}

/** Ambil & buka semua yang dibutuhkan buku satu jilid. */
export async function collectBook(circle: CircleView, year: number, ring: Keyring, meId: string): Promise<BookInput> {
  const [range, chapters, volumes] = await Promise.all([
    api.get<{ drops: DropWire[] }>(`/circles/${circle.id}/drops?from=${year}-01-01&to=${year}-12-31`),
    api.get<ChapterWire[]>(`/circles/${circle.id}/chapters`),
    api.get<VolumeWire[]>(`/circles/${circle.id}/volumes`),
  ]);
  const name = (u: string) => (u === meId ? (circle.me?.penName ?? 'aku') : nameIn(circle, u, meId));
  const byDay = new Map<string, BookInput['days'][number]>();
  const opened = range.drops
    .filter((w) => w.kind !== 'silent' && w.kind !== 'auto' && w.audience !== 'self')
    .map((w) => openDrop(w, ring))
    .filter((d) => d.payload)
    .sort((a, b) => (a.wire.day < b.wire.day ? -1 : a.wire.day > b.wire.day ? 1 : a.payload!.hour * 60 + a.payload!.minute - (b.payload!.hour * 60 + b.payload!.minute)));
  for (const d of opened) {
    const p = d.payload!;
    const day = byDay.get(d.wire.day) ?? byDay.set(d.wire.day, { day: d.wire.day, entries: [], lastLines: [] }).get(d.wire.day)!;
    if (d.wire.kind === 'last_line') {
      if (p.text) day.lastLines.push({ author: name(d.wire.authorId), text: p.text });
      continue;
    }
    const footnotes = d.wire.footnotes
      .filter((f) => f.includeInPrint)
      .map((f) => {
        try {
          return `${name(f.authorId)}: ${openEnvelope<{ text: string }>(f.envelope as never, ring).text}`;
        } catch {
          return '';
        }
      })
      .filter(Boolean);
    const note = p.song ? `${p.song.title} — ${p.song.artist}` : KIND_NOTE[d.wire.kind];
    if (!p.text && !note) continue;
    day.entries.push({ author: name(d.wire.authorId), time: formatClock(p.hour, p.minute), kind: d.wire.kind, text: p.text ?? '', note, footnotes });
  }
  const titles: Record<string, string> = {};
  for (const ch of chapters) if (ch.titleEnc && ch.month.startsWith(`${year}-`)) titles[ch.month] = openCircleText(circle, ch.titleEnc, '');
  return {
    circleName: circle.name,
    year,
    genre: genreById(volumes.find((v) => v.year === year)?.genreId),
    members: circle.members.filter((m) => m.state !== 'left').map((m) => m.penName),
    chapters: titles,
    days: [...byDay.values()],
  };
}

/** Warna tinta buku mengikuti tema pengguna saat ini. */
function themeInk(): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    return /^#[0-9a-f]{3,8}$/i.test(v) ? v : '#2A14D6';
  } catch {
    return '#2A14D6';
  }
}

export function buildBookHtml(b: BookInput): string {
  const ink = themeInk();
  const months = new Map<string, BookInput['days']>();
  for (const d of b.days) (months.get(monthKey(d.day)) ?? months.set(monthKey(d.day), []).get(monthKey(d.day))!).push(d);
  const allLines = b.days.flatMap((d) => d.lastLines.map((l) => ({ ...l, day: d.day })));
  let fn = 0;
  const notes: string[] = [];

  const chaptersHtml = [...months.entries()]
    .map(([m, days]) => {
      const title = b.chapters[m];
      const daysHtml = days
        .map((d) => {
          const entries = d.entries
            .map((e) => {
              const refs = e.footnotes.map((t) => {
                fn++;
                notes.push(`<li value="${fn}">${esc(t)}</li>`);
                return `<sup>${fn}</sup>`;
              });
              return `<div class="entry"><div class="meta">${esc(e.author)} · ${esc(e.time)}${e.note ? ` · <em>${esc(e.note)}</em>` : ''}</div>${e.text ? `<p>${esc(e.text)}${refs.join('')}</p>` : refs.join('')}</div>`;
            })
            .join('');
          const lines = d.lastLines.map((l) => `<p class="last">${esc(l.text)} <span>— ${esc(l.author)}</span></p>`).join('');
          return `<section class="day"><h3>${esc(formatDayLong(d.day))}</h3>${entries}${lines}</section>`;
        })
        .join('');
      return `<article class="chapter"><div class="ch-label">Bab · ${esc(formatMonth(m))}</div><h2>${esc(title || formatMonth(m))}</h2>${daysHtml}</article>`;
    })
    .join('');

  const toc = [...months.keys()].map((m) => `<li><span>${esc(formatMonth(m))}</span> ${esc(b.chapters[m] || '')}</li>`).join('');
  const poem = allLines.length ? `<article class="chapter poem"><h2>Kalimat Terakhir</h2><div class="ch-label">puisi panjang yang ditulis tanpa sadar</div>${allLines.map((l) => `<p class="last">${esc(l.text)}</p>`).join('')}</article>` : '';

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(b.circleName)} · ${b.year}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
@page { size: A5; margin: 18mm 15mm; }
body { font-family: 'IBM Plex Mono', 'Courier New', monospace; color: #16161A; font-size: 10.5pt; line-height: 1.55; background: #fff; }
.cover { height: 170mm; display: flex; flex-direction: column; justify-content: center; text-align: center; page-break-after: always; border: 1px solid ${ink}; padding: 12mm; }
.cover h1 { font-size: 24pt; color: ${ink}; margin: 0 0 6mm; font-weight: 400; }
.cover .genre { font-style: italic; }
.toc { page-break-after: always; } .toc li { margin: 2mm 0; list-style: none; } .toc span { display: inline-block; width: 38mm; color: #6E6E78; }
.chapter { page-break-before: always; }
.ch-label { color: #6E6E78; font-size: 8.5pt; letter-spacing: 1px; text-transform: lowercase; }
h2 { font-weight: 400; font-size: 17pt; color: ${ink}; margin: 2mm 0 8mm; }
h3 { font-size: 10pt; font-weight: 500; border-bottom: 0.5px solid color-mix(in srgb, ${ink} 40%, #fff); padding-bottom: 1mm; margin: 7mm 0 3mm; }
.day { page-break-inside: avoid; }
.entry { margin: 0 0 3mm; } .entry p { margin: 1mm 0 0; white-space: pre-wrap; }
.meta { font-size: 8pt; color: #6E6E78; }
.last { font-family: 'Caveat', cursive, serif; font-size: 13pt; color: ${ink}; margin: 1.5mm 0; } .last span { font-size: 8pt; color: #6E6E78; font-family: 'IBM Plex Mono', monospace; }
sup { color: ${ink}; font-size: 7pt; }
.notes { page-break-before: always; font-size: 8.5pt; }
@media screen { body { max-width: 148mm; margin: 0 auto; padding: 10mm; } .chapter, .toc, .notes { margin-top: 14mm; } }
</style></head><body>
<div class="cover"><div class="ch-label">jilid ${b.year}</div><h1>${esc(b.circleName)}</h1>${b.genre ? `<div class="genre">${esc(b.genre.name)}</div><p>${esc(b.genre.blurb)}</p>` : ''}<p style="margin-top:12mm">${esc(b.members.join(' · '))}</p></div>
<div class="toc"><h2>Daftar Isi</h2><ul>${toc}${allLines.length ? '<li><span>penutup</span> Kalimat Terakhir</li>' : ''}</ul></div>
${chaptersHtml || '<p>Belum ada halaman di jilid ini.</p>'}
${poem}
${notes.length ? `<div class="notes"><h2>Catatan Kaki</h2><ol>${notes.join('')}</ol></div>` : ''}
</body></html>`;
}
