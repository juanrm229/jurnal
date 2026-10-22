import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { formatDate, Note } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useCircles } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Button, Card, Empty, ErrorNote, Gap, Growing, Header, Row, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

interface BlockRow {
  userId: string;
  createdAt: string;
}

export default function Blocked() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { circles } = useCircles();
  const q = useQuery({ queryKey: ['blocks'], queryFn: () => api.get<BlockRow[]>('/blocks') });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const who = (userId: string) => {
    for (const x of circles) {
      const m = x.members.find((m) => m.userId === userId);
      if (m) return { name: m.penName, doodle: m.doodle, from: x.name };
    }
    return null;
  };

  const unblock = async (userId: string) => {
    setBusy(userId);
    try {
      await api.del(`/blocks/${userId}`);
      setConfirm(null);
      await q.refetch();
      void qc.invalidateQueries({ queryKey: ['circles'] });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen header={<Header title="diblokir" />}>
      <Txt v="small" soft>
        Orang yang kamu blokir tidak bisa lagi mengirim apa pun kepadamu, dan Drop mereka tidak sampai ke kapsulmu. Mereka tidak diberi tahu.
      </Txt>
      <Gap />
      {q.isLoading ? (
        <Growing />
      ) : q.error ? (
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <Empty doodle="semak" title="Tidak ada yang diblokir" body="Semoga tetap begitu. Kalau suatu hari ada yang membuatmu tidak nyaman, kamu bisa memblokirnya dari pengaturan lingkaran." />
      ) : (
        <View style={{ gap: SPACE.sm }}>
          {q.data.map((b) => {
            const p = who(b.userId);
            return (
              <Card key={b.userId} testID={`blocked-${b.userId}`}>
                <Row gap={12}>
                  <Avatar doodle={p?.doodle ?? 'semak'} size={40} dim />
                  <View style={{ flex: 1 }}>
                    <Txt>{p?.name ?? 'seseorang'}</Txt>
                    <Txt v="tiny" soft>
                      {p ? `dari ${p.from} · ` : ''}diblokir {formatDate(b.createdAt)}
                    </Txt>
                  </View>
                  {confirm !== b.userId ? (
                    <Button kind="ghost" title="buka blokir" onPress={() => setConfirm(b.userId)} style={{ width: 'auto', minHeight: 36, paddingHorizontal: 12 }} testID={`unblock-${b.userId}`} />
                  ) : null}
                </Row>
                {confirm === b.userId ? (
                  <View style={{ marginTop: SPACE.sm, gap: 6 }}>
                    <Txt v="small">Buka blokir? Kalian tidak otomatis kembali ke lingkaran yang sudah ditinggalkan; itu butuh undangan baru.</Txt>
                    <Row gap={8}>
                      <Button title="ya, buka" onPress={() => void unblock(b.userId)} loading={busy === b.userId} style={{ flex: 1, minHeight: 40 }} testID={`unblock-confirm-${b.userId}`} />
                      <Button kind="ghost" title="batal" onPress={() => setConfirm(null)} style={{ flex: 1, minHeight: 40 }} />
                    </Row>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
      <Gap />
      <Note color="blue" icon="lilin">
        <Txt v="small" style={{ color: c.text }}>
          Kalau ada yang membuatmu merasa tidak aman, kamu tidak sendirian. Laporkan dari pengaturan lingkaran, atau buka Bantuan & dukungan.
        </Txt>
      </Note>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
