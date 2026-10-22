import { CIRCLE_KIND_LABEL, type InvitePreview } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { acceptInvite, pendingInvite } from '@/lib/circles';
import { qk } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Scene } from '@/ui/art';
import { Avatar, Growing } from '@/ui/kit';

/** Halaman undangan. Rahasia kunci ada di fragmen (#…), tak pernah sampai ke server. */
export default function Join() {
  const { token } = useParams<{ token: string }>();
  const { status, me, identity } = useSession();
  const qc = useQueryClient();
  const [fragment] = useState(() => location.hash.replace(/^#/, ''));
  const preview = useQuery({ queryKey: ['invite', token], queryFn: () => api.get<InvitePreview>(`/invites/${token}`) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const accept = async () => {
    if (!fragment) return setErr('Tautan undangan tidak lengkap. Minta tautan baru, ya.');
    if (status !== 'ready' || !me || !identity) {
      pendingInvite.value = { token, fragment };
      navigate(status === 'signed_out' ? '/masuk' : '/mulai/undang', { replace: true });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const id = await acceptInvite(identity, me.user.id, token, fragment);
      await qc.invalidateQueries({ queryKey: qk.circles });
      navigate(`/l/${id}`, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (preview.isLoading) return <Growing label="membuka undangan…" />;
  const p = preview.data;
  return (
    <main className="screen">
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <Scene id={p?.kind === 'duo' ? 'dua-orang' : 'rumah-kecil'} />
      </div>
      <div className="col center" style={{ alignItems: 'center', gap: 14 }}>
        {p ? <Avatar doodle={p.inviter.doodle} size={72} sealed /> : null}
        <div className="title ink">{p ? `${p.inviter.penName} mengajakmu` : 'undangan tidak ditemukan'}</div>
        {p ? (
          <div className="card" style={{ alignSelf: 'stretch' }}>
            <p>{p.kind === 'duo' ? 'menyimpan hari berdua, setiap hari.' : `bergabung ke ${CIRCLE_KIND_LABEL[p.kind]} · ${p.memberCount} orang`}</p>
            <p className="tiny soft">Satu hal kecil sehari, disegel bersama setiap malam. Isinya terenkripsi end-to-end.</p>
          </div>
        ) : null}
        {p && !p.valid ? <p className="soft">{p.reason === 'expired' ? 'Undangan ini sudah kedaluwarsa.' : p.reason === 'full' ? 'Lingkaran ini sudah penuh.' : 'Undangan ini sudah tidak berlaku.'}</p> : null}
        {err ? <p className="small" style={{ color: 'var(--danger)' }}>{err}</p> : null}
        {p?.valid ? <button className="btn" disabled={busy} onClick={accept}>{busy ? 'membuka kunci…' : 'terima undangan'}</button> : null}
      </div>
    </main>
  );
}
