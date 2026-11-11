/** Kerangka bersama layar utama: judul layar, serta cari dan avatar di pojok kanan atas. */
import type { ReactNode } from 'react';
import { useMe } from '@/lib/data';
import { Link } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Avatar, Doodle } from './kit';
import { openLaci } from './Laci';

function Actions() {
  const me = useMe();
  return (
    <div className="top-actions">
      <button type="button" className="icon-btn" onClick={openLaci} aria-label="cari semua fitur" data-testid="open-laci">
        <Doodle id="ui-cari" size={24} />
      </button>
      <Link to="/aku" className="top-me" aria-label="aku" data-testid="open-aku">
        <Avatar doodle={me.user.doodle} size={30} />
      </Link>
    </div>
  );
}

/** Cari + avatar. Tidak tampil untuk tamu (mis. Ruang Main tanpa akun). */
export function TopActions() {
  const { status } = useSession();
  return status === 'ready' ? <Actions /> : null;
}

/** Judul layar utama: nama ruang di kiri, tindakan di kanan. */
export function ScreenTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="stitle">
      <div className="stitle-row">
        <h1>{title}</h1>
        <div className="stitle-right">
          {right}
          <TopActions />
        </div>
      </div>
      {sub ? <p>{sub}</p> : null}
    </header>
  );
}
