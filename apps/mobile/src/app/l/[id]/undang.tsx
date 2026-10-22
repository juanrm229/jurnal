import { COPY, MOMENT_TIERS } from '@sehari/core';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { createInvite } from '@/lib/circles';
import { useCircle, useMe } from '@/lib/data';
import { shareText } from '@/lib/share';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Growing, Header, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const circle = useCircle(id);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!circle || url) return;
    const max = circle.kind === 'duo' ? 1 : circle.kind === 'moment' ? MOMENT_TIERS[circle.moment?.tier ?? 'coba'].maxGuests : 8 - circle.active.length;
    createInvite(circle, { maxUses: Math.max(1, max), hours: circle.kind === 'moment' ? 24 * 14 : 48 })
      .then((r) => setUrl(r.url))
      .catch((e) => setErr((e as Error).message));
  }, [circle?.id]);

  if (!circle) return <Screen header={<Header />}><Growing /></Screen>;
  return (
    <Screen header={<Header title="undang" subtitle={circle.name} />} footer={<Button kind="ghost" title="selesai" onPress={() => router.replace(`/l/${id}`)} />}>
      <View style={{ alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.md }}>
        <Doodle id={circle.kind === 'moment' ? 'kado' : 'amplop'} size={56} />
        <Txt center>{circle.kind === 'moment' ? 'Pasang QR ini di meja tamu, atau kirim tautannya ke grup acara.' : COPY.onboarding.invite.body}</Txt>
        <Card style={{ alignItems: 'center', padding: SPACE.lg }}>
          {url ? <QRCode value={url} size={220} color={c.ink} backgroundColor={c.card} /> : err ? <Txt>{err}</Txt> : <Growing label="menyiapkan undangan…" />}
        </Card>
        <Txt v="tiny" soft center>
          Kunci lingkaran ikut di bagian akhir tautan (setelah #), yang tidak pernah dikirim ke server. Siapa pun yang memegang tautan bisa bergabung, jadi kirim hanya ke orang yang kamu pilih.
        </Txt>
        {url ? (
          <View style={{ width: '100%', gap: SPACE.sm }}>
            <Button title={COPY.onboarding.invite.cta} icon="ui-bagikan" onPress={() => shareText(COPY.onboarding.invite.shareText(me.user.penName ?? 'Seseorang'), url)} testID="share-invite" />
            <Button
              kind="soft"
              title={copied ? 'tersalin' : 'salin tautan'}
              onPress={async () => {
                await Clipboard.setStringAsync(url);
                setCopied(true);
              }}
              testID="copy-invite"
            />
          </View>
        ) : null}
        <Txt v="tiny" soft center testID="invite-url" selectable>
          {url ?? ''}
        </Txt>
        <Gap />
      </View>
    </Screen>
  );
}
