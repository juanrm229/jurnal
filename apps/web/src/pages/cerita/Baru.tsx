/**
 * Menyiapkan meja: pembuka, penulis, bentuk karya, dan palet. Empat langkah
 * pendek; kartu baru dibagikan di akhir.
 */
import { STORY_FORMATS, STORY_FREE, STORY_MAX_WRITERS, STORY_PREMISES, type StoryFormat, storyDeckIds, type StoryMeta, type StoryPalettePayload, type StoryWire } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { useCircles, useMe } from '@/lib/data';
import { navigate, usePath } from '@/lib/router';
import { useReady } from '@/lib/session';
import { newStoryId, sealPart } from '@/lib/stories';
import { Avatar, Doodle, Header, useToast } from '@/ui/kit';

const LANGKAH = ['pembuka', 'penulis', 'bentuk', 'palet'] as const;
const split = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);

export default function Baru() {
  const me = useMe();
  const { identity } = useReady();
  const toast = useToast();
  const { search } = usePath();
  const { circles } = useCircles();
  const live = circles.filter((c) => c.status === 'active' && c.me?.state === 'active' && c.kind !== 'moment');
  const fromKapsul = !!search.get('tanya');
  const [step, setStep] = useState(0);
  const [premise, setPremise] = useState(fromKapsul ? STORY_FREE : STORY_PREMISES[0]!.id);
  const [own, setOwn] = useState({ title: search.get('judul') ?? '', pitch: search.get('tanya') ?? '', fakta: search.get('fakta') ?? '', tokoh: search.get('tokoh') ?? '' });
  const [circleId, setCircleId] = useState<string | null>(live[0]?.id ?? null);
  const [picked, setPicked] = useState<string[]>(live[0]?.others.slice(0, STORY_MAX_WRITERS - 1).map((m) => m.userId) ?? []);
  const [format, setFormat] = useState<StoryFormat>('cerpen');
  const [deck, setDeck] = useState<'awal' | 'lengkap'>('awal');
  const [pick, setPick] = useState(true);
  const [kejutan, setKejutan] = useState(false);
  const [palet, setPalet] = useState({ boleh: '', garis: '', tirai: '' });
  const [busy, setBusy] = useState(false);
  const circle = live.find((c) => c.id === circleId);
  const ownTokoh = split(own.tokoh);
  const ok = [premise !== STORY_FREE || (own.title.trim() && ownTokoh.length >= 2), !circle || picked.length > 0, true, true];

  const chooseCircle = (id: string | null) => {
    setCircleId(id);
    const c = live.find((x) => x.id === id);
    setPicked(c ? c.others.slice(0, STORY_MAX_WRITERS - 1).map((m) => m.userId) : []);
  };
  const create = async () => {
    setBusy(true);
    try {
      const who = { id: me.user.id, publicKey: identity.publicKey };
      const meta: StoryMeta | undefined = premise === STORY_FREE ? { v: 1, title: own.title.trim(), pitch: own.pitch.trim(), fakta: own.fakta.split('\n').map((x) => x.trim()).filter(Boolean), tokoh: ownTokoh } : undefined;
      const pal: StoryPalettePayload = { v: 1, boleh: split(palet.boleh), garis: split(palet.garis), tirai: split(palet.tirai) };
      const hasPal = pal.boleh.length + pal.garis.length + pal.tirai.length > 0;
      const st = await api.post<StoryWire>('/stories', {
        id: newStoryId(),
        circleId: circle ? circle.id : null,
        premise,
        members: circle ? [me.user.id, ...picked] : [me.user.id],
        rounds: STORY_FORMATS[format].rounds,
        deck,
        pick,
        mode: kejutan ? 'kejutan' : 'terbuka',
        meta: meta ? sealPart(meta, circle, who) : undefined,
        palette: hasPal ? sealPart(pal, circle, who) : undefined,
      });
      navigate(`/cerita/${st.id}`, { replace: true });
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="screen cerita baru">
      <Header title="meja baru" sub={`${step + 1} dari ${LANGKAH.length} · ${LANGKAH[step]}`} backTo="/cerita" onBack={step ? () => setStep(step - 1) : undefined} />
      <ol className="baru-langkah" aria-hidden>
        {LANGKAH.map((l, i) => (
          <li key={l} className={i < step ? 'lewat' : i === step ? 'kini' : ''}>
            <i />
            {l}
          </li>
        ))}
      </ol>

      <div className="baru-isi" key={step}>
        {step === 0 ? (
          <>
            <h2 className="baru-judul">Dari mana cerita ini mulai?</h2>
            <div className="col" style={{ gap: 8 }}>
              {STORY_PREMISES.map((p, i) => (
                <button key={p.id} className={`card cerita-premis ${premise === p.id ? 'on' : ''}`} style={{ '--n': i } as CSSProperties} onClick={() => setPremise(p.id)} data-testid={`premis-${p.id}`}>
                  <Doodle id={p.doodle} size={34} />
                  <span className="grow">
                    <b>{p.title}</b>
                    <span className="tiny soft">{p.pitch}</span>
                  </span>
                </button>
              ))}
              <button className={`card cerita-premis ${premise === STORY_FREE ? 'on' : ''}`} style={{ '--n': 3 } as CSSProperties} onClick={() => setPremise(STORY_FREE)} data-testid="premis-bebas">
                <Doodle id="pena" size={34} />
                <span className="grow">
                  <b>{fromKapsul ? 'lanjutan dari kapsul' : 'tulis pembuka sendiri'}</b>
                  <span className="tiny soft">Judul, fakta pembuka, dan tokoh dari kalian. Tiap gelombang penulis memilih tokoh dan waktunya.</span>
                </span>
              </button>
            </div>
            {premise === STORY_FREE ? (
              <div className="col baru-form">
                <input className="field" value={own.title} maxLength={80} placeholder="judul" onChange={(e) => setOwn({ ...own, title: e.target.value })} data-testid="bebas-judul" />
                <input className="field" value={own.pitch} maxLength={240} placeholder="satu kalimat premis, atau pertanyaan yang masih punya daya" onChange={(e) => setOwn({ ...own, pitch: e.target.value })} />
                <textarea className="field" rows={2} value={own.fakta} maxLength={400} placeholder="fakta pembuka, satu per baris" onChange={(e) => setOwn({ ...own, fakta: e.target.value })} data-testid="bebas-fakta" />
                <input className="field" value={own.tokoh} maxLength={200} placeholder="tokoh, pisahkan dengan koma (minimal dua)" onChange={(e) => setOwn({ ...own, tokoh: e.target.value })} data-testid="bebas-tokoh" />
              </div>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="baru-judul">Siapa yang ikut menulis?</h2>
            <div className="row wrap" style={{ gap: 6 }}>
              {live.map((c) => (
                <button key={c.id} className={`pill ${circleId === c.id ? 'active' : ''}`} onClick={() => chooseCircle(c.id)} data-testid={`cerita-l-${c.id}`}>
                  <Doodle id={c.doodle} size={16} color="currentColor" /> {c.name}
                </button>
              ))}
              <button className={`pill ${circleId === null ? 'active' : ''}`} onClick={() => chooseCircle(null)} data-testid="cerita-sendiri">
                sendiri
              </button>
            </div>
            {circle ? (
              <div className="baru-orang">
                <span className="baru-o on">
                  <Avatar doodle={me.user.doodle} size={40} />
                  kamu
                </span>
                {circle.others.map((m) => {
                  const on = picked.includes(m.userId);
                  return (
                    <button key={m.userId} className={`baru-o ${on ? 'on' : ''}`} disabled={!on && picked.length >= STORY_MAX_WRITERS - 1} onClick={() => setPicked(on ? picked.filter((x) => x !== m.userId) : [...picked, m.userId])}>
                      <Avatar doodle={m.doodle} size={40} />
                      {m.penName}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="small soft">Sendiri: kamu memegang dua atau tiga tokoh bergantian, dan menerima jejakmu sendiri dari gelombang sebelumnya. Fakta yang kamu usulkan langsung sah.</p>
            )}
            <p className="tiny soft">Paling banyak lima penulis. Tiap penulis punya satu bagian wajib per gelombang; tidak ada tenggat.</p>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="baru-judul">Seberapa panjang, dan bagaimana kartunya?</h2>
            <div className="bentuk">
              {(Object.keys(STORY_FORMATS) as StoryFormat[]).map((f) => (
                <button key={f} className={`bentuk-k ${format === f ? 'on' : ''}`} onClick={() => setFormat(f)} data-testid={`format-${f}`}>
                  <span className="bentuk-ritme" aria-hidden>
                    {Array.from({ length: STORY_FORMATS[f].rounds }, (_, i) => (
                      <i key={i} className={(i + 1) % STORY_FORMATS[f].babak === 0 && f !== 'cerpen' ? 'stop' : ''} />
                    ))}
                  </span>
                  <b>{STORY_FORMATS[f].name}</b>
                  <span className="tiny soft">{STORY_FORMATS[f].hint}</span>
                </button>
              ))}
            </div>
            <label className="opsi-row">
              <span className="grow">
                <b>pilih satu dari dua kartu</b>
                <span className="tiny soft">Tiap penulis ditawari dua kartu role secara privat. Matikan untuk langsung diundi.</span>
              </span>
              <button type="button" role="switch" aria-checked={pick} className="switch" onClick={() => setPick(!pick)} />
            </label>
            <label className="opsi-row">
              <span className="grow">
                <b>dek lengkap</b>
                <span className="tiny soft">
                  {storyDeckIds('lengkap').length} kartu, termasuk kartu Lanjutan. Dek awal berisi {storyDeckIds('awal').length} kartu yang mudah dipahami.
                </span>
              </span>
              <button type="button" role="switch" aria-checked={deck === 'lengkap'} className="switch" onClick={() => setDeck(deck === 'lengkap' ? 'awal' : 'lengkap')} data-testid="dek-lengkap" />
            </label>
            <label className="opsi-row">
              <span className="grow">
                <b>mode kejutan</b>
                <span className="tiny soft">Di ruang baca hanya lipatan dan jejak yang terlihat. Adegan penuh dan kartu role baru terbuka di pengungkapan.</span>
              </span>
              <button type="button" role="switch" aria-checked={kejutan} className="switch" onClick={() => setKejutan(!kejutan)} data-testid="kejutan" />
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="baru-judul">Palet meja</h2>
            <p className="small soft">Yang ingin ada, yang sama sekali tidak boleh muncul (garis), dan yang boleh terjadi asal di luar layar (tirai). Semua penulis bisa menambahkan tanpa nama kapan saja dari Peta Cerita.</p>
            <div className="col baru-form">
              <label className="palet-in">
                <span>ingin ada</span>
                <input className="field" value={palet.boleh} onChange={(e) => setPalet({ ...palet, boleh: e.target.value })} placeholder="mis. hujan, surat, makanan rumah" />
              </label>
              <label className="palet-in garis">
                <span>garis</span>
                <input className="field" value={palet.garis} onChange={(e) => setPalet({ ...palet, garis: e.target.value })} placeholder="mis. kekerasan pada anak" data-testid="palet-garis" />
              </label>
              <label className="palet-in tirai">
                <span>tirai</span>
                <input className="field" value={palet.tirai} onChange={(e) => setPalet({ ...palet, tirai: e.target.value })} placeholder="mis. kematian, sakit parah" />
              </label>
            </div>
          </>
        ) : null}
      </div>

      <div className="baru-aksi">
        {step < LANGKAH.length - 1 ? (
          <button className="btn" disabled={!ok[step]} onClick={() => setStep(step + 1)} data-testid="baru-lanjut">
            lanjut
          </button>
        ) : (
          <button className="btn" disabled={busy || !ok.every(Boolean)} onClick={() => void create()} data-testid="cerita-mulai">
            {busy ? 'membagikan kartu…' : 'bagikan kartu dan mulai'}
          </button>
        )}
      </div>
    </main>
  );
}
