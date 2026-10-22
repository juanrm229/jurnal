/**
 * Halaman akhir Wrap: kartu publik (tanpa isi pribadi), OST lingkaran, dan —
 * untuk Tahun Kita — surat untuk diri sendiri yang baru terbuka tahun depan.
 */
import { COPY, type PublicWrapWire, type SongRef, type Wrap } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { navigate } from '@/lib/router';
import { shareOrCopy } from '@/lib/share';
import { Doodle, Section, Sticky } from '@/ui/kit';
import { openSong, PROVIDER_LABEL } from './cards';
import { PublicCard, sharePublicCard } from './PublicCard';

export function songListText(songs: (SongRef & { count: number })[], title: string): string {
  return [`${title} — OST Sehari`, '', ...songs.map((s, i) => `${i + 1}. ${s.title} — ${s.artist}${s.url ? `\n   ${s.url}` : ''}`)].join('\n');
}

async function copyText(text: string) {
  await navigator.clipboard?.writeText(text);
}

export function EndScreen({
  wrap,
  songs,
  onReplay,
  onBack,
  onClose,
}: {
  wrap: Wrap;
  songs: (SongRef & { count: number })[];
  onReplay: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<'share' | 'link' | null>(null);
  const [ostNote, setOstNote] = useState<string | null>(null);
  const [link, setLink] = useState<PublicWrapWire | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const year = wrap.scope === 'year' ? Number(wrap.period) : null;

  const shareImage = async () => {
    setBusy('share');
    setNote(null);
    try {
      const r = await sharePublicCard(wrap.public, `${wrap.title} · ${wrap.label}`);
      if (r === 'downloaded') setNote('Gambar kartu tersimpan di unduhan.');
    } catch (e) {
      setNote((e as Error).message || 'Kartunya belum bisa dibuat. Coba sekali lagi.');
    } finally {
      setBusy(null);
    }
  };

  const makeLink = async () => {
    setBusy('link');
    setNote(null);
    try {
      // Hanya PublicWrapData yang dikirim; server membersihkannya lagi.
      setLink(await api.post<PublicWrapWire>('/public-wraps', { data: wrap.public }));
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string, msg: string, set: (m: string) => void = setNote) => {
    try {
      await copyText(text);
      set(msg);
    } catch {
      set('Belum bisa menyalin di peramban ini.');
    }
  };

  return (
    <div className="story-end" data-testid="wrap-end">
      <div className="story-end-inner">
        <div className="label center">
          {wrap.title.toLowerCase()} · {wrap.label.toLowerCase()}
        </div>
        <h1 className="title center" style={{ marginTop: 4 }}>
          simpan & bagikan
        </h1>

        <Section title="kartu publik">
          <div className="center">
            <div className="public-card-tilt">
              <PublicCard data={wrap.public} width={260} />
            </div>
          </div>
          <div className="row mt" style={{ alignItems: 'flex-start' }}>
            <Doodle id="ui-gembok" size={20} />
            <span className="small soft grow">{COPY.wraps.publicVersion}</span>
          </div>
          <div className="col mt">
            <button className="btn" onClick={shareImage} disabled={busy === 'share'} data-testid="share-public">
              <Doodle id="ui-bagikan" size={20} color="currentColor" />
              {busy === 'share' ? 'menyiapkan kartu…' : 'bagikan kartu publik'}
            </button>
            {!link ? (
              <button className="btn ghost" onClick={makeLink} disabled={busy === 'link'} data-testid="make-public-link">
                {busy === 'link' ? 'membuat tautan…' : 'atau buat tautan publik'}
              </button>
            ) : (
              <div className="card col" data-testid="public-link">
                <span className="tiny soft">tautan publik</span>
                <span className="small ink" style={{ wordBreak: 'break-all', userSelect: 'all' }}>
                  {link.url}
                </span>
                <div className="row wrap">
                  <button className="btn soft sm grow" style={{ minWidth: 130 }} onClick={() => copy(link.url, 'Tautan disalin.')} data-testid="copy-public-link">
                    salin tautan
                  </button>
                  <a className="btn soft sm grow" style={{ minWidth: 130 }} href={link.imageUrl} target="_blank" rel="noopener noreferrer">
                    buka gambar
                  </a>
                </div>
                <button className="btn ghost sm" onClick={() => shareOrCopy(`${wrap.title} · ${wrap.label}`, link.url).then((r) => r === 'copied' && setNote('Tautan disalin.'))}>
                  bagikan tautan
                </button>
              </div>
            )}
          </div>
          {note ? <div className="small ink center mt">{note}</div> : null}
        </Section>

        <Section
          title="simpan OST"
          right={
            songs.length ? (
              <button className="tiny ink story-plain" onClick={() => copy(songListText(songs, wrap.title), 'Daftar lagu disalin.', setOstNote)} data-testid="copy-ost">
                salin daftar lagu
              </button>
            ) : undefined
          }>
          {songs.length ? (
            <div className="card" style={{ padding: '6px 16px' }}>
              {songs.map((s, i) => (
                <button key={`${s.title}|${s.artist}`} className="row story-plain story-track" onClick={() => openSong(s.url)}>
                  <span className="tiny soft" style={{ width: 20 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="grow" style={{ textAlign: 'left' }}>
                    <span className="small ink story-ellipsis">{s.title}</span>
                    <span className="tiny soft story-ellipsis">
                      {s.artist} · {PROVIDER_LABEL[s.provider] ?? 'tautan'}
                      {s.count > 1 ? ` · ${s.count}×` : ''}
                    </span>
                  </span>
                  <Doodle id="ui-panah-kanan" size={16} style={{ opacity: 0.6 }} />
                </button>
              ))}
            </div>
          ) : (
            <div className="card col" style={{ alignItems: 'center' }}>
              <Doodle id="ui-lagu" size={30} style={{ opacity: 0.6 }} />
              <span className="small soft center">Belum ada lagu di periode ini. Lagu yang kalian Drop akan jadi OST di sini.</span>
            </div>
          )}
          {ostNote ? <div className="small ink center" style={{ marginTop: 8 }}>{ostNote}</div> : null}
          <div className="tiny soft" style={{ marginTop: 6 }}>Tautan dibuka di aplikasi musikmu. Sehari tidak memutar lagu.</div>
        </Section>

        {year ? (
          <Section title="untuk tahun depan">
            <Sticky color="peach" tilt={1.2}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <Doodle id="jam-pasir" size={40} />
                <div className="col grow" style={{ gap: 4 }}>
                  <span className="hand" style={{ fontSize: 26, color: 'inherit' }}>{COPY.wraps.letterToSelf}</span>
                  <span className="small" style={{ opacity: 0.75 }}>Tulis untuk dirimu yang membuka jilid {year + 1}. Surat ini terkunci sampai 1 Januari.</span>
                </div>
              </div>
              <button className="btn mt" onClick={() => navigate(`/surat/tulis?kind=future&self=1&deliverOn=${year + 1}-01-01`)} data-testid="letter-to-self">
                <Doodle id="pena" size={20} color="currentColor" />
                tulis surat
              </button>
            </Sticky>
          </Section>
        ) : null}

        <div className="row mt-lg">
          <button className="btn ghost grow" onClick={onBack}>
            kembali
          </button>
          <button className="btn soft grow" onClick={onReplay} data-testid="wrap-replay">
            putar lagi
          </button>
        </div>
        <button className="btn ghost" style={{ marginTop: 8 }} onClick={onClose}>
          tutup
        </button>
      </div>
    </div>
  );
}
