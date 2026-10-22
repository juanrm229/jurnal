import { Link } from '@/lib/router';
import { Doodle } from './kit';

const TABS = [
  { to: '/hari', label: 'hari ini', icon: 'ui-hari-ini' },
  { to: '/lingkaran', label: 'lingkaran', icon: 'ui-lingkaran' },
  { to: '/kenangan', label: 'kenangan', icon: 'ui-kenangan' },
  { to: '/aku', label: 'aku', icon: 'ui-aku' },
];

export function TabBar({ path }: { path: string }) {
  return (
    <nav className="tabbar" aria-label="navigasi">
      {TABS.map((t) => (
        <Link key={t.to} to={t.to} className={path.startsWith(t.to) ? 'on' : ''} aria-current={path.startsWith(t.to) ? 'page' : undefined}>
          <Doodle id={t.icon} size={24} color={path.startsWith(t.to) ? 'var(--ink)' : 'var(--ink-soft)'} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
