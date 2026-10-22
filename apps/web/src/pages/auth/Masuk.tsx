import { useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Scene } from '@/ui/art';
import { Doodle } from '@/ui/kit';

/** Masuk tanpa kata sandi: kode 6 angka ke email. */
export default function Masuk() {
  const { requestCode, verify } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string>();

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await requestCode(email.trim());
      setDevCode(r.devCode);
      setStep('code');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const check = async (c = code) => {
    setBusy(true);
    setErr(null);
    try {
      await verify(email.trim(), c.trim());
      navigate('/hari', { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen auth">
      <Link to="/" className="row" style={{ marginBottom: 8 }}>
        <Doodle id="tunas" size={26} /> <span className="h2">sehari</span>
      </Link>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Scene id="amplop-segel" />
      </div>
      <form
        className="col gap-lg"
        style={{ maxWidth: 420, margin: '8px auto 0' }}
        onSubmit={(e) => {
          e.preventDefault();
          void (step === 'email' ? send() : check());
        }}>
        {step === 'email' ? (
          <>
            <div className="center">
              <div className="title ink">masuk ke kapsul</div>
              <p className="small soft">Tanpa kata sandi. Kami kirim kode 6 angka ke emailmu.</p>
            </div>
            <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="kamu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            <button className="btn" disabled={busy || !/.+@.+\..+/.test(email)}>{busy ? 'mengirim…' : 'kirim kode'}</button>
          </>
        ) : (
          <>
            <div className="center">
              <div className="title ink">cek emailmu</div>
              <p className="small soft">Kode terkirim ke {email}. Kadang mampir ke folder spam dulu.</p>
            </div>
            <input
              className="field center"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              value={code}
              style={{ fontSize: 30, letterSpacing: 12 }}
              autoFocus
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (v.length === 6) void check(v);
              }}
            />
            {devCode ? <p className="tiny soft center">mode pengembangan · kode: {devCode}</p> : null}
            <button className="btn" disabled={busy || code.length !== 6}>{busy ? 'membuka…' : 'masuk'}</button>
            <button type="button" className="btn ghost" onClick={() => { setStep('email'); setCode(''); }}>ganti email</button>
          </>
        )}
        {err ? <p className="small center" style={{ color: 'var(--danger)' }}>{err}</p> : null}
        <p className="tiny soft center">Dengan masuk, kamu setuju menyimpan hari dengan baik hati. Isi jurnalmu terenkripsi end-to-end — kami tidak bisa membacanya.</p>
      </form>
    </main>
  );
}
