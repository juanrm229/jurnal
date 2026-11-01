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
    <Link to={`/l/${circleId}/rol/${week}`} className={`ch-row rl-entry${sunday ? ' hot' : ''}`} data-testid="roll-entry">
      <Doodle id="kamera" size={26} />
      <span className="grow">
        <span className="small" style={{ display: 'block' }}>
          <b className="ink">Rol minggu ini</b> · {MAX_ROLL} foto favorit
        </span>
        <span className="tiny soft">
          {done ? `${done} dari ${members} orang sudah memilih` : sunday ? 'Minggu sore waktunya memilih, sebelum jadi Minggu Kita.' : 'Bisa dipilih kapan saja minggu ini.'}
        </span>
      </span>
      <Doodle id="ui-panah-kanan" size={16} />
    </Link>
  );
}
