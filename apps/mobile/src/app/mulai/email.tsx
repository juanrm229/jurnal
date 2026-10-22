import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Field, Gap, Header, Screen, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

export default function Email() {
  const { requestCode, verify } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await requestCode(email.trim());
      setDevCode(r.devCode);
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await verify(email.trim(), code.trim());
      router.replace('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<Header />}
      footer={
        sent ? (
          <Button title="Masuk" onPress={confirm} loading={busy} disabled={code.length !== 6} testID="code-submit" />
        ) : (
          <Button title="Kirim kode" onPress={send} loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)} testID="email-submit" />
        )
      }>
      <View style={{ alignItems: 'center', paddingTop: SPACE.lg }}>
        <Doodle id="amplop" size={64} />
      </View>
      <Gap />
      <Txt v="title" ink center>
        {sent ? 'Cek emailmu' : 'Masuk dengan email'}
      </Txt>
      <Gap h={SPACE.sm} />
      <Txt soft center>
        {sent ? `Kami mengirim enam angka ke ${email}.` : 'Tanpa kata sandi. Kami kirim kode sekali pakai.'}
      </Txt>
      <Gap h={SPACE.lg} />
      {sent ? (
        <Field
          label="kode"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="123456"
          autoFocus
          testID="code-input"
          style={{ fontSize: 28, letterSpacing: 10, textAlign: 'center' }}
        />
      ) : (
        <Field label="email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="kamu@contoh.id" autoFocus testID="email-input" />
      )}
      {devCode ? (
        <Txt v="tiny" ink soft center style={{ marginTop: 12 }} testID="dev-code">
          mode pengembangan · kode: {devCode}
        </Txt>
      ) : null}
      {err ? (
        <Txt v="small" center style={{ marginTop: 12 }}>
          {err}
        </Txt>
      ) : null}
      {sent ? <Button kind="ghost" title="ganti email" onPress={() => setSent(false)} style={{ marginTop: SPACE.lg }} /> : null}
    </Screen>
  );
}
