import { CIRCLE_KIND_LABEL, COPY, type CircleKind } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { acceptInvite, createCircle, createInvite, pendingInvite } from '@/lib/circles';
import { qk } from '@/lib/data';
import { useReady } from '@/lib/session';
import { shareText } from '@/lib/share';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Growing, Row, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const KINDS: { kind: CircleKind; doodle: string; hint: string }[] = [
  { kind: 'duo', doodle: 'ui-peluk', hint: 'berdua: pasangan, sahabat, saudara, LDR' },
  { kind: 'circle', doodle: 'ui-lingkaran', hint: '3–8 orang: geng sahabat, teman kos' },
  { kind: 'chosen_family', doodle: 'rumah', hint: '3–8 orang yang kamu anggap keluarga' },
];

export default function FirstInvite() {
  const { me, identity } = useReady();
  const { c } = useTheme();
  const qc = useQueryClient();
  const t = COPY.onboarding.invite;
  const [kind, setKind] = useState<CircleKind>('duo');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(!!pendingInvite.value);

  // Datang lewat tautan undangan: terima dulu, lalu langsung ke Hari Ini.
  useEffect(() => {
    const inv = pendingInvite.value;
    if (!inv) return;
    pendingInvite.value = null;
    acceptInvite(identity, me.user.id, inv.token, inv.fragment)
      .then(async (id) => {
        await qc.invalidateQueries({ queryKey: qk.circles });
        router.replace(`/l/${id}`);
      })
      .catch((e) => {
        setErr((e as Error).message);
        setJoining(false);
      });
  }, [identity, me.user.id, qc]);

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { circle, keys } = await createCircle(identity, {
        kind,
        name: name.trim() || (kind === 'duo' ? `${me.user.penName} & …` : 'Lingkaran kami'),
        doodle: kind === 'duo' ? 'ui-peluk' : kind === 'chosen_family' ? 'rumah' : 'ui-lingkaran',
      });
      await qc.invalidateQueries({ queryKey: qk.circles });
      const inv = await createInvite({ id: circle.id, keys }, { maxUses: kind === 'duo' ? 1 : 7 });
      const r = await shareText(t.shareText(me.user.penName ?? 'Seseorang'), inv.url);
      setSent(r === 'copied' ? 'Tautan undangan disalin. Kirim lewat chat ke orang yang kamu pilih.' : t.waiting);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (joining) return <Screen><Growing label="membuka undangan…" /></Screen>;

  return (
    <Screen
      footer={
        sent ? (
          <Button title="Ke Hari Ini" onPress={() => router.replace('/hari-ini')} testID="invite-done" />
        ) : (
          <View style={{ width: '100%', gap: SPACE.sm, alignItems: 'center' }}>
            <Button title={t.cta} onPress={go} loading={busy} testID="invite-send" />
            <Button kind="ghost" title={t.skip} onPress={() => router.replace('/hari-ini')} testID="invite-skip" />
          </View>
        )
      }>
      <Gap h={SPACE.xl} />
      <View style={{ alignItems: 'center' }}>
        <Doodle id="penyiram" size={72} />
      </View>
      <Gap />
      <Txt v="title" ink center>
        {t.title}
      </Txt>
      <Gap h={SPACE.sm} />
      <Txt soft center>
        {t.body}
      </Txt>
      <Gap h={SPACE.lg} />
      {sent ? (
        <Card style={{ alignItems: 'center', gap: SPACE.sm }}>
          <Doodle id="amplop" size={48} />
          <Txt center>{sent}</Txt>
        </Card>
      ) : (
        <>
          {KINDS.map((k) => (
            <Card key={k.kind} onPress={() => setKind(k.kind)} tint={k.kind === kind ? c.pill : undefined} style={{ marginBottom: SPACE.sm }} testID={`kind-${k.kind}`}>
              <Row gap={14}>
                <Doodle id={k.doodle} size={34} />
                <View style={{ flex: 1 }}>
                  <Txt v="h2" ink>
                    {CIRCLE_KIND_LABEL[k.kind]}
                  </Txt>
                  <Txt v="tiny" soft>
                    {k.hint}
                  </Txt>
                </View>
              </Row>
            </Card>
          ))}
          <Gap h={SPACE.sm} />
          <Field label="nama lingkaran (hanya terlihat oleh kalian)" value={name} onChangeText={setName} placeholder={kind === 'duo' ? 'Raka & Naya' : 'Anak Kos Gang 3'} maxLength={60} testID="circle-name" />
        </>
      )}
      {err ? (
        <Txt v="small" center style={{ marginTop: 12 }}>
          {err}
        </Txt>
      ) : null}
    </Screen>
  );
}
