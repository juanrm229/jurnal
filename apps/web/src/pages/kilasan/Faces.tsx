/** Reaksi Wajah: deretan wajah di bawah kilasan/tulisan, dan lembar pemilih ekspresi. */
import { FACE_EXPRESSIONS, type FaceExpression, type FaceWire, type MediaRef } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { type CircleView, useCircles, useMe } from '@/lib/data';
import { captureSquare, type OpenFace, savedFaces, uploadFace, useFaceCircle, useOpenFaces, useRemoveFace, useSendFace } from '@/lib/faces';
import { useMediaUrl } from '@/lib/media';
import { Avatar, Doodle, Sheet, useToast } from '@/ui/kit';

const emojiOf = (e: FaceExpression) => FACE_EXPRESSIONS.find((x) => x.id === e)?.emoji ?? '😊';

function FaceImg({ media, size, fallback }: { media: MediaRef | null; size: number; fallback?: string }) {
  const url = useMediaUrl(media ?? undefined);
  return url ? (
    <img src={url} alt="" className="fc-img" style={{ width: size, height: size }} draggable={false} />
  ) : (
    <span className="fc-img empty" style={{ width: size, height: size }}>
      {fallback ? <Avatar doodle={fallback} size={size - 6} /> : null}
    </span>
  );
}

/** Deretan wajah yang membalas satu Drop. */
export function FaceRow({ faces, size = 40 }: { faces: FaceWire[]; size?: number }) {
  const opened = useOpenFaces(faces);
  const { circles } = useCircles();
  const me = useMe();
  const [big, setBig] = useState<OpenFace | null>(null);
  if (!opened.length) return null;
  const member = (id: string) => circles.flatMap((c) => c.members).find((m) => m.userId === id);
  return (
    <>
      <div className="fc-row" aria-label="reaksi wajah">
        {opened.map((f) => (
          <button key={f.userId} className="fc-face" onClick={() => setBig(f)} aria-label={`${member(f.userId)?.penName ?? 'teman'}: ${f.expression}`}>
            <FaceImg media={f.media} size={size} fallback={member(f.userId)?.doodle} />
            <span className="fc-emoji">{emojiOf(f.expression)}</span>
          </button>
        ))}
      </div>
      <Sheet open={!!big} onClose={() => setBig(null)} title={big ? `${big.userId === me.user.id ? 'kamu' : (member(big.userId)?.penName ?? 'teman')} · ${big.expression}` : ''}>
        {big ? (
          <div className="col" style={{ alignItems: 'center' }}>
            <div className="fc-big">
              <FaceImg media={big.media} size={260} fallback={member(big.userId)?.doodle} />
              <span className="fc-emoji big">{emojiOf(big.expression)}</span>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

/** Tombol + lembar untuk membalas dengan wajah. */
export function FaceButton({ dropId, circleIds, faces, label = 'wajah' }: { dropId: string; circleIds: string[]; faces: FaceWire[]; label?: string }) {
  const me = useMe();
  const circle = useFaceCircle(circleIds);
  const [open, setOpen] = useState(false);
  const mine = faces.find((f) => f.userId === me.user.id);
  if (!circle) return null;
  return (
    <>
      <button className={`pill${mine ? ' active' : ''}`} onClick={() => setOpen(true)} data-testid="face-open">
        {mine ? <span aria-hidden>{emojiOf(mine.expression)}</span> : <Doodle id="ui-foto" size={16} color="currentColor" />} {mine ? 'wajahmu' : label}
      </button>
      <FacePicker open={open} onClose={() => setOpen(false)} dropId={dropId} circle={circle} current={mine?.expression} />
    </>
  );
}

function FacePicker({ open, onClose, dropId, circle, current }: { open: boolean; onClose: () => void; dropId: string; circle: CircleView; current?: FaceExpression }) {
  const me = useMe();
  const toast = useToast();
  const send = useSendFace();
  const remove = useRemoveFace();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [saved, setSaved] = useState(() => savedFaces(me.user.id));
  const [shooting, setShooting] = useState<FaceExpression | null>(null);
  const [retake, setRetake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noCam, setNoCam] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);

  const stopCam = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => {
    if (!open) {
      stopCam();
      setShooting(null);
      setRetake(false);
    } else setSaved(savedFaces(me.user.id));
    return stopCam;
  }, [open, me.user.id]);

  const startCam = async (expr: FaceExpression) => {
    setShooting(expr);
    setNoCam(false);
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'function') throw new Error('nocam');
      stopCam();
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 } }, audio: false });
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play().catch(() => {});
      }
    } catch {
      setNoCam(true);
    }
  };

  const deliver = async (expr: FaceExpression, ref: MediaRef) => {
    setBusy(true);
    try {
      await send(dropId, circle, expr, ref);
      toast(`terkirim: wajah ${expr}`);
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pick = (expr: FaceExpression) => {
    const ref = saved[expr];
    if (ref && !retake) void deliver(expr, ref);
    else void startCam(expr);
  };

  const shoot = async () => {
    if (!video.current || !shooting) return;
    setBusy(true);
    try {
      const blob = await captureSquare(video.current);
      stopCam();
      const ref = await uploadFace(me.user.id, shooting, blob);
      setSaved(savedFaces(me.user.id));
      await deliver(shooting, ref);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  const fromFile = async (f: File | undefined) => {
    if (!f || !shooting) return;
    setBusy(true);
    try {
      const ref = await uploadFace(me.user.id, shooting, f);
      setSaved(savedFaces(me.user.id));
      await deliver(shooting, ref);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={shooting ? `wajah ${shooting}` : 'balas dengan wajahmu'}>
      {shooting ? (
        <div className="col" style={{ alignItems: 'center', gap: 12 }}>
          {noCam ? (
            <>
              <p className="small center" style={{ margin: 0 }}>Kamera depan belum bisa dibuka. Pilih swafoto dari galeri saja.</p>
              <button className="btn auto" onClick={() => fileIn.current?.click()} disabled={busy}>
                pilih foto
              </button>
            </>
          ) : (
            <>
              <div className="fc-cam">
                <video ref={video} playsInline muted autoPlay />
                <span className="fc-emoji big">{emojiOf(shooting)}</span>
              </div>
              <p className="tiny soft center" style={{ margin: 0 }}>
                Tirukan ekspresi {shooting}. Foto ini disimpan di perangkatmu untuk dipakai lagi.
              </p>
              <button className="btn auto" onClick={shoot} disabled={busy} data-testid="face-shoot">
                {busy ? 'mengirim…' : 'jepret wajah'}
              </button>
            </>
          )}
          <button className="btn ghost sm auto" onClick={() => { stopCam(); setShooting(null); }} disabled={busy}>
            kembali
          </button>
          <input ref={fileIn} type="file" accept="image/*" capture="user" hidden onChange={(e) => void fromFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <div className="fc-grid">
            {FACE_EXPRESSIONS.map((x) => (
              <button key={x.id} className={`fc-choice${current === x.id ? ' on' : ''}`} onClick={() => pick(x.id)} disabled={busy} data-testid={`face-${x.id}`}>
                <span className="fc-choice-face">
                  {saved[x.id] && !retake ? <FaceImg media={saved[x.id]!} size={64} /> : <span className="fc-choice-emoji">{x.emoji}</span>}
                  {saved[x.id] && !retake ? <span className="fc-emoji">{x.emoji}</span> : null}
                </span>
                <span className="tiny">{x.label}</span>
              </button>
            ))}
          </div>
          <div className="row between">
            <button className={`pill${retake ? ' active' : ''}`} onClick={() => setRetake((r) => !r)}>
              {retake ? 'pilih ekspresi untuk difoto ulang' : 'foto ulang wajah'}
            </button>
            {current ? (
              <button
                className="btn ghost sm auto"
                onClick={async () => {
                  await remove(dropId);
                  onClose();
                }}>
                hapus wajahku
              </button>
            ) : null}
          </div>
          <p className="tiny soft" style={{ margin: 0 }}>
            Wajahmu hanya terlihat oleh lingkaran ini dan ikut dihitung sebagai pelukan.
          </p>
        </div>
      )}
    </Sheet>
  );
}
