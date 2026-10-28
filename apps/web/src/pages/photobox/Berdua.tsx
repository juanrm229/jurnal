/**
 * Photobox berdua jarak jauh. Kalian saling lihat lewat jendela kecil (±1 fps,
 * terenkripsi), menekan siap, lalu hitung mundur berjalan serentak di dua HP
 * karena memakai jam server. Strip menyatukan foto kalian berdampingan:
 * tuan rumah di kiri, tamu di kanan, dan kartu pose memberi tahu ke mana
 * masing-masing harus condong supaya kalian seolah bersentuhan.
 */
import { getCity } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useCircles, useKeyring, useMe } from '@/lib/data';
import { mediaUrl } from '@/lib/media';
import { boothKey, fetchPreview, framesOf, joinBooth, resetBooth, sendPreview, setConfig, setReady, startBooth, uploadFrames, useBooth } from '@/lib/photobox/booth';
import { grab, useCamera } from '@/lib/photobox/camera';
import { FILTERS, themeInk } from '@/lib/photobox/filters';
import { posesFor } from '@/lib/photobox/poses';
import { frameAspect, TEMPLATES, type TemplateId } from '@/lib/photobox/strips';
import { useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Doodle, Empty, Growing, Header, useToast } from '@/ui/kit';
import { StripActions } from './actions';
import { BoothStage, LiveView, StripResult } from './parts';

type Stage = 'lobby' | 'shoot' | 'send' | 'wait' | 'result';
type Img = HTMLImageElement | HTMLCanvasElement;

const loadImg = (url: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });

export default function Berdua() {
  const { id = '' } = useParams<{ id: string }>();
  const me = useMe();
  const { identity } = useSession();
  const ring = useKeyring();
  const { circles } = useCircles();
  const toast = useToast();
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('lobby');
  const q = useBooth(id, stage !== 'result');
  const w = q.data;
  const circle = circles.find((c) => c.id === w?.circleId);
  const key = useMemo(() => boothKey(w, ring), [w?.envelope.ciphertext, ring]);
  const isHost = w?.hostId === me.user.id;
  const partnerId = w ? (isHost ? w.guestId : w.hostId) : null;
  const member = (uid: string | null | undefined) => circle?.members.find((m) => m.userId === uid);
  const partner = member(partnerId);
  const side = isHost ? 'left' : 'right';
  const cfg = w?.config;
  const cam = useCamera(stage === 'lobby' || stage === 'shoot');
  const ink = useMemo(() => themeInk(), []);
  const inkCss = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2a14d6', []);
  const aspect = cfg ? frameAspect(cfg.template as TemplateId, 2, cfg.shots) : 4 / 3;
  const poses = useMemo(() => (cfg ? posesFor(cfg.seed, cfg.shots, true) : null), [cfg?.seed, cfg?.shots]);
  const [myFrames, setMyFrames] = useState<HTMLCanvasElement[] | null>(null);
  const [imgs, setImgs] = useState<Img[][] | null>(null);
  const [template, setTemplate] = useState<TemplateId>('klasik');
  const [pUrl, setPUrl] = useState<string | null>(null);
  const [waitSince, setWaitSince] = useState(0);
  const [, tick] = useState(0);

  useEffect(() => {
    joinBooth(id)
      .then(() => void q.refetch())
      .catch((e) => setJoinErr((e as Error).message));
  }, [id]);

  // Pratinjau untuk dia: ±1 fps, kecil, terenkripsi dengan kunci booth.
  useEffect(() => {
    if (!key || !cfg || !(stage === 'lobby' || stage === 'shoot') || !cam.ready) return;
    const small = document.createElement('canvas');
    const t = setInterval(() => {
      if (!cam.video.current) return;
      grab(cam.video.current, aspect, 220, cfg.filter as never, ink, small);
      void sendPreview(id, key, small).catch(() => {});
    }, 1000);
    return () => clearInterval(t);
  }, [key, stage, cam.ready, aspect, cfg?.filter]);

  // Ambil pratinjau dia setiap kali ada yang baru.
  const pAt = partnerId ? w?.previews[partnerId] : undefined;
  useEffect(() => {
    if (!pAt || !key || !partnerId) return;
    let ok = true;
    fetchPreview(id, partnerId, key)
      .then((u) => {
        if (!ok) return URL.revokeObjectURL(u);
        setPUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return u;
        });
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, [pAt]);

  // Keduanya siap → tuan rumah memulai; jam mulai ditentukan server.
  const bothReady = !!w?.guestId && w.ready.includes(w.hostId) && w.ready.includes(w.guestId);
  useEffect(() => {
    if (w && !w.startAt && bothReady && isHost) void startBooth(id).then(() => q.refetch()).catch(() => {});
  }, [bothReady, w?.startAt]);

  useEffect(() => {
    if (w?.startAt && stage === 'lobby') {
      setTemplate(w.config.template as TemplateId);
      setStage('shoot');
    }
  }, [w?.startAt]);

  // Menunggu jepretan dia, lalu satukan.
  useEffect(() => {
    if (stage !== 'wait' || !w || !partnerId || !myFrames) return;
    const refs = framesOf(w, partnerId, ring);
    if (!refs) return;
    let ok = true;
    Promise.all(refs.map((r) => mediaUrl(r).then(loadImg)))
      .then((theirs) => {
        if (!ok) return;
        setImgs(isHost ? [myFrames, theirs] : [theirs, myFrames]);
        setStage('result');
        sound.play('chime');
      })
      .catch(() => toast('Jepretan dia belum bisa dibuka. Coba sebentar lagi.'));
    return () => {
      ok = false;
    };
  }, [w?.frames.length, stage]);

  useEffect(() => {
    if (stage !== 'wait') return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  if (joinErr)
    return (
      <main className="screen pb-screen">
        <Header title="photobox berdua" backTo="/photobox" />
        <Empty doodle="kamera" title="Booth ini tidak bisa dibuka." body={joinErr} />
      </main>
    );
  if (!w || !cfg || !circle) return <Growing label="membuka booth…" />;

  const meCtx = identity ? { id: me.user.id, publicKey: identity.publicKey } : null;
  const hostM = member(w.hostId);
  const guestM = member(w.guestId);
  const names = [hostM?.penName ?? 'dia', guestM?.penName ?? 'dia'].map((n, i) => ((i === 0 ? w.hostId : w.guestId) === me.user.id ? me.user.penName ?? n : n));
  const cities = [hostM?.cityId, guestM?.cityId].map((c) => getCity(c)?.name ?? '');
  const meReady = w.ready.includes(me.user.id);
  const theyReady = !!partnerId && w.ready.includes(partnerId);
  const link = `${location.origin}/photobox/${id}`;
  const partnerWantsAgain = stage === 'result' && !w.startAt && w.frames.length === 0;

  const retake = async () => {
    await resetBooth(id).catch(() => {});
    setMyFrames(null);
    setImgs(null);
    setStage('lobby');
    void q.refetch();
  };

  if (stage === 'shoot' && w.startAt)
    return (
      <main className="screen pb-screen">
        <Header title="photobox berdua" sub={`kamu di ${side === 'left' ? 'kiri' : 'kanan'} strip`} backTo="/photobox" />
        <BoothStage
          video={cam.video}
          ready={cam.ready}
          aspect={aspect}
          filter={cfg.filter as never}
          ink={ink}
          poses={poses}
          shots={cfg.shots}
          startLocal={q.local(w.startAt)}
          side={side}
          partner={{ name: partner?.penName ?? 'dia', url: pUrl }}
          onDone={async (f) => {
            setMyFrames(f);
            setStage('send');
            try {
              if (meCtx) await uploadFrames(id, circle, meCtx, f);
              setWaitSince(Date.now());
              setStage('wait');
              void q.refetch();
            } catch (e) {
              toast((e as Error).message);
              setStage('wait');
            }
          }}
        />
      </main>
    );

  if ((stage === 'send' || stage === 'wait') && myFrames)
    return (
      <main className="screen pb-screen">
        <Header title="photobox berdua" backTo="/photobox" />
        <div className="pbd-wait">
          <div className="pbd-wait-strips" aria-hidden>
            <span className="pbd-ws mine">
              {myFrames.map((c, i) => (
                <img key={i} src={c.toDataURL('image/jpeg', 0.5)} alt="" />
              ))}
            </span>
            <span className="pbd-ws theirs">
              {myFrames.map((_, i) => (
                <i key={i} />
              ))}
            </span>
          </div>
          <p className="rupa-hand" style={{ fontSize: 32, margin: 0 }}>{stage === 'send' ? 'mengirim jepretanmu…' : `menunggu jepretan ${partner?.penName ?? 'dia'}…`}</p>
          <p className="small soft" style={{ margin: 0 }}>Begitu sampai, strip kalian langsung disatukan.</p>
          {stage === 'wait' && Date.now() - waitSince > 45_000 ? (
            <button
              className="btn soft"
              onClick={() => {
                setImgs([myFrames]);
                setStage('result');
              }}>
              buat strip sendiri dulu
            </button>
          ) : null}
        </div>
      </main>
    );

  if (stage === 'result' && imgs)
    return (
      <main className="screen pb-screen">
        <Header title="strip berdua!" sub={imgs.length > 1 ? `${names.join(' & ')} · dua kota` : 'strip sendiri'} backTo="/photobox" />
        {partnerWantsAgain ? (
          <button className="sticky row pbd-again" style={{ background: 'var(--sticky-yellow)' }} onClick={() => void retake()}>
            <Doodle id="kamera" size={26} /> <span className="small">{partner?.penName ?? 'Dia'} ingin foto lagi. Ketuk untuk ikut.</span>
          </button>
        ) : null}
        <StripResult
          frames={imgs}
          names={imgs.length > 1 ? names : [me.user.penName ?? 'aku']}
          cities={imgs.length > 1 ? cities : [getCity(me.user.cityId)?.name ?? '']}
          poses={(poses ?? []).map((p) => p.text)}
          template={template}
          onTemplate={setTemplate}
          ink={inkCss}
          actions={(blob) => <StripActions blob={blob} onRetake={() => void retake()} retakeLabel="foto lagi berdua" />}
        />
      </main>
    );

  // ── Lobi ─────────────────────────────────────────────────────────────────
  const windowFor = (uid: string | null, m: typeof hostM, k: number) => {
    const mine = uid === me.user.id;
    const ready = !!uid && w.ready.includes(uid);
    return (
      <div className={`pbd-win ${ready ? 'ready' : ''}`} key={k}>
        <div className="pbd-frame" style={{ aspectRatio: String(aspect) } as CSSProperties}>
          {mine ? (
            cam.err ? <span className="tiny pbd-empty">{cam.err}</span> : <LiveView video={cam.video} ready={cam.ready} aspect={aspect} filter={cfg.filter as never} ink={ink} />
          ) : uid && pUrl ? (
            <img src={pUrl} alt="" />
          ) : (
            <span className="pbd-empty">
              <Doodle id="kamera" size={30} className="breathe" />
              <span className="tiny">{uid ? 'menyalakan kamera…' : 'menunggu dia masuk…'}</span>
            </span>
          )}
          <span className="pbd-side">{k === 0 ? 'kiri' : 'kanan'}</span>
          {ready ? <span className="pbd-ready">siap ✓</span> : null}
        </div>
        <span className="pbd-name">
          <b>{mine ? 'kamu' : m?.penName ?? '—'}</b>
          <span className="tiny soft">{getCity(m?.cityId)?.name ?? ''}</span>
        </span>
      </div>
    );
  };

  return (
    <main className="screen pb-screen">
      <Header title="photobox berdua" sub={circle.name} backTo="/photobox" />
      <section className="pbd-lobby">
        <p className="rupa-hand pbd-title">dua kota, satu strip.</p>
        <div className="pbd-windows">
          {windowFor(w.hostId, hostM, 0)}
          <span className="pbd-thread" aria-hidden>
            ♥
          </span>
          {windowFor(w.guestId, guestM, 1)}
        </div>

        {!w.guestId || !pUrl ? (
          <div className="pbd-invite">
            <span className="small">{w.guestId ? `${partner?.penName ?? 'Dia'} sedang masuk…` : 'Dia sudah dapat notifikasi. Atau kirim tautannya:'}</span>
            <div className="row" style={{ gap: 8 }}>
              <a className="btn sm soft grow" href={`https://wa.me/?text=${encodeURIComponent(`Yuk photobox bareng di Sehari! 📸 ${link}`)}`} target="_blank" rel="noreferrer">
                kirim lewat WhatsApp
              </a>
              <button
                className="btn sm soft auto"
                onClick={() => {
                  void navigator.clipboard?.writeText(link);
                  toast('Tautan disalin.');
                }}>
                salin
              </button>
            </div>
          </div>
        ) : null}

        {isHost ? (
          <>
            <section className="section">
              <span className="label">desain strip</span>
              <div className="chip-row pb-tpls">
                {TEMPLATES.map((t) => (
                  <button key={t.id} className={`pb-tpl ${cfg.template === t.id ? 'on' : ''}`} onClick={() => void setConfig(id, { ...cfg, template: t.id }).then(() => q.refetch())}>
                    <span className="pb-tpl-sw" style={{ background: t.swatch } as CSSProperties} />
                    <span className="tiny">{t.name}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="section">
              <span className="label">filter untuk berdua</span>
              <div className="chip-row">
                {FILTERS.map((f) => (
                  <button key={f.id} className={`pill sm ${cfg.filter === f.id ? 'active' : ''}`} onClick={() => void setConfig(id, { ...cfg, filter: f.id }).then(() => q.refetch())}>
                    {f.name}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className="small soft center" style={{ margin: '16px 0 0' }}>
            {hostM?.penName ?? 'Dia'} memilih <b className="ink">{TEMPLATES.find((t) => t.id === cfg.template)?.name}</b> · filter <b className="ink">{cfg.filter}</b> · {cfg.shots} foto
          </p>
        )}

        <button
          className={`btn mt-lg pb-go ${meReady ? 'soft' : ''}`}
          disabled={!cam.ready}
          onClick={() => {
            sound.play('tap');
            void setReady(id, !meReady).then(() => q.refetch());
          }}
          data-testid="pbd-ready">
          {meReady ? (theyReady ? 'mulai sebentar lagi…' : `siap ✓ menunggu ${partner?.penName ?? 'dia'}…`) : 'aku siap!'}
        </button>
        <p className="tiny soft center" style={{ margin: '8px 0 0' }}>
          Kartu pose akan bilang ke mana kamu harus condong. Kamu di <b>{side === 'left' ? 'kiri' : 'kanan'}</b> strip.
        </p>
      </section>
    </main>
  );
}
