import { COPY, REPORT_REASONS, type ReportReason } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ConfirmCard, errMsg, Note, TCard } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useCircles } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const REASONS = Object.entries(REPORT_REASONS) as [ReportReason, string][];

function HelpCard() {
  return (
    <Note color="peach" icon="lilin" testID="report-help">
      <View style={{ gap: 6 }}>
        <Txt v="small">{COPY.silentRoom.helpLead}</Txt>
        <Txt v="small">{COPY.silentRoom.emergencyLead}</Txt>
        <Button kind="ghost" title="buka Bantuan & dukungan" onPress={() => router.push('/bantuan')} style={{ minHeight: 40 }} testID="report-help-open" />
      </View>
    </Note>
  );
}

export default function Report() {
  const params = useLocalSearchParams<{ userId: string; circleId?: string; dropId?: string; text?: string }>();
  const { c } = useTheme();
  const qc = useQueryClient();
  const { circles } = useCircles();
  const circle = circles.find((x) => x.id === params.circleId);
  const person = (circle?.members ?? circles.flatMap((x) => x.members)).find((m) => m.userId === params.userId);
  const name = person?.penName ?? 'orang ini';

  const [step, setStep] = useState<'reason' | 'content' | 'sent'>('reason');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [content, setContent] = useState(params.text ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockErr, setBlockErr] = useState<string | null>(null);

  const submit = async () => {
    if (!reason || !params.userId) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post('/reports', {
        targetUserId: params.userId,
        ...(params.circleId ? { circleId: params.circleId } : {}),
        ...(params.dropId ? { dropId: params.dropId } : {}),
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(content.trim() ? { disclosedContent: content.trim() } : {}),
      });
      setStep('sent');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    setBlockErr(null);
    try {
      await api.post(`/blocks/${params.userId}`);
      setBlocked(true);
      setBlockOpen(false);
      void qc.invalidateQueries({ queryKey: ['circles'] });
      void qc.invalidateQueries({ queryKey: ['blocks'] });
    } catch (e) {
      setBlockErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!params.userId) {
    return (
      <Screen header={<Header title="laporkan" />}>
        <Txt center>Pilih orang yang ingin kamu laporkan dari pengaturan lingkaran.</Txt>
      </Screen>
    );
  }

  const isDuo = circles.some((x) => x.kind === 'duo' && x.status === 'active' && x.others.some((m) => m.userId === params.userId));

  if (step === 'sent') {
    return (
      <Screen header={<Header title="laporkan" />}>
        <View style={{ alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.lg }}>
          <Doodle id="segel-lilin" size={56} />
          <Txt v="title" ink center>
            Terima kasih sudah memberi tahu
          </Txt>
          <Txt center soft>
            Laporanmu sudah sampai ke tim keamanan dan akan ditinjau. {name} tidak diberi tahu siapa yang melapor.
          </Txt>
        </View>
        <Gap h={SPACE.lg} />
        {reason === 'menyakiti_diri' ? (
          <>
            <HelpCard />
            <Gap />
          </>
        ) : null}
        {blocked ? (
          <Note color="green" icon="ui-centang" testID="report-blocked">
            {`${name} sudah diblokir. Drop-nya tidak akan sampai ke kapsulmu lagi.${isDuo ? ' Duo kalian juga sudah dibekukan.' : ''}`}
          </Note>
        ) : blockOpen ? (
          <ConfirmCard
            title={`Blokir ${name}?`}
            body="Isi darinya tidak akan sampai kepadamu lagi, dan isimu tidak sampai kepadanya. Dia tidak diberi tahu."
            note={isDuo ? 'Di Duo, memblokir juga berarti keluar: arsip Duo kalian dibekukan (Mode Pisah).' : undefined}
            confirmLabel="ya, blokir"
            onConfirm={() => void block()}
            onCancel={() => setBlockOpen(false)}
            busy={busy}
            danger
            error={blockErr}
            testID="report-block"
          />
        ) : (
          <Card style={{ gap: SPACE.sm }}>
            <Txt v="small">Kalau kamu tidak ingin melihat apa pun darinya untuk sementara, atau selamanya, kamu bisa memblokirnya sekarang.</Txt>
            <Button kind="danger" title={`blokir ${name}`} onPress={() => setBlockOpen(true)} testID="report-block-open" />
          </Card>
        )}
        <Gap />
        <Button kind="ghost" title="selesai" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} testID="report-finish" />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title="laporkan" subtitle={circle?.name} />}
      footer={
        step === 'reason' ? (
          <Button title="lanjut" onPress={() => setStep('content')} disabled={!reason} testID="report-next" />
        ) : (
          <Button title="kirim laporan" onPress={() => void submit()} loading={busy} testID="report-submit" />
        )
      }>
      <Card>
        <Row gap={12}>
          <Avatar doodle={person?.doodle ?? 'semak'} size={40} />
          <View style={{ flex: 1 }}>
            <Txt>{name}</Txt>
            <Txt v="tiny" soft>
              {circle ? `di ${circle.name}` : 'dari lingkaranmu'}
            </Txt>
          </View>
        </Row>
      </Card>
      <Gap h={SPACE.sm} />
      <Txt v="small" soft>
        Kamu aman di sini. Laporan tidak memberi tahu {name}, dan kamu bisa berhenti kapan saja.
      </Txt>

      {step === 'reason' ? (
        <Section title="apa yang terjadi?">
          <View style={{ gap: 6 }}>
            {REASONS.map(([code, label]) => {
              const on = reason === code;
              return (
                <Pressable key={code} onPress={() => setReason(code)} testID={`reason-${code}`} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <View
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: on ? c.ink : c.cardEdge,
                      backgroundColor: on ? c.pill : c.card,
                    }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt v="small" style={{ flex: 1 }}>
                        {label}
                      </Txt>
                      {on ? <Doodle id="ui-centang" size={18} /> : null}
                    </Row>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {reason === 'menyakiti_diri' ? (
            <>
              <Gap />
              <HelpCard />
            </>
          ) : null}
          {reason === 'anak' ? (
            <>
              <Gap />
              <Note color="peach">Laporan tentang keselamatan anak kami dahulukan. Kalau anak itu dalam bahaya sekarang, hubungi 112.</Note>
            </>
          ) : null}
        </Section>
      ) : (
        <>
          <Section title="catatan untuk tim (opsional)">
            <Field value={note} onChangeText={setNote} multiline maxLength={2000} placeholder="ceritakan dengan kata-katamu sendiri, sesingkat atau sepanjang yang kamu mau" testID="report-note" />
          </Section>

          <Section title="isi yang ikut dikirim">
            <Note color="blue" icon="ui-gembok">
              Sehari tidak bisa membaca isi lingkaran. Tim keamanan hanya akan melihat apa yang kamu kirim dari perangkatmu di kotak ini. Ubah atau hapus bagian yang tidak ingin kamu bagikan.
            </Note>
            <Gap h={SPACE.sm} />
            <Field
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={10_000}
              placeholder="kosong: tidak ada isi yang dikirim, hanya alasan dan catatanmu"
              testID="report-content"
            />
            {content ? (
              <Pressable onPress={() => setContent('')} style={{ alignSelf: 'flex-end', paddingVertical: 6 }} testID="report-content-clear">
                <Txt v="tiny" ink>
                  hapus isi ini
                </Txt>
              </Pressable>
            ) : null}
          </Section>

          <Section title="persis yang akan dikirim">
            <TCard tint={c.paper} style={{ gap: 6, borderStyle: 'dashed', borderColor: c.inkSoft }} testID="report-preview">
              <Txt v="tiny" soft>
                tentang
              </Txt>
              <Txt v="small">{name}</Txt>
              <Txt v="tiny" soft>
                alasan
              </Txt>
              <Txt v="small">{reason ? REPORT_REASONS[reason] : '—'}</Txt>
              <Txt v="tiny" soft>
                catatanmu
              </Txt>
              <Txt v="small">{note.trim() || '(tidak ada)'}</Txt>
              <Txt v="tiny" soft>
                isi yang dibagikan
              </Txt>
              <Txt v="small" numberOfLines={8}>
                {content.trim() || '(tidak ada)'}
              </Txt>
              {params.dropId ? (
                <Txt v="tiny" soft>
                  ditambah penanda Drop yang dilaporkan (tanpa isinya)
                </Txt>
              ) : null}
            </TCard>
          </Section>
          {err ? (
            <Txt v="small" style={{ marginTop: SPACE.sm, color: c.danger }}>
              {err}
            </Txt>
          ) : null}
          <Gap />
          <Button kind="ghost" title="ganti alasan" onPress={() => setStep('reason')} />
        </>
      )}
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
