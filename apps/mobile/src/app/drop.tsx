/**
 * Drop: lempar apa saja, kapan saja. Satu Drop sudah menghitung hari.
 * Label audiens selalu terlihat di samping tombol Drop, bukan di pengaturan.
 */
import { addDays, type Audience, COPY, type DropKind, type DropPayload, formatDayLong, type MediaRef, type MoodCode, type SongRef } from '@sehari/core';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { autoTrail } from '@/lib/auto';
import { nowParts, useCircles, useCreateDrop, useMe, useToday } from '@/lib/data';
import { uploadFile, uploadPhoto } from '@/lib/media';
import { fetchSongMeta, parseSongUrl } from '@/lib/songs';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, IconButton, Pill, Row, Txt } from '@/ui/kit';
import { MoodPicker } from '@/ui/Mood';
import { FONTS, MAX_WIDTH, RADIUS, SPACE, useTheme } from '@/ui/theme';

type Mode = 'text' | 'photo' | 'voice' | 'song' | 'idea' | 'word' | 'mood' | 'silent';

const MODES: { mode: Mode; label: string; doodle: string }[] = [
  { mode: 'text', label: 'tulisan', doodle: 'ui-teks' },
  { mode: 'photo', label: 'foto', doodle: 'ui-foto' },
  { mode: 'voice', label: 'suara', doodle: 'ui-mikrofon' },
  { mode: 'song', label: 'lagu', doodle: 'ui-lagu' },
  { mode: 'idea', label: 'ide', doodle: 'ui-ide' },
  { mode: 'word', label: 'satu kata', doodle: 'ui-kata' },
  { mode: 'mood', label: 'warna', doodle: 'ui-palet' },
  { mode: 'silent', label: 'hening', doodle: 'lilin' },
];

const TAGS = ['hujan', 'laut', 'perjalanan', 'kerja', 'rumah', 'makan', 'jalan kaki'];

const CAPSULE_OPTIONS = [
  { label: 'sebulan lagi', days: 30 },
  { label: 'setahun lagi', days: 365 },
  { label: '5 tahun', days: 365 * 5 + 1 },
  { label: '10 tahun', days: 365 * 10 + 2 },
];

export default function DropComposer() {
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const params = useLocalSearchParams<{ prompt?: string; cardId?: string; questionId?: string; kind?: string; circleId?: string; expeditionId?: string; expeditionDay?: string }>();
  const { circles } = useCircles();
  const active = circles.filter((x) => x.status === 'active' && x.me?.state === 'active');
  const createDrop = useCreateDrop();

  const initialMode: Mode = params.kind === 'photo' ? 'photo' : params.kind === 'mood' ? 'mood' : 'text';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodCode | undefined>();
  const [photos, setPhotos] = useState<{ uri: string; width: number; height: number }[]>([]);
  const [song, setSong] = useState<SongRef | null>(null);
  const [songUrl, setSongUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [audience, setAudience] = useState<Audience>(active.length ? 'circle' : 'self');
  const [circleIds, setCircleIds] = useState<string[]>(params.circleId ? [params.circleId] : active.map((x) => x.id));
  const [personId, setPersonId] = useState<string | undefined>();
  const [unlockOn, setUnlockOn] = useState<string>(addDays(today, 365));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Rekaman suara (maks sesuai paket).
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 250);
  const [voice, setVoice] = useState<{ uri: string; ms: number } | null>(null);
  const maxVoice = me.limits.voiceSeconds;
  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= maxVoice * 1000) void stopRecording();
  }, [rec.durationMillis, rec.isRecording]);

  useEffect(() => {
    if (!active.length && audience === 'circle') setAudience('self');
  }, [active.length]);

  const people = useMemo(() => active.flatMap((x) => x.others.map((m) => ({ ...m, circleId: x.id, circleName: x.name }))), [active]);

  async function startRecording() {
    setErr(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return setErr('Izin mikrofon dibutuhkan untuk voice note.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  async function stopRecording() {
    const ms = rec.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri) setVoice({ uri: recorder.uri, ms });
  }

  async function pickPhoto(camera: boolean) {
    setErr(null);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: !camera, selectionLimit: 4, exif: false };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setErr('Izin kamera dibutuhkan.');
    }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    setPhotos((p) => [...p, ...res.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }))].slice(0, me.limits.maxCircles > 2 ? 10 : 4));
  }

  async function resolveSong() {
    const parsed = parseSongUrl(songUrl);
    if (!parsed) return setErr('Tempel tautan Spotify, YouTube Music, atau Apple Music.');
    setErr(null);
    const meta = await fetchSongMeta(parsed).catch(() => null);
    setSong({ ...parsed, title: meta?.title ?? 'Lagu tanpa judul', artist: meta?.artist ?? '', artworkUrl: meta?.artworkUrl });
  }

  const kindFor = (): DropKind => {
    if (params.questionId) return 'answer';
    if (params.cardId) return mode === 'photo' ? 'photo' : 'card';
    if (params.expeditionId) return mode === 'photo' ? 'photo' : 'expedition';
    return mode === 'text' ? 'text' : mode;
  };

  const canSend =
    (mode === 'text' || mode === 'idea' || mode === 'word') ? text.trim().length > 0 :
    mode === 'photo' ? photos.length > 0 :
    mode === 'voice' ? !!voice :
    mode === 'song' ? !!song :
    mode === 'mood' ? !!mood :
    mode === 'silent' ? true : false;

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      const media: MediaRef[] = [];
      for (const p of photos) if (mode === 'photo') media.push(await uploadPhoto(p.uri, p.width, p.height));
      if (mode === 'voice' && voice) media.push(await uploadFile(voice.uri, Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4', { durationMs: voice.ms }));
      const t = nowParts(me.user.tz);
      const trail = await autoTrail(me).catch(() => ({}));
      const payload: DropPayload = {
        v: 1,
        kind: kindFor(),
        text: text.trim() || undefined,
        mood,
        media: media.length ? media : undefined,
        song: song ?? undefined,
        hour: t.hour,
        minute: t.minute,
        tz: me.user.tz,
        cityId: me.user.cityId ?? undefined,
        tags: tags.length ? tags : undefined,
        prompt: params.prompt,
        ...trail,
      };
      await createDrop.mutateAsync({
        day: today,
        payload,
        audience,
        circleIds: audience === 'self' ? [] : audience === 'person' ? [people.find((p) => p.userId === personId)?.circleId ?? ''] : circleIds,
        personId: audience === 'person' ? personId : undefined,
        unlockOn: audience === 'time_capsule' ? unlockOn : undefined,
        mediaIds: media.map((m) => m.id),
        mediaSeconds: voice ? voice.ms / 1000 : undefined,
        meta: {
          questionId: params.questionId,
          cardId: params.cardId,
          expeditionId: params.expeditionId,
          expeditionDay: params.expeditionDay ? Number(params.expeditionDay) : undefined,
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      close();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const audienceText =
    audience === 'self'
      ? COPY.drop.audience.onlyMe
      : audience === 'person'
        ? COPY.drop.audience.onePerson(people.find((p) => p.userId === personId)?.penName ?? '…')
        : audience === 'time_capsule'
          ? COPY.drop.timeCapsuleUntil(formatDayLong(unlockOn))
          : active.filter((x) => circleIds.includes(x.id)).map((x) => x.name).join(' · ') || 'pilih lingkaran';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: SPACE.sm, height: 52, width: '100%', maxWidth: MAX_WIDTH + 32, alignSelf: 'center' }}>
        <IconButton icon="ui-tutup" label="tutup" onPress={() => close()} />
        <Txt v="h2" ink>
          Drop
        </Txt>
        <View style={{ width: 44 }} />
      </Row>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: SPACE.md }}>
          {params.prompt ? (
            <Card tint={c.pill} style={{ marginBottom: SPACE.md }}>
              <Txt v="small" ink>
                {params.prompt}
              </Txt>
            </Card>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {MODES.map((m) => (
              <Pressable key={m.mode} testID={`mode-${m.mode}`} onPress={() => setMode(m.mode)} style={{ alignItems: 'center', padding: 10, borderRadius: RADIUS.md, backgroundColor: mode === m.mode ? c.pill : 'transparent', width: 72 }}>
                <Doodle id={m.doodle} size={28} />
                <Txt v="tiny" ink={mode === m.mode} soft={mode !== m.mode}>
                  {m.label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Gap />

          {mode === 'silent' ? (
            <Card style={{ gap: SPACE.sm }}>
              <Txt v="h2" ink>
                {COPY.silentRoom.title}
              </Txt>
              <Txt v="small">{COPY.silentRoom.intro}</Txt>
              <Txt v="tiny" soft>
                {COPY.silentRoom.candleOnly}
              </Txt>
              <MoodPicker value={mood} onChange={setMood} compact />
              <Field value={text} onChangeText={setText} placeholder="boleh kosong" multiline style={{ minHeight: 60 }} />
              <Button kind="ghost" title="tempat mencari bantuan" onPress={() => router.push('/bantuan')} />
            </Card>
          ) : null}

          {mode === 'text' || mode === 'idea' ? (
            <TextInput
              testID="drop-text"
              value={text}
              onChangeText={setText}
              placeholder={mode === 'idea' ? 'ide yang lewat hari ini…' : COPY.empty.today}
              placeholderTextColor={c.inkSoft}
              multiline
              autoFocus
              style={{ fontFamily: FONTS.mono, fontSize: 17, lineHeight: 26, color: c.text, minHeight: 180, textAlignVertical: 'top', padding: 4 }}
            />
          ) : null}

          {mode === 'word' ? (
            <TextInput
              testID="drop-word"
              value={text}
              onChangeText={(t) => setText(t.split(/\s+/)[0] ?? '')}
              placeholder="satu kata hari ini"
              placeholderTextColor={c.inkSoft}
              autoFocus
              style={{ fontFamily: FONTS.mono, fontSize: 32, color: c.ink, textAlign: 'center', paddingVertical: SPACE.xl }}
            />
          ) : null}

          {mode === 'mood' ? (
            <Card style={{ gap: SPACE.md }}>
              <Txt v="small" soft>
                {COPY.empty.tired}
              </Txt>
              <MoodPicker value={mood} onChange={setMood} />
            </Card>
          ) : null}

          {mode === 'photo' ? (
            <View style={{ gap: SPACE.sm }}>
              <Row>
                <Button kind="soft" title="kamera" icon="kamera" onPress={() => pickPhoto(true)} style={{ flex: 1 }} />
                <Button kind="soft" title="galeri" icon="ui-foto" onPress={() => pickPhoto(false)} style={{ flex: 1 }} />
              </Row>
              <Row style={{ flexWrap: 'wrap' }}>
                {photos.map((p, i) => (
                  <Pressable key={p.uri} onLongPress={() => setPhotos((x) => x.filter((_, j) => j !== i))}>
                    <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: 14 }} />
                  </Pressable>
                ))}
              </Row>
              <Field value={text} onChangeText={setText} placeholder="keterangan (opsional)" multiline style={{ minHeight: 70 }} />
            </View>
          ) : null}

          {mode === 'voice' ? (
            <Card style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xl }}>
              <Pressable
                testID="record"
                onPress={rec.isRecording ? stopRecording : startRecording}
                style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: rec.isRecording ? c.danger : c.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Doodle id="ui-mikrofon" size={40} color={c.onInk} />
              </Pressable>
              <Txt ink>
                {rec.isRecording ? `${Math.floor(rec.durationMillis / 1000)} / ${maxVoice} detik` : voice ? `${Math.round(voice.ms / 1000)} detik terekam` : `tekan untuk merekam · maks ${maxVoice} detik`}
              </Txt>
              {voice && !rec.isRecording ? <Button kind="ghost" title="rekam ulang" onPress={() => setVoice(null)} /> : null}
            </Card>
          ) : null}

          {mode === 'song' ? (
            <View style={{ gap: SPACE.sm }}>
              <Field label="tautan lagu" value={songUrl} onChangeText={setSongUrl} onBlur={resolveSong} placeholder="https://open.spotify.com/track/…" autoCapitalize="none" testID="song-url" />
              <Button kind="soft" title="ambil info lagu" onPress={resolveSong} />
              {song ? (
                <Card style={{ gap: SPACE.sm }}>
                  <Field label="judul" value={song.title} onChangeText={(v) => setSong({ ...song, title: v })} />
                  <Field label="penyanyi" value={song.artist} onChangeText={(v) => setSong({ ...song, artist: v })} />
                  <Txt v="tiny" soft>
                    Yang disimpan hanya info & tautannya, bukan file lagunya.
                  </Txt>
                </Card>
              ) : null}
              <Field value={text} onChangeText={setText} placeholder="kenapa lagu ini, hari ini? (opsional)" multiline style={{ minHeight: 70 }} />
            </View>
          ) : null}

          {mode !== 'mood' && mode !== 'silent' ? (
            <>
              <Gap />
              <Txt v="label" ink soft>
                warna (opsional)
              </Txt>
              <Gap h={SPACE.sm} />
              <MoodPicker value={mood} onChange={(m) => setMood(m === mood ? undefined : m)} compact />
            </>
          ) : null}

          <Gap />
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {TAGS.map((t) => (
              <Pill key={t} active={tags.includes(t)} onPress={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>
                {`#${t}`}
              </Pill>
            ))}
          </Row>

          <Gap h={SPACE.lg} />
          <Txt v="label" ink soft>
            {COPY.drop.audienceLabel.toLowerCase()}
          </Txt>
          <Gap h={SPACE.sm} />
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {active.map((x) => (
              <Pill
                key={x.id}
                testID={`aud-circle-${x.id}`}
                active={audience === 'circle' && circleIds.includes(x.id)}
                onPress={() => {
                  setAudience('circle');
                  setCircleIds((ids) => (audience !== 'circle' ? [x.id] : ids.includes(x.id) ? ids.filter((i) => i !== x.id) : [...ids, x.id]));
                }}>
                {x.name}
              </Pill>
            ))}
            <Pill testID="aud-self" active={audience === 'self'} onPress={() => setAudience('self')}>
              {COPY.drop.audience.onlyMe}
            </Pill>
            {people.length ? (
              <Pill active={audience === 'person'} onPress={() => { setAudience('person'); setPersonId(personId ?? people[0]!.userId); }}>
                satu orang
              </Pill>
            ) : null}
            <Pill testID="aud-capsule" active={audience === 'time_capsule'} onPress={() => setAudience('time_capsule')}>
              {COPY.drop.audience.timeCapsule}
            </Pill>
          </Row>
          {audience === 'person' ? (
            <Row style={{ flexWrap: 'wrap', marginTop: SPACE.sm }} gap={6}>
              {people.map((p) => (
                <Pill key={`${p.circleId}-${p.userId}`} active={personId === p.userId} onPress={() => setPersonId(p.userId)}>
                  {p.penName}
                </Pill>
              ))}
            </Row>
          ) : null}
          {audience === 'time_capsule' ? (
            <View style={{ marginTop: SPACE.sm, gap: SPACE.sm }}>
              <Row style={{ flexWrap: 'wrap' }} gap={6}>
                {CAPSULE_OPTIONS.filter((o) => o.days <= me.limits.timeCapsuleYears * 366).map((o) => (
                  <Pill key={o.days} active={unlockOn === addDays(today, o.days)} onPress={() => setUnlockOn(addDays(today, o.days))}>
                    {o.label}
                  </Pill>
                ))}
              </Row>
              <Txt v="tiny" soft>
                Kapsul waktu ini untuk {circleIds.length && active.length ? active.filter((x) => circleIds.includes(x.id)).map((x) => x.name).join(', ') : 'dirimu sendiri'}. Terkunci sampai {formatDayLong(unlockOn)}.
              </Txt>
            </View>
          ) : null}
          {audience === 'self' ? (
            <Txt v="tiny" soft style={{ marginTop: SPACE.sm }}>
              {COPY.drop.onlyMeNote}
            </Txt>
          ) : null}
          {err ? (
            <Txt v="small" style={{ marginTop: SPACE.md }}>
              {err}
            </Txt>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACE.md, paddingBottom: SPACE.lg, backgroundColor: c.paper, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, gap: 6 }}>
          <Txt v="tiny" ink soft center testID="audience-label">
            untuk: {audienceText}
          </Txt>
          <Button title="Drop" icon="ui-tambah" onPress={send} loading={busy} disabled={!canSend || (audience === 'circle' && circleIds.length === 0) || rec.isRecording} testID="drop-send" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/hari-ini');
}
