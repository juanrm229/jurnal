/**
 * Photobox Sehari: pilih desain strip & filter, masuk booth, empat jepretan
 * dengan kartu pose, lalu stripnya keluar dari mesin. Desain bisa diganti
 * setelah memotret. Berdua jarak jauh dibuka dari sini juga.
 */
import { getCity } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useCircles, useMe } from '@/lib/data';
import { createBooth } from '@/lib/photobox/booth';
import { useCamera } from '@/lib/photobox/camera';
import { FILTERS, type FilterId, themeInk } from '@/lib/photobox/filters';
import { posesFor } from '@/lib/photobox/poses';
import { frameAspect, TEMPLATES, type TemplateId } from '@/lib/photobox/strips';
import { navigate, usePath } from '@/lib/router';
import { useSession } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Avatar, Doodle, Header, ListLink, Sheet, Toggle, useToast } from '@/ui/kit';
import { BoothStage, LiveView, StripResult } from './parts';
import { StripActions } from './actions';

type Phase = 'start' | 'setup' | 'booth' | 'result';

export default function Photobox() {
  const me = useMe();
  const { identity } = useSession();
  const { circles } = useCircles();
  const { search } = usePath();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('start');
  const [template, setTemplate] = useState<TemplateId>('klasik');
  const [filter, setFilter] = useState<FilterId>('asli');
  const [shots, setShots] = useState(4);
  const [posesOn, setPosesOn] = useState(true);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null>(null);
  const [startLocal, setStartLocal] = useState(0);
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const cam = useCamera(phase === 'setup' || phase === 'booth');
  const ink = useMemo(() => themeInk(), []);
  const inkCss = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2a14d6', []);
  const active = circles.filter((c) => c.status === 'active' && c.me?.state === 'active');
  const poses = useMemo(() => (posesOn ? posesFor(seed, shots, false) : null), [seed, shots, posesOn]);
  const aspect = frameAspect(template, 1, shots);

  // Dari halaman lingkaran: ?berdua=<circleId> langsung membuka booth berdua.
  useEffect(() => {
    const cid = search.get('berdua');
    if (cid) void openRemote(cid);
  }, []);

  const openRemote = async (circleId: string) => {
    const circle = active.find((c) => c.id === circleId);
    if (!circle || !identity) return;
    setBusy(true);
    try {
      const b = await createBooth(circle, { template, filter, shots, seed: Math.floor(Math.random() * 1e6) }, { id: me.user.id, publicKey: identity.publicKey });
      sound.play('pop');
      navigate(`/photobox/${b.id}`, { replace: !!search.get('berdua') });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      setPick(false);
    }
  };

  if (phase === 'booth')
    return (
      <main className="screen pb-screen">
        <Header title="photobox" sub="lihat ke kamera ✦" backTo="/photobox" />
        <BoothStage
          video={cam.video}
          ready={cam.ready}
          aspect={aspect}
          filter={filter}
          ink={ink}
          poses={poses}
          shots={shots}
          startLocal={startLocal}
          onDone={(f) => {
            setFrames(f);
            setPhase('result');
          }}
        />
      </main>
    );

  if (phase === 'result' && frames)
    return (
      <main className="screen pb-screen">
        <Header title="stripmu jadi!" sub="ganti desain sepuasnya" backTo="/photobox" />
        <StripResult
          frames={[frames]}
          names={[me.user.penName ?? 'aku']}
          cities={[getCity(me.user.cityId)?.name ?? '']}
          poses={(poses ?? []).map((p) => p.text)}
          template={template}
          onTemplate={setTemplate}
          ink={inkCss}
          actions={(blob) => (
            <StripActions
              blob={blob}
              onRetake={() => {
                setSeed(Math.floor(Math.random() * 1e6));
                setFrames(null);
                setPhase('setup');
              }}
            />
          )}
        />
      </main>
    );

  if (phase === 'setup')
    return (
      <main className="screen pb-screen">
        <Header title="siapkan booth" sub="desain, filter, jumlah jepretan" backTo="/photobox" />
        <div className="pb-setup-cam">
          {cam.err ? (
            <div className="pb-cam-err">
              <Doodle id="kamera" size={48} />
              <span className="small">{cam.err}</span>
            </div>
          ) : (
            <LiveView video={cam.video} ready={cam.ready} aspect={aspect} filter={filter} ink={ink} />
          )}
          <span className="pb-setup-tag">{FILTERS.find((f) => f.id === filter)?.hint}</span>
        </div>

        <section className="section">
          <span className="label">filter</span>
          <div className="chip-row">
            {FILTERS.map((f) => (
              <button key={f.id} className={`pill sm ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.name}
              </button>
            ))}
          </div>
        </section>
        <section className="section">
          <span className="label">desain strip</span>
          <div className="chip-row pb-tpls">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={`pb-tpl ${template === t.id ? 'on' : ''}`} onClick={() => setTemplate(t.id)}>
                <span className="pb-tpl-sw" style={{ background: t.swatch } as CSSProperties} />
                <span className="tiny">{t.name}</span>
              </button>
            ))}
          </div>
          <p className="tiny soft" style={{ margin: '6px 0 0' }}>{TEMPLATES.find((t) => t.id === template)?.hint} · bisa diganti setelah memotret</p>
        </section>
        <section className="section">
          <span className="label">jepretan</span>
          <div className="seg">
            {[3, 4].map((n) => (
              <button key={n} className={shots === n ? 'on' : ''} onClick={() => setShots(n)}>
                {n} foto
              </button>
            ))}
          </div>
          <div className="mt-sm">
            <Toggle label="kartu pose" hint="tantangan pose lucu sebelum tiap jepretan" value={posesOn} onChange={setPosesOn} />
          </div>
        </section>
        <button
          className="btn mt-lg pb-go"
          disabled={!cam.ready}
          onClick={() => {
            setStartLocal(Date.now() + 3200);
            setPhase('booth');
          }}
          data-testid="pb-enter">
          <Doodle id="kamera" size={20} color="currentColor" /> masuk booth
        </button>
      </main>
    );

  return (
    <main className="screen pb-screen">
      <Header title="photobox" sub="strip foto yang lucu & macam-macam" backTo="/hari" />
      <section className="pb-hero">
        <div className="pb-hero-machine" aria-hidden>
          <span className="pb-hm-top">
            <span className="pb-hm-bulb" />
            <span className="pb-hm-bulb" />
            <span className="pb-hm-bulb" />
            <b>PHOTO</b>
            <span className="pb-hm-bulb" />
            <span className="pb-hm-bulb" />
            <span className="pb-hm-bulb" />
          </span>
          <span className="pb-hm-curtain" />
          <span className="pb-hm-slot" />
          <span className="pb-hm-strip">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <h1 className="pb-hero-title">photobox</h1>
        <p className="small soft" style={{ margin: 0 }}>
          Empat jepretan, kartu pose yang bikin ketawa, dan delapan desain strip, dari negatif film sampai purikura. Bisa juga berdua dari kota yang berbeda.
        </p>
      </section>

      <div className="pb-modes">
        <button className="pb-mode solo rise" onClick={() => setPhase('setup')} data-testid="pb-solo">
          <span className="pb-mode-art">
            <span className="pb-mini-strip" />
          </span>
          <span className="pb-mode-name">sendiri</span>
          <span className="tiny soft">booth pribadimu, kapan saja</span>
        </button>
        <button className="pb-mode duo rise" style={{ animationDelay: '0.06s' }} onClick={() => (active.length ? setPick(true) : toast('Buat lingkaran dulu untuk photobox berdua.'))} disabled={busy} data-testid="pb-duo">
          <span className="pb-mode-art">
            <span className="pb-mini-strip a" />
            <span className="pb-mini-heart">♥</span>
            <span className="pb-mini-strip b" />
          </span>
          <span className="pb-mode-name">berdua jarak jauh</span>
          <span className="tiny soft">dua kota, satu strip</span>
        </button>
      </div>

      <section className="section pb-how">
        <span className="label">berdua, cara kerjanya</span>
        <ol className="pb-steps">
          <li>Buka booth, dia dapat notifikasi atau tautan.</li>
          <li>Kalian saling lihat lewat jendela kecil, lalu tekan siap.</li>
          <li>Hitung mundurnya serentak di dua HP. Kartu pose memberi tahu siapa condong ke kiri dan siapa ke kanan, jadi di strip kalian seolah bersentuhan.</li>
          <li>Foto kalian disatukan berdampingan, terenkripsi seperti jurnal.</li>
        </ol>
      </section>

      <Sheet open={pick} onClose={() => setPick(false)} title="berdua dengan siapa?">
        <div className="col" style={{ gap: 4 }}>
          {active.map((c) => (
            <ListLink key={c.id} title={c.name} sub={`${c.members.filter((m) => m.state === 'active').length} orang · dia dapat notifikasi`} onClick={() => void openRemote(c.id)} right={<Avatar doodle={c.doodle} size={30} />} />
          ))}
        </div>
      </Sheet>
    </main>
  );
}
