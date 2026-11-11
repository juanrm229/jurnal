/**
 * Si Kepo: temuan pola dari jurnalmu setahun terakhir. Halaman dibuka dengan
 * kuncimu di perangkat ini, lalu dihitung di sini juga; tidak ada isi yang
 * dikirim ke server dan tidak ada AI yang membacanya.
 */
import { addDays, type DropWire, kepo, KEPO_MIN_DAYS, type KepoEntry } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { type CSSProperties, useMemo } from 'react';
import { api } from '@/lib/api';
import { useOpenDrops, useToday } from '@/lib/data';
import { navigate } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header } from '@/ui/kit';

const TILT = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.7];
const TINT = ['var(--sticky-yellow)', 'var(--sticky-blue)', 'var(--sticky-green)', 'var(--sticky-peach)'];

export default function Kepo() {
  const today = useToday();
  const from = addDays(today, -365);
  const q = useQuery({ queryKey: ['kepo', from, today], queryFn: () => api.get<DropWire[]>(`/me/drops?from=${from}&to=${today}`), staleTime: 10 * 60_000 });
  const open = useOpenDrops(q.data);
  const report = useMemo(() => {
    const entries: KepoEntry[] = [];
    for (const o of open) {
      const p = o.payload;
      if (!p || p.kind === 'sticker') continue;
      entries.push({ day: o.wire.day, hour: p.hour ?? 12, kind: p.kind, text: p.text, mood: p.mood, weather: p.weather?.code, cityId: p.cityId });
    }
    return kepo(entries);
  }, [open]);

  return (
    <main className="screen">
      <Header title="si kepo" sub="temuan dari jurnalmu sendiri" backTo="/kenangan" />
      <div className="kepo-hero">
        <span className="kepo-lens" aria-hidden>
          <Doodle id="ui-cari" size={54} className="sway" />
        </span>
        <p className="hand kepo-say">
          {report.findings.length ? `Aku membaca ${report.days} harimu. Jangan marah, ya. Ini yang kutemukan.` : 'Aku suka memperhatikan. Tapi belum banyak yang bisa kuperhatikan.'}
        </p>
      </div>

      {q.isLoading ? <Growing label="si kepo sedang membaca…" /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> : null}

      {q.data && !report.findings.length ? (
        <div className="card col center" style={{ alignItems: 'center', textAlign: 'center', gap: 10 }} data-testid="kepo-empty">
          <p className="small" style={{ margin: 0, maxWidth: 320 }}>
            Si Kepo butuh minimal {KEPO_MIN_DAYS} hari bertulisan sebelum berani menyimpulkan apa pun. Tinggal <b className="ink">{report.need} hari</b> lagi.
          </p>
          <span className="kt-bar" style={{ width: '70%', flex: 'none' }} aria-hidden>
            <i style={{ width: `${Math.round((report.days / KEPO_MIN_DAYS) * 100)}%` }} />
          </span>
          <button className="btn auto" onClick={() => navigate('/hari')}>
            tulis hari ini
          </button>
        </div>
      ) : null}

      <div className="kepo-list" data-testid="kepo-list">
        {report.findings.map((f, i) => (
          <article key={f.id} className="kepo-note rise" style={{ '--tilt': `${TILT[i % TILT.length]}deg`, background: TINT[i % TINT.length], animationDelay: `${i * 0.08}s` } as CSSProperties}>
            <span className="kepo-pin" aria-hidden />
            <Doodle id={f.doodle} size={30} />
            <div>
              <p className="hand kepo-title">{f.title}</p>
              <p className="kepo-proof">bukti: {f.proof}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="tiny soft center" style={{ margin: '18px auto 0', maxWidth: 340 }}>
        Dihitung di HP-mu dari halaman yang kamu tulis sendiri dalam setahun terakhir. Tidak ada isi yang keluar dari perangkat ini, dan tidak ada AI yang membacanya. Hanya hitung-hitungan yang kebetulan usil.
      </p>
    </main>
  );
}
