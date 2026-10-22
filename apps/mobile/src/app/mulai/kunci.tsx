import { COPY } from '@sehari/core';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

/** Kunci dibuat di perangkat. Kode pemulihan ditampilkan sekali, lalu dicek. */
export default function Keys() {
  const { draftKeys, commitKeys } = useSession();
  const { c } = useTheme();
  const t = COPY.onboarding.recoveryCode;
  const draft = useMemo(() => draftKeys(), [draftKeys]);
  const [step, setStep] = useState<'show' | 'check'>('show');
  const [check, setCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const groups = draft.code.split('-');
  const lastGroup = groups[groups.length - 1]!;

  const commit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await commitKeys(draft);
      router.replace('/mulai/undang');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        step === 'show' ? (
          <Button title={t.confirm} onPress={() => setStep('check')} testID="recovery-saved" />
        ) : (
          <Button title="Simpan kunci" onPress={commit} loading={busy} disabled={check.trim().toUpperCase() !== lastGroup} testID="recovery-commit" />
        )
      }>
      <Gap h={SPACE.xl} />
      <View style={{ alignItems: 'center' }}>
        <Doodle id="kunci" size={64} />
      </View>
      <Gap />
      <Txt v="title" ink center>
        {t.title}
      </Txt>
      <Gap h={SPACE.sm} />
      <Txt center>{t.body}</Txt>
      <Gap h={SPACE.lg} />
      {step === 'show' ? (
        <>
          <Card style={{ alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.lg }}>
            {[0, 2, 4].map((i) => (
              <Txt key={i} v="title" ink style={{ letterSpacing: 4 }} testID={`recovery-row-${i}`} selectable>
                {groups[i]} {groups[i + 1]}
              </Txt>
            ))}
          </Card>
          <Gap h={SPACE.sm} />
          <Button kind="ghost" title={t.copy} icon="ui-unduh" onPress={() => Clipboard.setStringAsync(draft.code)} />
          <Gap />
          <View style={{ backgroundColor: c.sticky.yellow, padding: SPACE.md, borderRadius: 6 }}>
            <Txt v="small">{t.warning}</Txt>
          </View>
          <Gap h={SPACE.sm} />
          <Txt v="tiny" soft center>
            {t.tip}
          </Txt>
        </>
      ) : (
        <>
          <Txt v="small" soft center>
            Untuk memastikan sudah tercatat: ketik kelompok terakhir kode pemulihanmu.
          </Txt>
          <Gap />
          <Field value={check} onChangeText={setCheck} autoCapitalize="characters" placeholder="XXXX" maxLength={4} style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }} testID="recovery-check" />
          <Button kind="ghost" title="lihat kode lagi" onPress={() => setStep('show')} style={{ marginTop: SPACE.md }} />
          {err ? <Txt v="small" center>{err}</Txt> : null}
        </>
      )}
    </Screen>
  );
}
