import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

/** Perangkat baru: pulihkan dengan kode, atau tautkan dari HP lama lewat QR. */
export default function Restore() {
  const { restoreWithCode, startDeviceLink, signOut } = useSession();
  const { c } = useTheme();
  const [mode, setMode] = useState<'code' | 'link'>('code');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'link') return;
    let cancel: (() => void) | undefined;
    (async () => {
      try {
        const link = await startDeviceLink();
        cancel = link.cancel;
        setQr(link.qr);
        await link.wait();
        router.replace('/');
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    return () => cancel?.();
  }, [mode, startDeviceLink]);

  const restore = async () => {
    setBusy(true);
    setErr(null);
    try {
      await restoreWithCode(code);
      router.replace('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<Header back={false} right={<Button kind="ghost" title="keluar" onPress={signOut} style={{ minHeight: 36, paddingHorizontal: 12 }} />} />}
      footer={mode === 'code' ? <Button title="Pulihkan arsip" onPress={restore} loading={busy} disabled={code.replace(/[^0-9a-z]/gi, '').length !== 24} testID="restore-submit" /> : undefined}>
      <View style={{ alignItems: 'center' }}>
        <Doodle id="kunci" size={60} />
      </View>
      <Gap />
      <Txt v="title" ink center>
        Selamat datang kembali
      </Txt>
      <Gap h={SPACE.sm} />
      <Txt soft center>
        Akun ini sudah punya kunci. Buka arsipmu di perangkat ini dengan salah satu cara berikut.
      </Txt>
      <Gap h={SPACE.lg} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
        <Button kind={mode === 'code' ? 'soft' : 'ghost'} title="kode pemulihan" onPress={() => setMode('code')} style={{ flex: 1 }} />
        <Button kind={mode === 'link' ? 'soft' : 'ghost'} title="dari HP lama" onPress={() => setMode('link')} style={{ flex: 1 }} />
      </View>
      <Gap h={SPACE.lg} />
      {mode === 'code' ? (
        <Field label="kode pemulihan" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" testID="restore-code" />
      ) : (
        <Card style={{ alignItems: 'center', gap: SPACE.md }}>
          {qr ? <QRCode value={qr} size={200} color={c.ink} backgroundColor={c.card} /> : <Txt soft>menyiapkan kode…</Txt>}
          <Txt v="small" center>
            Di HP lama: Aku → Keamanan → Tautkan perangkat, lalu pindai kode ini.
          </Txt>
        </Card>
      )}
      {err ? (
        <Txt v="small" center style={{ marginTop: 12 }}>
          {err}
        </Txt>
      ) : null}
    </Screen>
  );
}
