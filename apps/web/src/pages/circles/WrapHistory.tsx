/** Cerita kita: Minggu Kita & Bulan Kita dari minggu/bulan mana pun sejak lingkaran dibuat. */
import { wrapHistory, type WrapPeriod } from '@sehari/core';
import { useCalendar } from '@/lib/data';
import { Link } from '@/lib/router';
import { Doodle } from '@/ui/kit';

export function WrapHistory({ circleId, createdDay, today, moment }: { circleId: string; createdDay: string; today: string; moment: boolean }) {
  const { weeks, months } = wrapHistory(createdDay, today);
  const from = weeks[weeks.length - 1]!.start < months[months.length - 1]!.start ? weeks[weeks.length - 1]!.start : months[months.length - 1]!.start;
  const cal = useCalendar(circleId, from, today);
  const filled = (p: WrapPeriod) => (cal.data ? cal.data.some((d) => d.day >= p.start && d.day <= p.end && (d.dropCount > 0 || d.sealed.length > 0)) : true);
  const years = [...new Set(months.map((m) => m.key.slice(0, 4)))];
  const strip = (scope: 'week' | 'month', list: WrapPeriod[]) => (
    <div className="wrap-strip">
      {list.map((p) => (
        <Link key={p.key} className={`pill${p.current ? ' active' : ''}${filled(p) ? '' : ' wrap-empty'}`} to={`/wrap/${circleId}/${scope}/${p.key}`}>
          {p.label}
          {scope === 'month' && p.current ? ' · berjalan' : ''}
        </Link>
      ))}
    </div>
  );
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <Doodle id="amplop" size={18} />
        <span className="small ink">minggu kita</span>
      </div>
      {strip('week', weeks)}
      <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
        <Doodle id="pena" size={18} />
        <span className="small ink">bulan kita</span>
      </div>
      {strip('month', months)}
      <div className="row wrap" style={{ marginTop: 8 }}>
        {years.map((y) => (
          <Link key={y} className="pill" to={`/wrap/${circleId}/year/${y}`}>
            <Doodle id="buku" size={18} /> tahun kita {y}
          </Link>
        ))}
        {moment ? (
          <Link className="pill" to={`/wrap/${circleId}/moment/${circleId}`}>
            <Doodle id="kado" size={18} /> wrap acara
          </Link>
        ) : null}
      </div>
    </div>
  );
}
