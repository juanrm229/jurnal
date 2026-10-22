import { CIRCLE_KIND_LABEL, type InvitePreview } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { api } from '@/lib/api';
import { acceptInvite, pendingInvite } from '@/lib/circles';
import { qk } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Growing, Screen, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/** Halaman undangan. Rahasia kunci ada di fragmen (#…) atau parameter k. */
export default function Join() {
  const { token, k } = useLocalSearchParams<{ token: string; k?: string }>();
  const { status, me, identity } = useSession();
  const qc = useQueryClient();
  const fragment = k ?? (Platform.OS === 'web' && typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '');
  const preview = useQuery({ queryKey: ['invite', token], queryFn: () => api.get<InvitePreview>(`/invites/${token}`) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const accept = async () => {
    if (!fragment) return setErr('Tautan undangan tidak lengkap. Minta tautan baru, ya.');
    if (status !== 'ready' || !me || !identity) {
      pendingInvite.value = { token, fragment };
      router.replace('/');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const id = await acceptInvite(identity, me.user.id, token, fragment);
      await qc.invalidateQueries({ queryKey: qk.circles });
      router.replace(`/l/${id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (preview.isLoading) return <Screen><Growing label="membuka undangan…" /></Screen>;
  const p = preview.data;
  return (
    <Screen footer={p?.valid ? <Button title="Terima undangan" onPress={accept} loading={busy} testID="accept-invite" /> : undefined}>
      <Gap h={SPACE.xxl} />
      <View style={{ alignItems: 'center', gap: SPACE.md }}>
        {p ? <Avatar doodle={p.inviter.doodle} size={84} sealed /> : <Doodle id="amplop" size={72} />}
        <Txt v="title" ink center>
          {p ? `${p.inviter.penName} mengajakmu` : 'Undangan tidak ditemukan'}
        </Txt>
        {p ? (
          <Card style={{ alignItems: 'center', gap: 6, alignSelf: 'stretch' }}>
            <Txt center>
              {p.kind === 'duo' ? 'menyimpan hari berdua, setiap hari.' : `bergabung ke ${CIRCLE_KIND_LABEL[p.kind]} · ${p.memberCount} orang`}
            </Txt>
            <Txt v="tiny" soft center>
              Satu hal kecil sehari, disegel bersama setiap malam. Isinya terenkripsi end-to-end.
            </Txt>
          </Card>
        ) : null}
        {p && !p.valid ? (
          <Txt soft center>
            {p.reason === 'expired' ? 'Undangan ini sudah kedaluwarsa.' : p.reason === 'full' ? 'Lingkaran ini sudah penuh.' : 'Undangan ini sudah tidak berlaku.'}
          </Txt>
        ) : null}
        {err ? <Txt v="small" center>{err}</Txt> : null}
      </View>
    </Screen>
  );
}
