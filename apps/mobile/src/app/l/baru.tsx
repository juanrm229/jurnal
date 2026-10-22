import { addDays, CIRCLE_KIND_LABEL, type CircleKind } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/lib/api';
import { createCircle } from '@/lib/circles';
import { qk, useToday } from '@/lib/data';
import { useReady } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, Pill, Row, Screen, Toggle, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const KINDS: { kind: CircleKind; doodle: string; hint: string }[] = [
  { kind: 'duo', doodle: 'ui-peluk', hint: '2 orang: pasangan, sahabat, saudara, LDR' },
  { kind: 'circle', doodle: 'ui-lingkaran', hint: '3–8 orang: geng sahabat, teman kos, teman kantor dekat' },
  { kind: 'chosen_family', doodle: 'rumah', hint: '3–8 orang yang kamu anggap keluarga, sedarah atau tidak' },
  { kind: 'moment', doodle: 'kado', hint: 'acara: nikahan, liburan, wisuda, reuni — tamu Drop, lalu jadi Wrap acara' },
];

const DOODLES = ['tunas', 'ui-peluk', 'rumah', 'bunga-matahari', 'kaktus', 'cangkir', 'gitar', 'sepeda', 'kucing', 'jamur', 'labu', 'surat-botol'];

export default function NewCircle() {
  const params = useLocalSearchParams<{ kind?: CircleKind }>();
  const { identity } = useReady();
  const { c } = useTheme();
  const qc = useQueryClient();
  const today = useToday();
  const [kind, setKind] = useState<CircleKind>(params.kind ?? 'duo');
  const [name, setName] = useState('');
  const [doodle, setDoodle] = useState('tunas');
  const [startsOn, setStartsOn] = useState(today);
  const [days, setDays] = useState(1);
  const [openMode, setOpenMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { circle } = await createCircle(identity, {
        kind,
        name: name.trim() || CIRCLE_KIND_LABEL[kind],
        doodle,
        moment: kind === 'moment' ? { startsOn, endsOn: addDays(startsOn, days - 1) } : undefined,
        settings: openMode && kind !== 'moment' ? { revealMode: 'open' } : undefined,
      });
      await qc.invalidateQueries({ queryKey: qk.circles });
      router.replace(`/l/${circle.id}/undang`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) router.push('/plus');
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header title="lingkaran baru" />} footer={<Button title="Buat" onPress={create} loading={busy} testID="create-circle" />}>
      {KINDS.map((k) => (
        <Card key={k.kind} onPress={() => setKind(k.kind)} tint={k.kind === kind ? c.pill : undefined} style={{ marginBottom: SPACE.sm }} testID={`new-kind-${k.kind}`}>
          <Row gap={14}>
            <Doodle id={k.doodle} size={32} />
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
      <Gap />
      <Field label={kind === 'moment' ? 'nama acara' : 'nama lingkaran'} value={name} onChangeText={setName} placeholder={kind === 'moment' ? 'Nikahan Dina & Bima' : 'hanya terlihat oleh kalian'} maxLength={60} testID="new-circle-name" />
      <Gap />
      <Txt v="label" ink soft>
        doodle
      </Txt>
      <Gap h={SPACE.sm} />
      <Row style={{ flexWrap: 'wrap' }} gap={8}>
        {DOODLES.map((d) => (
          <Card key={d} onPress={() => setDoodle(d)} tint={d === doodle ? c.pill : undefined} style={{ padding: 8, borderRadius: 14 }}>
            <Doodle id={d} size={30} />
          </Card>
        ))}
      </Row>
      {kind === 'moment' ? (
        <>
          <Gap />
          <Txt v="label" ink soft>
            kapan acaranya
          </Txt>
          <Gap h={SPACE.sm} />
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {[0, 1, 7, 14, 30].map((d) => (
              <Pill key={d} active={startsOn === addDays(today, d)} onPress={() => setStartsOn(addDays(today, d))}>
                {d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`}
              </Pill>
            ))}
          </Row>
          <Gap h={SPACE.sm} />
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {[1, 2, 3, 7].map((d) => (
              <Pill key={d} active={days === d} onPress={() => setDays(d)}>
                {`${d} hari`}
              </Pill>
            ))}
          </Row>
          <Txt v="tiny" soft style={{ marginTop: 8 }}>
            Gratis untuk 8 tamu. Untuk acara besar (50–400 tamu), tingkatkan setelah dibuat.
          </Txt>
        </>
      ) : (
        <>
          <Gap />
          <Toggle
            label="kapsul terbuka kapan saja"
            value={openMode}
            onChange={setOpenMode}
            hint="Bawaannya, kapsul teman terbuka setelah kamu menyegel kapsulmu sendiri. Nyalakan bila kalian lebih suka saling melihat sepanjang hari."
          />
        </>
      )}
      {err ? <Txt v="small" style={{ marginTop: SPACE.md }}>{err}</Txt> : null}
    </Screen>
  );
}
