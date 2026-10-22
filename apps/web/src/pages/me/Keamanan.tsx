/**
 * Keamanan & perangkat: sesi yang masuk, menautkan perangkat baru (tempel kode
 * atau pindai bila peramban mendukung), dan kode pemulihan baru untuk kunci
 * yang sama.
 */
import { COPY, generateRecoveryCode, type SessionInfo } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Doodle, ErrorNote, Growing, Header, Section, useToast } from '@/ui/kit';
import { ErrText, errMsg, formatDate, Hr, Note } from './kit';

const PLATFORM_ICON: Record<string, string> = { ios: 'ui-aku', android: 'ui-aku', web: 'jendela' };
const PLATFORM_LABEL: Record<string, string> = { ios: 'iPhone', android: 'Android', web: 'browser' };

function Devices() {
  const q = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<SessionInfo[]>('/me/sessions') });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const revoke = async (id: string) => {
    setBusy(id);
    setErr(null);
    try {
      await api.del(`/me/sessions/${id}`);
      await q.refetch();
      setConfirm(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(null);
    }
  };
  if (q.isLoading) return <Growing label="mencari perangkat…" />;
  if (q.error) return <ErrorNote error={q.error} onRetry={() => void q.refetch()} />;
  const list = [...(q.data ?? [])].sort((a, b) => (a.current ? -1 : b.current ? 1 : a.lastUsedAt < b.lastUsedAt ? 1 : -1));
  return (
    <div className="card" style={{ padding: '4px 16px' }}>
      {list.map((s, i) => (
        <div key={s.id}>
          {i ? <Hr /> : null}
          <div style={{ padding: '12px 0' }}>
            <div className="row" style={{ gap: 12 }}>
              <Doodle id={PLATFORM_ICON[s.platform] ?? 'ui-aku'} size={26} />
              <div className="grow">
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.deviceName || PLATFORM_LABEL[s.platform] || 'perangkat'}</div>
                <div className="tiny soft">
                  {PLATFORM_LABEL[s.platform] ?? s.platform} · masuk {formatDate(s.createdAt)}
                </div>
              </div>
              {s.current ? (
                <span className="pill tiny" style={{ padding: '4px 10px' }}>
                  perangkat ini
                </span>
              ) : confirm === s.id ? null : (
                <button className="btn ghost sm auto" onClick={() => setConfirm(s.id)}>
                  keluarkan
                </button>
              )}
            </div>
            {confirm === s.id ? (
              <div className="col rise" style={{ marginTop: 10, gap: 8 }}>
                <span className="small">Perangkat ini akan keluar dari akunmu dan harus masuk lagi lewat email serta kode pemulihan.</span>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn danger sm grow" onClick={() => void revoke(s.id)} disabled={busy === s.id}>
                    {busy === s.id ? 'sebentar…' : 'ya, keluarkan'}
                  </button>
                  <button className="btn ghost sm grow" onClick={() => setConfirm(null)}>
                    batal
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
      {err ? <div style={{ paddingBottom: 12 }}><ErrText>{err}</ErrText></div> : null}
    </div>
  );
}

// ── Pindai QR (opsional, hanya bila peramban punya BarcodeDetector) ─────────

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

function detectorCtor(): DetectorCtor | null {
  const D = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  return D && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia ? D : null;
}

function Scanner({ onData, onFail }: { onData: (data: string) => void; onFail: (msg: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const D = detectorCtor();
    if (!D) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let alive = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!alive || !video.current) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play();
        const det = new D({ formats: ['qr_code'] });
        const tick = async () => {
          if (!alive || done.current || !video.current) return;
          try {
            const found = await det.detect(video.current);
            const hit = found.find((f) => f.rawValue);
            if (hit) {
              done.current = true;
              onData(hit.rawValue);
              return;
            }
          } catch {}
          timer = window.setTimeout(() => void tick(), 300);
        };
        void tick();
      } catch {
        if (alive) onFail('Kamera tidak bisa dibuka. Tempel kode teksnya saja.');
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onData, onFail]);
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '1', background: 'var(--text)' }}>
      <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}

function LinkDevice() {
  const { approveDeviceLink } = useSession();
  const [mode, setMode] = useState<'idle' | 'scan' | 'paste' | 'done'>('idle');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const canScan = !!detectorCtor();

  const approve = async (data: string) => {
    setBusy(true);
    setErr(null);
    try {
      await approveDeviceLink(data);
      setMode('done');
    } catch (e) {
      setErr(errMsg(e));
      setScanKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };
  const approveRef = useRef(approve);
  approveRef.current = approve;
  const scanData = useCallback((d: string) => void approveRef.current(d), []);
  const scanFail = useCallback((msg: string) => {
    setErr(msg);
    setMode('paste');
  }, []);

  if (mode === 'done') {
    return (
      <Note color="green" icon="ui-centang">
        Kunci sudah dikirim dengan aman. Perangkat barumu akan membuka arsip dalam beberapa detik.
      </Note>
    );
  }
  return (
    <div className="col" style={{ gap: 10 }}>
      <p className="small" style={{ margin: 0 }}>
        Di perangkat baru: masuk dengan email, lalu pilih “dari perangkat lama”. Salin kode teks yang muncul di sana (atau pindai QR-nya), lalu tempel di sini. Kuncimu dibungkus khusus untuk perangkat itu; server hanya meneruskan data teracak.
      </p>
      {mode === 'scan' ? <Scanner key={scanKey} onData={scanData} onFail={scanFail} /> : null}
      {mode === 'paste' ? (
        <>
          <span className="label">kode tautan</span>
          <textarea
            className="field"
            style={{ minHeight: 84, fontSize: 13 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="sehari-link:…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
          <div className="row" style={{ gap: 8 }}>
            {navigator.clipboard?.readText ? (
              <button
                className="btn ghost sm auto"
                onClick={() =>
                  void navigator.clipboard
                    .readText()
                    .then((t) => setText(t.trim()))
                    .catch(() => {})
                }>
                tempel dari papan klip
              </button>
            ) : null}
          </div>
          <button className="btn" onClick={() => void approve(text)} disabled={busy || !text.trim()}>
            {busy ? 'mengirim kunci…' : 'tautkan'}
          </button>
        </>
      ) : null}
      {mode === 'idle' ? (
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn soft grow" onClick={() => setMode('paste')}>
            <Doodle id="kunci" size={20} /> tempel kode tautan
          </button>
          {canScan ? (
            <button className="btn ghost grow" onClick={() => setMode('scan')}>
              <Doodle id="ui-qr" size={20} /> pindai QR
            </button>
          ) : null}
        </div>
      ) : null}
      {mode === 'scan' ? (
        <button className="btn ghost" onClick={() => setMode('paste')}>
          tempel kode saja
        </button>
      ) : null}
      {mode !== 'idle' ? (
        <button
          className="btn ghost"
          onClick={() => {
            setMode('idle');
            setErr(null);
          }}>
          batal
        </button>
      ) : null}
      {busy && mode === 'scan' ? <Growing label="mengirim kunci…" /> : null}
      <ErrText>{err}</ErrText>
    </div>
  );
}

function NewRecoveryCode() {
  const { identity, rebackup, refresh } = useSession();
  const toast = useToast();
  const t = COPY.onboarding.recoveryCode;
  const [step, setStep] = useState<'idle' | 'show' | 'check' | 'done'>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [check, setCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const groups = code?.split('-') ?? [];
  const lastGroup = groups[groups.length - 1] ?? '';

  const commit = async () => {
    if (!identity || !code) return;
    setBusy(true);
    setErr(null);
    try {
      // Identitas yang sama, dibungkus ulang dengan kode baru. Kode lama berhenti berlaku.
      await rebackup(code);
      await refresh().catch(() => null);
      setStep('done');
      setCode(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'idle' || step === 'done') {
    return (
      <div className="col" style={{ gap: 10 }}>
        {step === 'done' ? (
          <Note color="green" icon="ui-centang">
            Kode pemulihan baru sudah aktif. Kode lama tidak bisa dipakai lagi.
          </Note>
        ) : null}
        <p className="small" style={{ margin: 0 }}>
          Lupa menyimpan kode, atau khawatir ada yang melihatnya? Buat kode baru untuk kunci yang sama. Arsipmu tidak berubah; hanya kode lama yang berhenti berlaku.
        </p>
        <button
          className="btn soft"
          disabled={!identity}
          onClick={() => {
            setCode(generateRecoveryCode());
            setCheck('');
            setStep('show');
          }}>
          <Doodle id="kunci" size={20} /> buat kode pemulihan baru
        </button>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 10 }}>
      {step === 'show' ? (
        <>
          <p className="small" style={{ margin: 0 }}>{t.body}</p>
          <div className="col" style={{ background: 'var(--paper)', borderRadius: 18, alignItems: 'center', padding: '22px 12px', gap: 6 }}>
            {[0, 2, 4].map((i) => (
              <div key={i} className="title ink" style={{ letterSpacing: 4, userSelect: 'all' }}>
                {groups[i]} {groups[i + 1]}
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost grow" onClick={() => void navigator.clipboard?.writeText(code ?? '').then(() => toast('Kode disalin.'))}>
              {t.copy.toLowerCase()}
            </button>
            <button
              className="btn ghost grow"
              onClick={() => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([`Kode pemulihan Sehari\n\n${code}\n\nSimpan baik-baik. Tanpa kode ini dan tanpa perangkatmu, arsip tidak bisa dibuka.\n`], { type: 'text/plain' }));
                a.download = 'kode-pemulihan-sehari.txt';
                a.click();
              }}>
              unduh .txt
            </button>
          </div>
          <Note>{t.warning}</Note>
          <span className="tiny soft center">{t.tip}</span>
          <button className="btn" onClick={() => setStep('check')}>
            {t.confirm.toLowerCase()}
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setStep('idle');
              setCode(null);
            }}>
            batal, pakai kode lama
          </button>
        </>
      ) : (
        <>
          <p className="small soft center" style={{ margin: 0 }}>
            Untuk memastikan sudah tercatat: ketik kelompok terakhir kode barumu.
          </p>
          <input className="field center" style={{ fontSize: 26, letterSpacing: 10 }} maxLength={4} placeholder="XXXX" value={check} onChange={(e) => setCheck(e.target.value.toUpperCase())} autoFocus />
          <button className="btn" onClick={() => void commit()} disabled={busy || check.trim() !== lastGroup}>
            {busy ? 'menyimpan…' : 'aktifkan kode baru'}
          </button>
          <button className="btn ghost" onClick={() => setStep('show')}>
            lihat kode lagi
          </button>
          <ErrText center>{err}</ErrText>
        </>
      )}
    </div>
  );
}

export default function Keamanan() {
  return (
    <main className="screen">
      <Header title="keamanan & perangkat" backTo="/aku" />
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <Doodle id="ui-gembok" size={30} draw />
        <p className="small soft grow" style={{ margin: 0 }}>
          Kunci rahasiamu hanya hidup di perangkat yang kamu izinkan. Server menyimpan cadangannya dalam keadaan terkunci, dan hanya kode pemulihanmu yang bisa membukanya.
        </p>
      </div>

      <Section title="perangkat yang masuk">
        <Devices />
        <p className="tiny soft" style={{ margin: '8px 0 0' }}>
          Tidak kenal salah satunya? Keluarkan, lalu buat kode pemulihan baru di bawah.
        </p>
      </Section>

      <Section title="tautkan perangkat baru">
        <div className="card">
          <LinkDevice />
        </div>
      </Section>

      <Section title="kode pemulihan">
        <div className="card">
          <NewRecoveryCode />
        </div>
      </Section>

      <Section title="batas yang jujur">
        <Note color="blue" icon="ui-gembok">
          <div className="col" style={{ gap: 6 }}>
            <span className="small">{COPY.onboarding.recoveryCode.warning}</span>
            <span className="small">Enkripsi menjaga isi dari server dan orang luar, tapi tidak dari orang yang memegang perangkatmu dalam keadaan terbuka. Kunci layar perangkatmu, ya.</span>
          </div>
        </Note>
      </Section>
    </main>
  );
}
