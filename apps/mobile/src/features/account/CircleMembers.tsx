/**
 * Anggota lingkaran di pengaturan: julukan tokoh (diberi teman, terenkripsi
 * dengan kunci lingkaran), kode keamanan untuk dicocokkan langsung, lapor,
 * dan blokir.
 */
import { type CircleMember, fromBase64, type Nickname, safetyCode } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, sealCircleText } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Avatar } from '@/ui/Avatar';
import { Button, Card, Field, Row, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';
import { ConfirmCard, errMsg, formatDate, TCard } from './kit';

const ROLE: Record<string, string> = { owner: 'pembuka lingkaran', member: 'anggota', guest: 'tamu' };

function SafetyCode({ mine, theirs, name }: { mine: Uint8Array; theirs: string; name: string }) {
  const { c } = useTheme();
  let groups: string[] = [];
  try {
    groups = safetyCode(mine, fromBase64(theirs)).split(' ');
  } catch {
    groups = [];
  }
  if (!groups.length) return <Txt v="small">Kode keamanan belum bisa dibuat: {name} belum punya kunci.</Txt>;
  return (
    <View style={{ gap: SPACE.sm }}>
      <View style={{ backgroundColor: c.paper, borderRadius: 14, paddingVertical: SPACE.md, alignItems: 'center', gap: 6 }}>
        {[0, 3].map((i) => (
          <Txt key={i} v="title" ink style={{ letterSpacing: 3, fontSize: 20 }} selectable testID={i === 0 ? 'safety-code-row' : undefined}>
            {groups.slice(i, i + 3).join('  ')}
          </Txt>
        ))}
      </View>
      <Txt v="tiny" soft>
        Saat bertemu langsung atau lewat telepon video, minta {name} membuka layar ini juga. Kalau keenam kelompok angkanya sama persis, kunci kalian tidak ditukar siapa pun di tengah jalan. Kalau berbeda, jangan bagikan hal penting dulu dan kabari kami.
      </Txt>
    </View>
  );
}

function MemberRow({
  circle,
  member,
  nicknames,
  names,
  onChanged,
}: {
  circle: CircleView;
  member: CircleMember;
  nicknames: Nickname[];
  names: Map<string, string>;
  onChanged: () => void;
}) {
  const { c } = useTheme();
  const { me, identity } = useSession();
  const qc = useQueryClient();
  const isMe = member.userId === me?.user.id;
  const given = nicknames.filter((n) => n.targetId === member.userId);
  const fromOthers = given.filter((n) => n.giverId !== me?.user.id);
  const mineEnc = given.find((n) => n.giverId === me?.user.id)?.nicknameEnc;
  const mineText = mineEnc ? openCircleText(circle, mineEnc, '') : '';
  const [nick, setNick] = useState(mineText);
  const [open, setOpen] = useState<'none' | 'code' | 'block'>('none');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const frozen = circle.status !== 'active';
  const canAct = !isMe && member.state === 'active';

  const saveNick = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/nicknames/${member.userId}`, { nicknameEnc: sealCircleText(circle, nick.trim()) });
      setSaved(true);
      onChanged();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/blocks/${member.userId}`);
      await qc.invalidateQueries({ queryKey: ['circles'] });
      void qc.invalidateQueries({ queryKey: ['blocks'] });
      if (circle.kind === 'duo') router.replace('/lingkaran');
      else setOpen('none');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TCard testID={`member-${member.userId}`} style={{ gap: SPACE.sm }}>
      <Row gap={12}>
        <Avatar doodle={member.doodle} size={44} dim={member.state === 'remembered'} />
        <View style={{ flex: 1 }}>
          <Txt>
            {member.penName}
            {isMe ? ' (kamu)' : ''}
          </Txt>
          <Txt v="tiny" soft>
            {member.state === 'remembered' ? 'dikenang' : ROLE[member.role] ?? member.role} · sejak {formatDate(member.joinedAt)}
          </Txt>
        </View>
      </Row>

      {fromOthers.length ? (
        <View style={{ gap: 4 }}>
          <Txt v="label" ink soft>
            {isMe ? 'julukan dari teman-temanmu' : 'julukan dari yang lain'}
          </Txt>
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {fromOthers.map((n) => (
              <View key={n.giverId} style={{ backgroundColor: c.sticky.yellow, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Txt v="small" style={{ color: c.text }} testID={`nick-${member.userId}-${n.giverId}`}>
                  “{openCircleText(circle, n.nicknameEnc)}”
                  <Txt v="tiny" style={{ color: c.text, opacity: 0.6 }}>
                    {' '}
                    dari {names.get(n.giverId) ?? 'seseorang'}
                  </Txt>
                </Txt>
              </View>
            ))}
          </Row>
        </View>
      ) : isMe ? (
        <Txt v="tiny" soft>
          Belum ada julukan tokoh untukmu. Itu diberikan teman, bukan dipilih sendiri.
        </Txt>
      ) : null}

      {!isMe && member.state !== 'left' && !frozen ? (
        <View style={{ gap: 6 }}>
          <Field
            label="julukan tokoh darimu"
            value={nick}
            onChangeText={(v) => {
              setNick(v);
              setSaved(false);
            }}
            placeholder="mis. Si Penjaga Senja"
            maxLength={40}
            testID={`nick-input-${member.userId}`}
          />
          {nick.trim() !== mineText.trim() && nick.trim() ? (
            <Button kind="soft" title="simpan julukan" onPress={() => void saveNick()} loading={busy && open === 'none'} style={{ minHeight: 42 }} testID={`nick-save-${member.userId}`} />
          ) : saved ? (
            <Txt v="tiny" ink soft testID={`nick-saved-${member.userId}`}>
              julukan tersimpan · terenkripsi untuk lingkaran ini
            </Txt>
          ) : null}
        </View>
      ) : null}

      {canAct ? (
        <>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Pressable onPress={() => setOpen(open === 'code' ? 'none' : 'code')} testID={`safety-${member.userId}`} style={{ paddingVertical: 6 }}>
              <Txt v="small" ink>
                kode keamanan
              </Txt>
            </Pressable>
            <Txt v="small" soft>
              ·
            </Txt>
            <Pressable
              onPress={() => router.push({ pathname: '/lapor', params: { userId: member.userId, circleId: circle.id } })}
              testID={`report-${member.userId}`}
              style={{ paddingVertical: 6 }}>
              <Txt v="small" ink>
                laporkan
              </Txt>
            </Pressable>
            <Txt v="small" soft>
              ·
            </Txt>
            <Pressable onPress={() => setOpen(open === 'block' ? 'none' : 'block')} testID={`block-${member.userId}`} style={{ paddingVertical: 6 }}>
              <Txt v="small" style={{ color: c.danger }}>
                blokir
              </Txt>
            </Pressable>
          </Row>
          {open === 'code' && identity ? <SafetyCode mine={identity.publicKey} theirs={member.publicKey} name={member.penName} /> : null}
          {open === 'block' ? (
            <ConfirmCard
              title={`Blokir ${member.penName}?`}
              body="Isi darinya tidak akan sampai kepadamu lagi, dan isimu tidak sampai kepadanya. Dia tidak diberi tahu."
              note={circle.kind === 'duo' ? 'Di Duo, memblokir juga berarti keluar: arsip kalian dibekukan seperti Mode Pisah.' : 'Kalian tetap di lingkaran yang sama, tapi tidak saling melihat.'}
              confirmLabel="ya, blokir"
              onConfirm={() => void block()}
              onCancel={() => setOpen('none')}
              busy={busy}
              danger
              testID={`block-card-${member.userId}`}
            />
          ) : null}
        </>
      ) : null}
      {err ? <Txt v="small" style={{ color: c.danger }}>{err}</Txt> : null}
    </TCard>
  );
}

export function CircleMembers({ circle }: { circle: CircleView }) {
  const q = useQuery({ queryKey: ['nicknames', circle.id], queryFn: () => api.get<Nickname[]>(`/circles/${circle.id}/nicknames`) });
  const names = new Map(circle.members.map((m) => [m.userId, m.penName]));
  const members = circle.members.filter((m) => m.state !== 'left');
  return (
    <View style={{ gap: SPACE.sm }}>
      {members.map((m) => (
        <MemberRow
          key={`${m.userId}:${q.isSuccess}`}
          circle={circle}
          member={m}
          nicknames={q.data ?? []}
          names={names}
          onChanged={() => void q.refetch()}
        />
      ))}
    </View>
  );
}
