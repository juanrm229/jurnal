import { useEffect, useState } from 'react';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { QR } from '@/ui/art';
import { Doodle, useToast } from '@/ui/kit';

/** Perangkat baru: pulihkan dengan kode, atau tautkan dari perangkat lama. */
export default function Pulihkan() {
  const { restoreWithCode, startDeviceLink, signOut } = useSession();
  const toast = useToast();
  const [mode, setMode] = useState<'code' | 'link'>('code');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'link') return;
    let cancel: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        const link = await startDeviceLink();
        cancel = link.cancel;
        if (!alive) return link.cancel();
        setQr(link.qr);
        await link.wait();
        navigate('/hari', { replace: true });
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
    })();
    return () => {
      alive = false;
      cancel?.();
    };
  }, [mode, startDeviceLink]);

  const restore = async () => {
    setBusy(true);
    setErr(null);
    try {
      await restoreWithCode(code);
      navigate('/hari', { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="pill" onClick={() => void signOut()}>keluar</button>
      </div>
      <div className="col center" style={{ alignItems: 'center' }}>
        <Doodle id="kunci" size={64} draw />
        <div className="title ink">selamat datang kembali</div>
        <p className="soft" style={{ maxWidth: 440 }}>Akun ini sudah punya kunci. Buka arsipmu di perangkat ini dengan salah satu cara berikut.</p>
      </div>
      <div className="row mt-lg" style={{ gap: 8 }}>
        <button className={`pill grow ${mode === 'code' ? 'active' : ''}`} onClick={() => setMode('code')}>kode pemulihan</button>
        <button className={`pill grow ${mode === 'link' ? 'active' : ''}`} onClick={() => setMode('link')}>dari perangkat lama</button>
      </div>
      {mode === 'code' ? (
        <div className="col gap-lg mt-lg">
          <input className="field" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoFocus />
          <button className="btn" disabled={busy || code.replace(/[^0-9a-z]/gi, '').length !== 24} onClick={restore}>{busy ? 'membuka arsip…' : 'pulihkan arsip'}</button>
        </div>
      ) : (
        <div className="card col center mt-lg" style={{ alignItems: 'center', gap: 14 }}>
          {qr ? <QR value={qr} /> : <span className="soft">menyiapkan kode…</span>}
          <p className="small">Di perangkat lama: <b>Aku → Keamanan → Tautkan perangkat</b>, lalu pindai kode ini — atau tempel kode teksnya.</p>
          {qr ? <button className="pill" onClick={() => navigator.clipboard.writeText(qr).then(() => toast('Kode tautan disalin.'))}>salin kode teks</button> : null}
        </div>
      )}
      {err ? <p className="small center mt" style={{ color: 'var(--danger)' }}>{err}</p> : null}
    </main>
  );
}
