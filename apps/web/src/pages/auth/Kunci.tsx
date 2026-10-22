import { COPY } from '@sehari/core';
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Doodle, useToast } from '@/ui/kit';

/** Kunci dibuat di peramban ini. Kode pemulihan ditampilkan sekali, lalu dicek. */
export default function Kunci() {
  const { draftKeys, commitKeys } = useSession();
  const toast = useToast();
  const t = COPY.onboarding.recoveryCode;
  // Sekali per kunjungan: kode tidak boleh berubah setelah dicatat.
  const [draft] = useState(draftKeys);
  const [step, setStep] = useState<'show' | 'check'>('show');
  const [check, setCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const groups = draft.code.split('-');
  const last = groups[groups.length - 1]!;

  const commit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await commitKeys(draft);
      navigate('/mulai/undang', { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <div className="col center rise" style={{ alignItems: 'center', marginTop: 24 }}>
        <Doodle id="kunci" size={72} draw />
        <div className="title ink">{t.title}</div>
        <p style={{ maxWidth: 460 }}>{t.body}</p>
      </div>
      {step === 'show' ? (
        <div className="col gap-lg mt-lg">
          <div className="card col center" style={{ alignItems: 'center', padding: '26px 12px' }}>
            {[0, 2, 4].map((i) => (
              <div key={i} className="title ink" style={{ letterSpacing: 4, userSelect: 'all' }}>{groups[i]} {groups[i + 1]}</div>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost grow" onClick={() => navigator.clipboard.writeText(draft.code).then(() => toast('Kode disalin.'))}>{t.copy.toLowerCase()}</button>
            <button className="btn ghost grow" onClick={() => {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([`Kode pemulihan Sehari\n\n${draft.code}\n\nSimpan baik-baik. Tanpa kode ini dan tanpa perangkatmu, arsip tidak bisa dibuka.\n`], { type: 'text/plain' }));
              a.download = 'kode-pemulihan-sehari.txt';
              a.click();
            }}>unduh .txt</button>
          </div>
          <div className="sticky" style={{ background: 'var(--sticky-yellow)' }}><span className="small">{t.warning}</span></div>
          <p className="tiny soft center">{t.tip}</p>
          <button className="btn" onClick={() => setStep('check')}>{t.confirm.toLowerCase()}</button>
        </div>
      ) : (
        <div className="col gap-lg mt-lg">
          <p className="small soft center">Untuk memastikan sudah tercatat: ketik kelompok terakhir kode pemulihanmu.</p>
          <input className="field center" style={{ fontSize: 28, letterSpacing: 10 }} maxLength={4} placeholder="XXXX" value={check} onChange={(e) => setCheck(e.target.value.toUpperCase())} autoFocus />
          {err ? <p className="small center" style={{ color: 'var(--danger)' }}>{err}</p> : null}
          <button className="btn" disabled={busy || check.trim() !== last} onClick={commit}>{busy ? 'menyimpan…' : 'simpan kunci'}</button>
          <button className="btn ghost" onClick={() => setStep('show')}>lihat kode lagi</button>
        </div>
      )}
    </main>
  );
}
