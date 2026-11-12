/** Studio Naskah: rak naskah dan membuka naskah baru. */
import type { NaskahMeta, NaskahWire } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { memberName, useCircles, useMe } from '@/lib/data';
import { newNaskahId, useNaskahList } from '@/lib/naskah';
import { navigate } from '@/lib/router';
import { useReady } from '@/lib/session';
import { sealPart, useOpenAny } from '@/lib/stories';
import { Avatar, Doodle, Header, Sheet, useToast } from '@/ui/kit';

export default function Rak() {
  const me = useMe();
  const { circles } = useCircles();
  const list = useNaskahList();
  const open = useOpenAny();
  const [baru, setBaru] = useState(false);
  const items = list.data ?? [];

  return (
    <main className="screen naskah-rak">
      <Header title="studio naskah" sub="satu adegan, satu pemilik" backTo="/main" />
      <section className="nk-hero">
        <p className="rupa-hand">Tulis bersama tanpa saling menimpa. Studio mengingat siapa tahu apa, dan kapan.</p>
        <button className="btn" onClick={() => setBaru(true)} data-testid="naskah-baru">
          <Doodle id="buku-terbuka" size={20} color="currentColor" /> naskah baru
        </button>
      </section>

      {items.length ? (
        <section className="section">
          <span className="label">rak naskah</span>
          <div className="col" style={{ gap: 10 }}>
            {items.map((ms, i) => {
              const meta = ms.meta && 'plain' in ms.meta ? (ms.meta.plain as NaskahMeta) : open<NaskahMeta>(ms.meta);
              const pub = ms.scenes.filter((x) => x.status === 'terbit').length;
              const drafting = ms.scenes.filter((x) => x.status === 'draf' && x.authorId !== me.user.id).length;
              return (
                <button key={ms.id} className="card nk-item" style={{ '--n': i } as CSSProperties} onClick={() => navigate(`/naskah/${ms.id}`)} data-testid="naskah-item">
                  <span className="nk-spine" aria-hidden />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <b>
                      {meta?.title ?? 'naskah'}
                      {ms.visibility === 'kota' ? <span className="nk-kota-pil">rumah di Kota</span> : null}
                    </b>
                    {meta?.logline ? <span className="small soft nk-logline">{meta.logline}</span> : null}
                    <span className="tiny soft">
                      {pub} adegan · {ms.canon.length} kanon · {ms.members.length === 1 ? 'sendiri' : ms.members.map((u) => memberName(circles, u, me.user.id)).join(', ')}
                      {drafting ? ` · ${drafting} sedang ditulis` : ''}
                    </span>
                  </span>
                  <Doodle id="ui-panah-kanan" size={16} />
                </button>
              );
            })}
          </div>
        </section>
      ) : list.isSuccess ? (
        <p className="small soft center" style={{ marginTop: 28 }}>
          Rakmu masih kosong. Mulai satu naskah, atau buka cerita Hidup Orang Lain yang sudah selesai di studio.
        </p>
      ) : null}

      <Sheet open={baru} onClose={() => setBaru(false)} title="naskah baru">
        <NaskahBaru onDone={(ms) => navigate(`/naskah/${ms.id}`)} />
      </Sheet>
    </main>
  );
}

function NaskahBaru({ onDone }: { onDone: (ms: NaskahWire) => void }) {
  const me = useMe();
  const { identity } = useReady();
  const toast = useToast();
  const { circles } = useCircles();
  const live = circles.filter((c) => c.status === 'active' && c.me?.state === 'active' && c.kind !== 'moment');
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [circleId, setCircleId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const circle = live.find((c) => c.id === circleId);
  const choose = (id: string | null) => {
    setCircleId(id);
    setPicked(live.find((c) => c.id === id)?.others.map((m) => m.userId).slice(0, 7) ?? []);
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <input className="field" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="judul kerja" autoFocus data-testid="nk-judul" />
      <textarea className="field" rows={2} value={logline} maxLength={240} onChange={(e) => setLogline(e.target.value)} placeholder="satu kalimat: siapa, menginginkan apa, apa yang menghalangi" />
      <span className="label">ditulis</span>
      <div className="row wrap" style={{ gap: 6 }}>
        <button className={`pill ${circleId === null ? 'active' : ''}`} onClick={() => choose(null)}>
          sendiri
        </button>
        {live.map((c) => (
          <button key={c.id} className={`pill ${circleId === c.id ? 'active' : ''}`} onClick={() => choose(c.id)} data-testid={`nk-l-${c.id}`}>
            <Doodle id={c.doodle} size={16} color="currentColor" /> {c.name}
          </button>
        ))}
      </div>
      {circle ? (
        <div className="row wrap" style={{ gap: 8 }}>
          {circle.others.map((m) => {
            const on = picked.includes(m.userId);
            return (
              <button key={m.userId} className={`nk-penulis ${on ? 'on' : ''}`} onClick={() => setPicked(on ? picked.filter((x) => x !== m.userId) : [...picked, m.userId])}>
                <Avatar doodle={m.doodle} size={30} />
                {m.penName}
              </button>
            );
          })}
        </div>
      ) : null}
      <button
        className="btn"
        disabled={!title.trim() || busy || (!!circle && !picked.length)}
        onClick={async () => {
          setBusy(true);
          try {
            const meta: NaskahMeta = { v: 1, title: title.trim(), logline: logline.trim() || undefined };
            const ms = await api.post<NaskahWire>('/naskah', {
              id: newNaskahId(),
              circleId: circle?.id ?? null,
              members: circle ? picked : [],
              meta: sealPart(meta, circle, { id: me.user.id, publicKey: identity.publicKey }),
            });
            onDone(ms);
          } catch (e) {
            toast((e as Error).message);
            setBusy(false);
          }
        }}
        data-testid="nk-buat">
        {busy ? 'menyiapkan…' : 'buka naskah'}
      </button>
    </div>
  );
}
