import { backupIdentity, COPY, generateRecoveryCode, type SessionInfo, toBase64 } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { errMsg, formatDate, Note } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, ErrorNote, Field, Gap, Growing, Header, Row, Screen, Section, Txt } from '@/ui/kit';
import { RADIUS, SPACE, useTheme } from '@/ui/theme';

const PLATFORM_ICON: Record<string, string> = { ios: 'ui-aku', android: 'ui-aku', web: 'jendela' };
const PLATFORM_LABEL: Record<string, string> = { ios: 'iPhone', android: 'Android', web: 'browser' };

function Devices() {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<SessionInfo[]>('/me/sessions') });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const revoke = async (id: string) => {
    setBusy(id);
    try {
      await api.del(`/me/sessions/${id}`);
      await q.refetch();
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  };
  if (q.isLoading) return <Growing label="mencari perangkat…" />;
  if (q.error) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  const list = [...(q.data ?? [])].sort((a, b) => (a.current ? -1 : b.current ? 1 : a.lastUsedAt < b.lastUsedAt ? 1 : -1));
  return (
    <Card style={{ paddingVertical: SPACE.xs }}>
      {list.map((s, i) => (
        <View key={s.id} testID={`session-${s.id}`} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.cardEdge }}>
          <Row gap={12}>
            <Doodle id={PLATFORM_ICON[s.platform] ?? 'ui-aku'} size={26} />
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1}>{s.deviceName || PLATFORM_LABEL[s.platform] || 'perangkat'}</Txt>
              <Txt v="tiny" soft>
                {PLATFORM_LABEL[s.platform] ?? s.platform} · masuk {formatDate(s.createdAt)}
              </Txt>
            </View>
            {s.current ? (
              <View style={{ backgroundColor: c.pill, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Txt v="tiny" ink>
                  perangkat ini
                </Txt>
              </View>
            ) : confirm === s.id ? null : (
              <Button kind="ghost" title="keluarkan" onPress={() => setConfirm(s.id)} style={{ minHeight: 36, width: 'auto', paddingHorizontal: 12 }} testID={`revoke-${s.id}`} />
            )}
          </Row>
          {confirm === s.id ? (
            <View style={{ marginTop: SPACE.sm, gap: 6 }}>
              <Txt v="small">Perangkat ini akan keluar dari akunmu dan harus masuk lagi lewat email serta kode pemulihan.</Txt>
              <Row gap={8}>
                <Button kind="danger" title="ya, keluarkan" onPress={() => void revoke(s.id)} loading={busy === s.id} style={{ flex: 1, minHeight: 40 }} testID={`revoke-confirm-${s.id}`} />
                <Button kind="ghost" title="batal" onPress={() => setConfirm(null)} style={{ flex: 1, minHeight: 40 }} />
              </Row>
            </View>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

function Scanner({ onData }: { onData: (data: string) => void }) {
  const { c } = useTheme();
  const [perm, request] = useCameraPermissions();
  const done = useRef(false);
  if (!perm) return <Growing label="menyiapkan kamera…" />;
  if (!perm.granted) {
    return (
      <View style={{ gap: SPACE.sm }}>
        <Txt v="small">Sehari butuh kamera hanya untuk memindai kode ini. Tidak ada foto yang disimpan.</Txt>
        <Button kind="soft" title="izinkan kamera" onPress={() => void request()} />
      </View>
    );
  }
  return (
    <View style={{ borderRadius: RADIUS.md, overflow: 'hidden', aspectRatio: 1, backgroundColor: c.text }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(r) => {
          if (done.current || !r.data) return;
          done.current = true;
          onData(r.data);
        }}
      />
    </View>
  );
}

function LinkDevice() {
  const { approveDeviceLink } = useSession();
  const [mode, setMode] = useState<'idle' | 'scan' | 'paste' | 'done'>('idle');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);

  const approve = async (data: string) => {
    setBusy(true);
    setErr(null);
    try {
      await approveDeviceLink(data);
      setMode('done');
    } catch (e) {
      setErr(errMsg(e));
      setScanKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'done') {
    return (
      <Note color="green" icon="ui-centang">
        Kunci sudah dikirim dengan aman. HP barumu akan membuka arsip dalam beberapa detik.
      </Note>
    );
  }
  return (
    <View style={{ gap: SPACE.sm }}>
      <Txt v="small">
        Di HP baru: masuk dengan email, lalu pilih “dari HP lama”. Pindai kode QR yang muncul di sana dari sini. Kuncimu dibungkus khusus untuk HP itu; server hanya meneruskan data teracak.
      </Txt>
      {mode === 'scan' && Platform.OS !== 'web' ? <Scanner key={scanKey} onData={(d) => void approve(d)} /> : null}
      {mode === 'paste' || (mode === 'scan' && Platform.OS === 'web') ? (
        <>
          <Field
            label="kode tautan"
            value={text}
            onChangeText={setText}
            placeholder="sehari-link:…"
            autoCapitalize="none"
            autoCorrect={false}
            hint={Platform.OS === 'web' ? 'Di browser, kamera tidak dipakai. Salin teks kode dari HP baru, lalu tempel di sini.' : undefined}
            testID="link-paste"
          />
          <Button title="tautkan" onPress={() => void approve(text)} loading={busy} disabled={!text.trim()} testID="link-approve" />
        </>
      ) : null}
      {mode === 'idle' ? (
        <Button kind="soft" icon="ui-qr" title={Platform.OS === 'web' ? 'tempel kode tautan' : 'pindai kode QR'} onPress={() => setMode('scan')} testID="link-start" />
      ) : null}
      {mode === 'scan' && Platform.OS !== 'web' ? <Button kind="ghost" title="tempel kode saja" onPress={() => setMode('paste')} /> : null}
      {mode !== 'idle' ? <Button kind="ghost" title="batal" onPress={() => { setMode('idle'); setErr(null); }} /> : null}
      {busy && mode === 'scan' ? <Growing label="mengirim kunci…" /> : null}
      {err ? <Txt v="small">{err}</Txt> : null}
    </View>
  );
}

function NewRecoveryCode() {
  const { identity, refresh } = useSession();
  const { c } = useTheme();
  const t = COPY.onboarding.recoveryCode;
  const [step, setStep] = useState<'idle' | 'show' | 'check' | 'done'>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [check, setCheck] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const groups = code?.split('-') ?? [];
  const lastGroup = groups[groups.length - 1] ?? '';

  const commit = async () => {
    if (!identity || !code) return;
    setBusy(true);
    setErr(null);
    try {
      // Identitas yang sama, dibungkus ulang dengan kode baru. Kode lama berhenti berlaku.
      await new Promise((r) => setTimeout(r, 30));
      await api.put('/me/keys', { publicKey: toBase64(identity.publicKey), keyBackup: backupIdentity(identity, code) });
      await refresh();
      setStep('done');
      setCode(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'idle' || step === 'done') {
    return (
      <View style={{ gap: SPACE.sm }}>
        {step === 'done' ? (
          <Note color="green" icon="ui-centang">
            Kode pemulihan baru sudah aktif. Kode lama tidak bisa dipakai lagi.
          </Note>
        ) : null}
        <Txt v="small">
          Lupa menyimpan kode, atau khawatir ada yang melihatnya? Buat kode baru untuk kunci yang sama. Arsipmu tidak berubah; hanya kode lama yang berhenti berlaku.
        </Txt>
        <Button
          kind="soft"
          icon="kunci"
          title="buat kode pemulihan baru"
          onPress={() => {
            setCode(generateRecoveryCode());
            setCheck('');
            setCopied(false);
            setStep('show');
          }}
          disabled={!identity}
          testID="recovery-new"
        />
      </View>
    );
  }

  return (
    <View style={{ gap: SPACE.sm }}>
      {step === 'show' ? (
        <>
          <Txt v="small">{t.body}</Txt>
          <Card style={{ alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.lg }} tint={c.paper}>
            {[0, 2, 4].map((i) => (
              <Txt key={i} v="title" ink style={{ letterSpacing: 4 }} selectable testID={`new-recovery-row-${i}`}>
                {groups[i]} {groups[i + 1]}
              </Txt>
            ))}
          </Card>
          <Button
            kind="ghost"
            title={copied ? 'tersalin' : t.copy.toLowerCase()}
            icon="ui-unduh"
            onPress={() => {
              void Clipboard.setStringAsync(code ?? '');
              setCopied(true);
            }}
          />
          <Note>{t.warning}</Note>
          <Txt v="tiny" soft center>
            {t.tip}
          </Txt>
          <Button title={t.confirm.toLowerCase()} onPress={() => setStep('check')} testID="new-recovery-saved" />
          <Button kind="ghost" title="batal, pakai kode lama" onPress={() => { setStep('idle'); setCode(null); }} />
        </>
      ) : (
        <>
          <Txt v="small" center>
            Untuk memastikan sudah tercatat: ketik kelompok terakhir kode barumu.
          </Txt>
          <Field
            value={check}
            onChangeText={setCheck}
            autoCapitalize="characters"
            placeholder="XXXX"
            maxLength={4}
            style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
            testID="new-recovery-check"
          />
          <Button title="aktifkan kode baru" onPress={() => void commit()} loading={busy} disabled={check.trim().toUpperCase() !== lastGroup} testID="new-recovery-commit" />
          <Button kind="ghost" title="lihat kode lagi" onPress={() => setStep('show')} />
          {err ? <Txt v="small" center>{err}</Txt> : null}
        </>
      )}
    </View>
  );
}

export default function Security() {
  return (
    <Screen header={<Header title="keamanan & perangkat" />}>
      <Txt v="small" soft>
        Kunci rahasiamu hanya hidup di perangkat yang kamu izinkan. Server menyimpan cadangannya dalam keadaan terkunci, dan hanya kode pemulihanmu yang bisa membukanya.
      </Txt>

      <Section title="perangkat yang masuk">
        <Devices />
        <Txt v="tiny" soft style={{ marginTop: 6 }}>
          Tidak kenal salah satunya? Keluarkan, lalu buat kode pemulihan baru di bawah.
        </Txt>
      </Section>

      <Section title="tautkan perangkat baru">
        <Card>
          <LinkDevice />
        </Card>
      </Section>

      <Section title="kode pemulihan">
        <Card>
          <NewRecoveryCode />
        </Card>
      </Section>

      <Section title="batas yang jujur">
        <Note color="blue" icon="ui-gembok">
          <View style={{ gap: 6 }}>
            <Txt v="small">{COPY.onboarding.recoveryCode.warning}</Txt>
            <Txt v="small">Enkripsi menjaga isi dari server dan orang luar, tapi tidak dari orang yang memegang HP-mu dalam keadaan terbuka. Kunci layar HP-mu, ya.</Txt>
          </View>
        </Note>
      </Section>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
