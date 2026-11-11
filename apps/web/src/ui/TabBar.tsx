/**
 * Empat ruang: Hari ini (menulis), Kita (bersama), Rak (mengenang), Main (bermain).
 * Tab yang sama hadir di setiap layar utama; coretan tinta meluncur ke ruang aktif.
 */
import type { CSSProperties } from 'react';
import { useCircles } from '@/lib/data';
import { Link, tabIndex } from '@/lib/router';
import { store } from '@/lib/storage';
import { Doodle } from './kit';

const TABS = [
  { to: '/hari', label: 'hari ini', icon: 'ui-hari-ini' },
  { to: '/lingkaran', label: 'kita', icon: 'ui-lingkaran' },
  { to: '/kenangan', label: 'rak', icon: 'buku' },
  { to: '/main', label: 'main', icon: 'dadu' },
] as const;

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* tidak semua perangkat bergetar */
  }
};

export function TabBar({ path }: { path: string }) {
  const { circles } = useCircles();
  const mine = circles.filter((c) => c.status === 'active' && c.me?.state === 'active');
  // Satu lingkaran: tab Kita langsung membukanya.
  // Beberapa lingkaran: kembali ke yang terakhir dibuka (pemindahnya ada di atas berandanya).
  const last = mine.find((c) => c.id === store.get('lastCircle'));
  const kita = mine.length === 1 ? `/l/${mine[0]!.id}` : last ? `/l/${last.id}` : '/lingkaran';
  const at = tabIndex(path);
  return (
    <nav className="tabs" aria-label="ruang">
      <span className="tabs-ink" style={{ '--i': Math.max(0, at) } as CSSProperties} data-none={at < 0 ? 1 : undefined} aria-hidden>
        <svg viewBox="0 0 30 8" key={at}>
          <path d="M2 5.2C7 2.4 11.5 6.6 16 4.4S24.5 2.6 28 4.6" pathLength={1} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      </span>
      {TABS.map((t, i) => {
        const on = i === at;
        return (
          <Link key={t.to} to={i === 1 ? kita : t.to} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={buzz} data-testid={`tab-${t.label.replace(' ', '-')}`}>
            <Doodle key={on ? 'on' : 'off'} id={t.icon} size={24} color="currentColor" draw={on} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
