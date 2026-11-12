/**
 * Ruang naskah: susunan bab dan adegan (urutan baca), garis waktu (urutan
 * kejadian per tokoh), dan Kanon.
 */
import type { NaskahScenePayload } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { firstLine, type NaskahModel, newNaskahId, povColor, type Scene, useNaskah, useNaskahModel } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { Avatar, Doodle, Growing, Header, useToast } from '@/ui/kit';
import { KanonList } from './Kanon';

export default function Ruang() {
  const { id } = useParams<{ id: string }>();
  const q = useNaskah(id);
  const m = useNaskahModel(q.data);
  if (!m) return q.isError ? <Growing label="naskah ini tidak ditemukan" /> : <Growing label="membuka naskah…" />;
  return <Workspace m={m} />;
}

type Tab = 'naskah' | 'waktu' | 'kanon';

function Workspace({ m }: { m: NaskahModel }) {
  const [tab, setTab] = useState<Tab>(m.tokoh.length ? 'naskah' : 'kanon');
  const pub = m.scenes.filter((s) => s.status === 'terbit').length;
  return (
    <main className="screen naskah-ruang">
      <Header title={m.meta.title} sub={`${pub} adegan terbit · ${m.canon.length} kanon`} backTo="/naskah" />
      {m.meta.logline ? <p className="nk-logline-top rupa-hand">{m.meta.logline}</p> : null}
      <div className="nk-penulis-row">
        {m.ms.members.map((u) => (
          <span key={u} title={m.who(u)}>
            <Avatar doodle={m.face(u)} size={24} /> {m.who(u)}
          </span>
        ))}
      </div>
      <nav className="meja-tab" role="tablist">
        {(['naskah', 'waktu', 'kanon'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} data-testid={`nk-tab-${t}`}>
            <Doodle id={t === 'naskah' ? 'buku-terbuka' : t === 'waktu' ? 'jam-dinding' : 'kacamata'} size={16} color="currentColor" /> {t}
          </button>
        ))}
      </nav>
      <div key={tab} className="meja-isi">
        {tab === 'naskah' ? <Susunan m={m} goKanon={() => setTab('kanon')} /> : tab === 'waktu' ? <GarisWaktu m={m} /> : <KanonList m={m} />}
        {m.pub ? <p className="tiny soft nk-publik">{m.ms.visibility === 'kota' ? 'Rumah ini ada di Kota Lirih: adegan yang terbit bisa dibaca semua warga. Draf tetap hanya untukmu.' : 'Bekas rumah di Kota. Kini hanya terbaca olehmu.'}</p> : null}
      </div>
    </main>
  );
}

function Susunan({ m, goKanon }: { m: NaskahModel; goKanon: () => void }) {
  const toast = useToast();
  const [atur, setAtur] = useState(false);
  const [busy, setBusy] = useState(false);
  const chapters = m.chapters.length ? m.chapters : [1];

  const add = async (chapter: number) => {
    if (!m.tokoh.length) return goKanon();
    setBusy(true);
    try {
      const sid = newNaskahId();
      const inCh = m.scenes.filter((s) => s.chapter === chapter);
      const last = m.scenes.filter((s) => s.authorId === m.meId && s.p).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const p: NaskahScenePayload = { v: 1, pov: last?.p?.pov ?? m.tokoh[0]!.id, when: { label: '', sort: '' }, text: '' };
      await m.post('/scenes', { id: sid, chapter, order: (inCh.at(-1)?.order ?? 0) + 1, envelope: m.seal(p), status: 'draf' });
      navigate(`/naskah/${m.ms.id}/a/${sid}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };
  /** Geser satu langkah di urutan baca; berpindah bab kalau sudah di ujung. */
  const move = async (s: Scene, dir: -1 | 1) => {
    const inCh = m.scenes.filter((x) => x.chapter === s.chapter);
    const i = inCh.findIndex((x) => x.id === s.id);
    const j = i + dir;
    try {
      if (j < 0) {
        if (s.chapter > 1) await m.put(`/scenes/${s.id}`, { chapter: s.chapter - 1, order: (m.scenes.filter((x) => x.chapter === s.chapter - 1).at(-1)?.order ?? 0) + 1 });
      } else if (j >= inCh.length) await m.put(`/scenes/${s.id}`, { chapter: s.chapter + 1, order: (m.scenes.filter((x) => x.chapter === s.chapter + 1)[0]?.order ?? 2) - 1 });
      else {
        const o = inCh[j]!;
        const k = inCh[j + dir];
        await m.put(`/scenes/${s.id}`, { order: k ? (o.order + k.order) / 2 : o.order + dir });
      }
    } catch (e) {
      toast((e as Error).message);
    }
  };

  if (!m.tokoh.length && m.canWrite)
    return (
      <div className="nk-kosong">
        <Doodle id="ui-peluk" size={56} draw />
        <p className="rupa-hand">Naskah dimulai dari tokoh.</p>
        <p className="small soft">Tiap adegan ditulis dari sudut pandang satu tokoh. Tambahkan tokoh di Kanon dulu.</p>
        <button className="btn auto" onClick={goKanon} data-testid="nk-ke-kanon">
          tambah tokoh
        </button>
      </div>
    );

  return (
    <div className="nk-susunan">
      <div className="row" style={{ justifyContent: 'flex-end', display: m.canWrite ? undefined : 'none' }}>
        <button className={`pill sm ${atur ? 'active' : ''}`} onClick={() => setAtur(!atur)} aria-pressed={atur}>
          {atur ? 'selesai mengatur' : 'atur urutan'}
        </button>
      </div>
      {chapters.map((ch) => {
        const list = m.scenes.filter((s) => s.chapter === ch);
        return (
          <section key={ch} className="nk-bab">
            <h3 className="nk-bab-h">bab {ch}</h3>
            <div className="col" style={{ gap: 8 }}>
              {list.map((s, i) => {
                const mine = s.authorId === m.meId;
                const hidden = !s.p;
                return (
                  <div key={s.id} className={`nk-adegan ${s.status} ${hidden ? 'tutup' : ''}`} style={{ '--n': i, '--pov': povColor(m, s.p?.pov) } as CSSProperties}>
                    <button className="nk-adegan-main" disabled={hidden} onClick={() => navigate(`/naskah/${m.ms.id}/a/${s.id}`)} data-testid="nk-adegan">
                      <span className="nk-adegan-top">
                        <b>{hidden ? 'adegan baru' : m.nameOf(s.p!.pov)}</b>
                        <span className="tiny soft">{hidden ? `${m.who(s.authorId)} sedang menulis` : s.p!.when.label || 'waktu belum ditentukan'}</span>
                      </span>
                      {!hidden ? <span className="nk-adegan-teks">{s.p!.title ? <i>{s.p!.title} · </i> : null}{firstLine(s.p!.text) || <em>kosong</em>}</span> : null}
                      <span className="nk-adegan-bawah">
                        <Avatar doodle={m.face(s.authorId)} size={18} />
                        <span className="tiny soft">{mine ? 'milikmu' : m.who(s.authorId)}</span>
                        {s.status === 'draf' ? <span className="nk-pill draf">draf</span> : <span className="tiny soft">v{s.version}</span>}
                      </span>
                    </button>
                    {atur ? (
                      <span className="nk-geser">
                        <button aria-label="geser ke atas" onClick={() => void move(s, -1)} disabled={ch === 1 && i === 0}>
                          ↑
                        </button>
                        <button aria-label="geser ke bawah" onClick={() => void move(s, 1)}>
                          ↓
                        </button>
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {m.canWrite ? (
                <button className="nk-tambah" disabled={busy} onClick={() => void add(ch)} data-testid={`nk-tambah-${ch}`}>
                  + adegan di bab {ch}
                </button>
              ) : null}
            </div>
          </section>
        );
      })}
      {m.canWrite ? (
        <button className="btn soft" disabled={busy} onClick={() => void add(chapters.at(-1)! + 1)} data-testid="nk-bab-baru">
          <Doodle id="buku" size={18} /> mulai bab {chapters.at(-1)! + 1}
        </button>
      ) : null}
    </div>
  );
}

/** Garis waktu: adegan menurut kejadian, berjalur per tokoh, dengan posisinya di urutan baca. */
function GarisWaktu({ m }: { m: NaskahModel }) {
  const read = m.scenes.filter((s) => s.p);
  const pos = new Map(read.map((s, i) => [s.id, i + 1]));
  const byTime = [...read].sort((a, b) => m.chrono[a.id]!.localeCompare(m.chrono[b.id]!));
  const lanes = m.tokoh.filter((t) => read.some((s) => s.p!.pov === t.id));
  if (!read.length) return <p className="small soft center" style={{ marginTop: 24 }}>Belum ada adegan untuk disusun di garis waktu.</p>;
  return (
    <div className="nk-waktu">
      <div className="nk-jalur-legenda">
        {lanes.map((t) => (
          <span key={t.id}>
            <span className="nk-dot" style={{ background: povColor(m, t.id) }} /> {t.p.name}
          </span>
        ))}
      </div>
      <ol className="nk-garis" style={{ '--lanes': Math.max(1, lanes.length) } as CSSProperties}>
        {byTime.map((s, i) => {
          const lane = Math.max(0, lanes.findIndex((t) => t.id === s.p!.pov));
          const flash = i > 0 && pos.get(s.id)! < pos.get(byTime[i - 1]!.id)!;
          return (
            <li key={s.id} style={{ '--lane': lane, '--pov': povColor(m, s.p!.pov), '--n': i } as CSSProperties}>
              <time className="tiny">{s.p!.when.label || '—'}</time>
              <button className="nk-titik" onClick={() => navigate(`/naskah/${m.ms.id}/a/${s.id}`)}>
                <b>{m.nameOf(s.p!.pov)}</b>
                <span className="tiny soft">
                  dibaca ke-{pos.get(s.id)} · bab {s.chapter}
                  {flash ? ' · muncul lebih awal di buku' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="tiny soft">Urutan di sini adalah urutan kejadian. Urutan baca diatur di tab naskah, jadi kilas balik dan dua sisi tidak merusak kronologi.</p>
    </div>
  );
}
