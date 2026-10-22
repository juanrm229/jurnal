import { addDays, CIRCLE_KIND_LABEL, type CircleKind } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createCircle } from '@/lib/circles';
import { qk, useToday } from '@/lib/data';
import { navigate, usePath } from '@/lib/router';
import { useReady } from '@/lib/session';
import { Doodle, Header, Toggle } from '@/ui/kit';

const KINDS: { kind: CircleKind; doodle: string; hint: string }[] = [
  { kind: 'duo', doodle: 'ui-peluk', hint: '2 orang: pasangan, sahabat, saudara, LDR' },
  { kind: 'circle', doodle: 'ui-lingkaran', hint: '3–8 orang: geng sahabat, teman kos, teman kantor dekat' },
  { kind: 'chosen_family', doodle: 'rumah', hint: '3–8 orang yang kamu anggap keluarga, sedarah atau tidak' },
  { kind: 'moment', doodle: 'kado', hint: 'acara: nikahan, liburan, wisuda, reuni — tamu menulis, lalu jadi Wrap acara' },
];
const DOODLES = ['tunas', 'ui-peluk', 'rumah', 'bunga-matahari', 'kaktus', 'cangkir', 'gitar', 'sepeda', 'kucing', 'jamur', 'labu', 'surat-botol', 'hati-dua', 'kereta', 'bulan', 'kupu-kupu'];

export default function NewCircle() {
  const { search } = usePath();
  const { identity } = useReady();
  const qc = useQueryClient();
  const today = useToday();
  const [kind, setKind] = useState<CircleKind>((search.get('kind') as CircleKind) ?? 'duo');
  const [name, setName] = useState('');
  const [doodle, setDoodle] = useState('tunas');
  const [startsOn, setStartsOn] = useState(today);
  const [days, setDays] = useState(1);
  const [openMode, setOpenMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { circle } = await createCircle(identity, {
        kind,
        name: name.trim() || CIRCLE_KIND_LABEL[kind],
        doodle,
        moment: kind === 'moment' ? { startsOn, endsOn: addDays(startsOn, days - 1) } : undefined,
        settings: openMode && kind !== 'moment' ? { revealMode: 'open' } : undefined,
      });
      await qc.invalidateQueries({ queryKey: qk.circles });
      navigate(`/l/${circle.id}/undang`, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <Header title="lingkaran baru" backTo="/lingkaran" />
      <div className="col">
        {KINDS.map((k) => (
          <button key={k.kind} className="card row" style={{ textAlign: 'left', gap: 14, background: k.kind === kind ? 'var(--pill)' : undefined }} onClick={() => setKind(k.kind)}>
            <Doodle id={k.doodle} size={34} draw={k.kind === kind} key={`${k.kind}${k.kind === kind}`} />
            <span>
              <span className="h2 ink" style={{ display: 'block' }}>{CIRCLE_KIND_LABEL[k.kind].toLowerCase()}</span>
              <span className="tiny soft">{k.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <section className="section">
        <span className="label">{kind === 'moment' ? 'nama acara' : 'nama lingkaran'}</span>
        <input className="field" value={name} maxLength={60} placeholder={kind === 'moment' ? 'Nikahan Dina & Bima' : 'hanya terlihat oleh kalian'} onChange={(e) => setName(e.target.value)} />
      </section>
      <section className="section">
        <span className="label">doodle</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {DOODLES.map((d) => (
            <button key={d} aria-label={d} aria-pressed={d === doodle} onClick={() => setDoodle(d)} style={{ padding: 8, borderRadius: 14, border: 0, background: d === doodle ? 'var(--pill)' : 'var(--card)' }}>
              <Doodle id={d} size={30} />
            </button>
          ))}
        </div>
      </section>
      {kind === 'moment' ? (
        <section className="section">
          <span className="label">kapan acaranya</span>
          <div className="row wrap">
            {[0, 1, 7, 14, 30].map((d) => (
              <button key={d} className={`pill ${startsOn === addDays(today, d) ? 'active' : ''}`} onClick={() => setStartsOn(addDays(today, d))}>{d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`}</button>
            ))}
          </div>
          <div className="row wrap mt">
            {[1, 2, 3, 7].map((d) => (
              <button key={d} className={`pill ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d} hari</button>
            ))}
          </div>
        </section>
      ) : (
        <Toggle label="kapsul terbuka kapan saja" value={openMode} onChange={setOpenMode} hint="Bawaannya, kapsul teman terbuka setelah kamu menyegel kapsulmu sendiri. Nyalakan bila kalian lebih suka saling melihat sepanjang hari." />
      )}
      {err ? <p className="small" style={{ color: 'var(--danger)' }}>{err}</p> : null}
      <button className="btn mt-lg" disabled={busy} onClick={create}>{busy ? 'membuat…' : 'buat'}</button>
    </main>
  );
}
