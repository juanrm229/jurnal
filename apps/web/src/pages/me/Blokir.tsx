/** Daftar orang yang diblokir, dengan buka blokir. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { qk, useCircles } from '@/lib/data';
import { Link } from '@/lib/router';
import { Avatar, Empty, ErrorNote, Growing, Header } from '@/ui/kit';
import { ErrText, errMsg, formatDate, Note } from './kit';

interface BlockRow {
  userId: string;
  createdAt: string;
}

export default function Blokir() {
  const qc = useQueryClient();
  const { circles } = useCircles();
  const q = useQuery({ queryKey: ['blocks'], queryFn: () => api.get<BlockRow[]>('/blocks') });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const who = (userId: string) => {
    for (const x of circles) {
      const m = x.members.find((m) => m.userId === userId);
      if (m) return { name: m.penName, doodle: m.doodle, from: x.name };
    }
    return null;
  };

  const unblock = async (userId: string) => {
    setBusy(userId);
    setErr(null);
    try {
      await api.del(`/blocks/${userId}`);
      setConfirm(null);
      await q.refetch();
      void qc.invalidateQueries({ queryKey: qk.circles });
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="screen">
      <Header title="diblokir" backTo="/aku" />
      <p className="small soft" style={{ margin: '0 0 16px' }}>
        Orang yang kamu blokir tidak bisa lagi mengirim apa pun kepadamu, dan Drop mereka tidak sampai ke kapsulmu. Mereka tidak diberi tahu.
      </p>
      {q.isLoading ? (
        <Growing />
      ) : q.error ? (
        <ErrorNote error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <Empty doodle="semak" title="Tidak ada yang diblokir" body="Semoga tetap begitu. Kalau suatu hari ada yang membuatmu tidak nyaman, kamu bisa memblokirnya dari pengaturan lingkaran." />
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {q.data.map((b) => {
            const p = who(b.userId);
            return (
              <div key={b.userId} className="card">
                <div className="row" style={{ gap: 12 }}>
                  <Avatar doodle={p?.doodle ?? 'semak'} size={40} dim />
                  <div className="grow">
                    <div>{p?.name ?? 'seseorang'}</div>
                    <div className="tiny soft">
                      {p ? `dari ${p.from} · ` : ''}diblokir {formatDate(b.createdAt)}
                    </div>
                  </div>
                  {confirm !== b.userId ? (
                    <button className="btn ghost sm auto" onClick={() => setConfirm(b.userId)}>
                      buka blokir
                    </button>
                  ) : null}
                </div>
                {confirm === b.userId ? (
                  <div className="col rise" style={{ marginTop: 10, gap: 8 }}>
                    <span className="small">Buka blokir? Kalian tidak otomatis kembali ke lingkaran yang sudah ditinggalkan; itu butuh undangan baru.</span>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn sm grow" onClick={() => void unblock(b.userId)} disabled={busy === b.userId}>
                        {busy === b.userId ? 'sebentar…' : 'ya, buka'}
                      </button>
                      <button className="btn ghost sm grow" onClick={() => setConfirm(null)}>
                        batal
                      </button>
                    </div>
                    <ErrText>{err}</ErrText>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <Note color="blue" icon="lilin" style={{ marginTop: 20 }}>
        <span className="small">
          Kalau ada yang membuatmu merasa tidak aman, kamu tidak sendirian. Laporkan dari pengaturan lingkaran, atau buka <Link to="/bantuan">Bantuan & dukungan</Link>.
        </span>
      </Note>
    </main>
  );
}
