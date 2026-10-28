/**
 * Tujuan "Bagikan" dari aplikasi lain (share target PWA): tautan dari
 * marketplace, Pinterest, atau peta langsung ditempel ke papan inspirasi
 * lingkaran pilihanmu.
 */
import { useCircles } from '@/lib/data';
import { navigate, usePath } from '@/lib/router';
import { Avatar, Empty, Header, ListLink, Screen } from '@/ui/kit';
import { hostOf } from '@/lib/board';

export default function Bagikan() {
  const { search } = usePath();
  const { circles } = useCircles();
  const url = search.get('url') || /https?:\/\/\S+/.exec(search.get('text') ?? '')?.[0] || '';
  const title = search.get('title') || '';
  const active = circles.filter((c) => c.status === 'active' && c.me?.state === 'active');
  const go = (id: string) => navigate(`/l/${id}/inspirasi?${new URLSearchParams({ url, title })}`, { replace: true });
  return (
    <Screen>
      <Header title="tempel ke papan" sub={url ? hostOf(url) : undefined} backTo="/lingkaran" />
      {!url ? (
        <Empty doodle="klip-kertas" title="Tidak ada tautan yang dibagikan." body="Bagikan tautan dari aplikasi lain ke Sehari untuk menempelnya di papan inspirasi." />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          <p className="rupa-hand" style={{ fontSize: 28, margin: '6px 0' }}>{title || 'tempel ke papan siapa?'}</p>
          {active.map((c) => (
            <ListLink key={c.id} title={c.name} sub="papan inspirasi" onClick={() => go(c.id)} right={<Avatar doodle={c.doodle} size={28} />} />
          ))}
        </div>
      )}
    </Screen>
  );
}
