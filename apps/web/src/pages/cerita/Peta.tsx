/** Peta Cerita: siapa tahu apa, garis waktu, perjalanan jejak, cek kesinambungan, dan palet. */
import { type CSSProperties, useState } from 'react';
import { Avatar } from '@/ui/kit';
import { FactCard } from './Baca';
import type { StoryModel } from './kit';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function Peta({ m }: { m: StoryModel }) {
  const { st, main } = m;
  const rounds = Array.from({ length: Math.min(st.round, st.rounds) }, (_, i) => i + 1);
  const sah = m.sah;
  const traces = main.map((p) => ({ p, h: m.handoffOf(p) })).filter((x) => x.h?.trace);
  const later = (round: number) => new Set(main.filter((p) => p.round > round).map((p) => m.tokohOf(p).toLowerCase()));
  // Cek kesinambungan dari Peta, tanpa membaca prosa.
  const checks: string[] = [];
  for (const { p, h } of traces) {
    if (p.round < st.round && h!.trace!.knows.length && !h!.trace!.knows.some((t) => later(p.round).has(t.toLowerCase()))) checks.push(`Jejak “${h!.trace!.what}” belum diterima tokoh mana pun di gelombang berikutnya.`);
  }
  const stale = m.facts.filter((f) => f.state === 'tunda' && f.round < st.round);
  if (stale.length) checks.push(`${stale.length} fakta masih ditunda sejak gelombang sebelumnya.`);
  const open = st.notes.filter((x) => !x.resolution);
  if (open.length) checks.push(`${open.length} sanggahan belum punya jalan keluar.`);
  for (const f of sah) for (const t of f.f.knows) if (f.f.believes.some((b) => same(b, t))) checks.push(`${t} tercatat tahu sekaligus mengira: “${f.f.sentence}”.`);

  return (
    <div className="peta-cerita">
      <section className="section">
        <span className="label">peta pengetahuan · siapa tahu apa</span>
        {sah.length ? (
          <div className="peta-scroll">
            <table className="peta-mx" data-testid="peta-mx">
              <thead>
                <tr>
                  <th />
                  {m.tokohs.map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sah.map((f, i) => (
                  <tr key={f.id} style={{ '--n': i } as CSSProperties}>
                    <th>
                      {f.f.sentence}
                      <small>
                        {f.f.mystery ? 'misteri disengaja' : f.f.scope} · gelombang {f.round}
                      </small>
                    </th>
                    {f.f.mystery ? (
                      <td colSpan={m.tokohs.length} className="mx-misteri">
                        dibiarkan terbuka
                      </td>
                    ) : (
                      m.tokohs.map((t) => (
                        <td key={t}>
                          <i className={`mx ${f.f.knows.some((x) => same(x, t)) ? 'tahu' : f.f.believes.some((x) => same(x, t)) ? 'kira' : 'tidak'}`} title={t} />
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small soft">Belum ada fakta yang disepakati. Fakta lahir di ruang baca: usulkan satu kalimat, lalu semua penulis menyetujuinya.</p>
        )}
        <div className="mx-legend">
          <span>
            <i className="mx tahu" /> tahu
          </span>
          <span>
            <i className="mx kira" /> mengira
          </span>
          <span>
            <i className="mx tidak" /> tidak tahu, tampil tersensor di kartunya
          </span>
        </div>
      </section>

      {checks.length ? (
        <section className="section">
          <span className="label">kesinambungan</span>
          <ul className="cek">
            {checks.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <span className="label">garis waktu</span>
        <ol className="garis-waktu">
          {rounds.map((r) => {
            const ps = main.filter((p) => p.round === r);
            return (
              <li key={r}>
                <span className="gw-waktu">{m.waktuOf(r)}</span>
                <div className="gw-adegan">
                  {ps.length ? (
                    ps.map((p) => {
                      const h = m.handoffOf(p);
                      return (
                        <span key={p.id} className={`gw-a ${p.sealed ? '' : 'draf'}`}>
                          <Avatar doodle={m.face(p.authorId)} size={16} />
                          {h?.tokoh ?? (p.sealed ? 'tersegel' : 'ditulis')}
                          {h?.waktu ? <small>{h.waktu}</small> : null}
                        </span>
                      );
                    })
                  ) : (
                    <span className="tiny soft">belum ada bagian</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {traces.length ? (
        <section className="section">
          <span className="label">perjalanan jejak</span>
          <ol className="jejak-jalur">
            {traces.map(({ p, h }, i) => (
              <li key={p.id} style={{ '--n': i } as CSSProperties}>
                <span className="tiny soft">
                  gelombang {p.round} · {h!.tokoh}
                </span>
                <b>{h!.trace!.what}</b>
                <span className="tiny">→ {h!.trace!.knows.length ? h!.trace!.knows.join(', ') : 'tidak ada penerima'}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {m.facts.some((f) => f.state === 'diganti') ? (
        <section className="section">
          <span className="label">riwayat revisi</span>
          <div className="col" style={{ gap: 8 }}>
            {m.facts
              .filter((f) => f.state === 'diganti')
              .map((f) => (
                <FactCard key={f.id} m={m} f={f} />
              ))}
          </div>
        </section>
      ) : null}

      <Palet m={m} />
    </div>
  );
}

/** Palet: yang ingin ada, garis, dan tirai. Ditambahkan tanpa nama. */
function Palet({ m }: { m: StoryModel }) {
  const [kind, setKind] = useState<'boleh' | 'garis' | 'tirai'>('garis');
  const [text, setText] = useState('');
  const p = m.palette;
  return (
    <section className="section palet" data-testid="palet">
      <span className="label">palet meja</span>
      <div className="palet-k">
        <div>
          <i>ingin ada</i>
          {p.boleh.length ? p.boleh.join(' · ') : <span className="soft">belum ada</span>}
        </div>
        <div>
          <i>garis · tidak muncul sama sekali</i>
          {p.garis.length ? p.garis.join(' · ') : <span className="soft">belum ada</span>}
        </div>
        <div>
          <i>tirai · terjadi di luar layar</i>
          {p.tirai.length ? p.tirai.join(' · ') : <span className="soft">belum ada</span>}
        </div>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {(['boleh', 'garis', 'tirai'] as const).map((k) => (
          <button key={k} className={`pill sm ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>
            {k === 'boleh' ? 'ingin ada' : k}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="field grow" value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="tambahkan tanpa nama" />
        <button
          className="btn sm auto"
          disabled={!text.trim()}
          onClick={async () => {
            const ok = await m.run(() => m.post('/palette', { envelope: m.seal({ v: 1, boleh: kind === 'boleh' ? [text.trim()] : [], garis: kind === 'garis' ? [text.trim()] : [], tirai: kind === 'tirai' ? [text.trim()] : [] }) }));
            if (ok) setText('');
          }}>
          tambah
        </button>
      </div>
    </section>
  );
}
