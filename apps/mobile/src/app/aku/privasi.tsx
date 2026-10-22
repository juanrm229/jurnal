import { COPY, type ExportBundle } from '@sehari/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { buildReadableExport } from '@/features/account/export';
import { saveTextFile } from '@/features/account/files';
import { Bullets, errMsg, Note } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useKeyring } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

function Promise_({ icon, text }: { icon: string; text: string }) {
  return (
    <Row gap={12} style={{ alignItems: 'flex-start', paddingVertical: 6 }}>
      <Doodle id={icon} size={24} />
      <Txt v="small" style={{ flex: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

function Export() {
  const { identity } = useSession();
  const ring = useKeyring();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async () => {
    if (!identity) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const bundle = await api.get<ExportBundle>('/me/export');
      const { data, dropCount, unreadable } = buildReadableExport(bundle, identity, ring);
      const text = JSON.stringify(data, null, 2);
      const stamp = bundle.exportedAt.slice(0, 10);
      const how = await saveTextFile(`sehari-ekspor-${stamp}.json`, text);
      const what = `${data.days.length} hari, ${dropCount} Drop, ${data.letters.length} surat`;
      setDone(
        `${how === 'downloaded' ? 'Berkas sudah diunduh' : how === 'shared' ? 'Berkas siap disimpan' : 'Berkas tersimpan'}: ${what}.` +
          (unreadable ? ` ${unreadable} Drop tidak bisa dibuka di perangkat ini.` : ''),
      );
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: SPACE.sm }}>
      <Txt v="small">
        Hak atas datamu (UU PDP). Arsip diambil dari server dalam keadaan teracak, lalu dibuka di perangkat ini dan disusun jadi satu berkas JSON yang bisa kamu baca: profil, nama lingkaran, Drop milikmu per hari, dan surat.
      </Txt>
      <Txt v="tiny" soft>
        Berkasnya tidak terenkripsi. Simpan di tempat yang hanya kamu yang bisa buka.
      </Txt>
      <Button kind="soft" icon="ui-unduh" title="ekspor arsipku" onPress={() => void run()} loading={busy} disabled={!identity} testID="export-run" />
      {done ? (
        <Note color="green" testID="export-done">
          {done}
        </Note>
      ) : null}
      {err ? <Txt v="small">{err}</Txt> : null}
    </Card>
  );
}

function DeleteAccount() {
  const { signOut } = useSession();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.del('/me?confirm=HAPUS');
      await signOut();
      router.replace('/');
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  };

  if (!open) {
    return <Button kind="danger" title="hapus akunku" onPress={() => setOpen(true)} testID="delete-open" />;
  }
  return (
    <Card style={{ gap: SPACE.sm, borderColor: c.danger, borderStyle: 'dashed' }}>
      <Txt v="h2" ink>
        Hapus akun selamanya?
      </Txt>
      <Bullets
        items={[
          'Semua Drop, surat, kapsul waktu, dan media milikmu dihapus dari server. Ini tidak bisa dibatalkan.',
          'Kamu keluar dari semua lingkaran. Anggota lain tetap menyimpan hari-hari mereka sendiri.',
          'Salinan yang sudah disimpan orang lain, termasuk tangkapan layar, tidak bisa kami hapus.',
          'Ingin menyimpan arsipmu? Ekspor dulu di atas.',
        ]}
      />
      <Field label="ketik HAPUS untuk melanjutkan" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} placeholder="HAPUS" testID="delete-confirm-input" />
      {err ? <Txt v="small">{err}</Txt> : null}
      <Button kind="danger" title="hapus selamanya" onPress={() => void run()} loading={busy} disabled={typed.trim() !== 'HAPUS'} testID="delete-confirm" />
      <Button kind="ghost" title="tidak jadi" onPress={() => { setOpen(false); setTyped(''); }} />
    </Card>
  );
}

export default function Privacy() {
  const p = COPY.privacy;
  return (
    <Screen header={<Header title="privasi & data" />}>
      <Section title={p.e2eeTitle}>
        <Card style={{ gap: SPACE.sm }}>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <Doodle id="ui-gembok" size={30} />
            <Txt style={{ flex: 1 }}>{p.e2eeBody}</Txt>
          </Row>
        </Card>
      </Section>

      <Section title={p.limitsTitle}>
        <Note color="yellow">
          <View style={{ gap: SPACE.sm }}>
            <Bullets items={p.limits} />
            <Txt v="small" style={{ fontStyle: 'italic' }}>
              {p.limitsClosing}
            </Txt>
          </View>
        </Note>
      </Section>

      <Section title="janji kami">
        <Card style={{ paddingVertical: SPACE.sm }}>
          <Promise_ icon="kado" text={p.noAds} />
          <Promise_ icon="ui-lokasi" text={p.location} />
          <Promise_ icon="ui-hening" text={p.noSurveillance} />
        </Card>
      </Section>

      <Section title={p.aiTitle}>
        <View style={{ gap: SPACE.sm }}>
          {p.aiTiers.map((t, i) => (
            <Card key={t.name} style={{ gap: 4 }}>
              <Row gap={10}>
                <Txt v="label" ink>
                  {i + 1}
                </Txt>
                <Txt ink>{t.name}</Txt>
              </Row>
              <Txt v="small">{t.body}</Txt>
              {i === 2 ? (
                <Txt v="tiny" soft>
                  Kalau dinyalakan: {p.aiCloudWarning.charAt(0).toLowerCase() + p.aiCloudWarning.slice(1)} Pengaturannya ada di tiap lingkaran.
                </Txt>
              ) : null}
            </Card>
          ))}
          <Txt v="tiny" soft>
            {p.aiOffers}
          </Txt>
        </View>
      </Section>

      <Section title="ekspor data">
        <Export />
      </Section>

      <Section title="hapus akun">
        <DeleteAccount />
      </Section>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
