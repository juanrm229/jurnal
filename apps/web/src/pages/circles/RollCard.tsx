/** Pintu masuk Rol Minggu Ini di halaman lingkaran. */
import { weekday } from '@sehari/core';
import { useToday } from '@/lib/data';
import { Link } from '@/lib/router';
import { Doodle } from '@/ui/kit';
import { MAX_ROLL, useRolls } from './Rol';

export function RollCard({ circleId, week, members }: { circleId: string; week: string; members: number }) {
  const today = useToday();
  const rolls = useRolls(circleId, week);
  const done = (rolls.data ?? []).length;
  const sunday = weekday(today) === 0 || weekday(today) === 6;
  return (
    <Link to={`/l/${circleId}/rol/${week}`} className={`card row mt rl-entry${sunday ? ' hot' : ''}`} style={{ gap: 12 }} data-testid="roll-entry">
      <Doodle id="kamera" size={30} />
      <span className="grow">
        <span className="small" style={{ display: 'block' }}>
          <b className="ink">Rol minggu ini</b> · pilih {MAX_ROLL} foto favorit seminggu
        </span>
        <span className="tiny soft">
          {done ? `${done} dari ${members} orang sudah memilih` : sunday ? 'Minggu sore waktunya memilih, sebelum jadi Minggu Kita.' : 'Bisa dipilih kapan saja minggu ini.'}
        </span>
      </span>
      <Doodle id="ui-panah-kanan" size={18} />
    </Link>
  );
}
