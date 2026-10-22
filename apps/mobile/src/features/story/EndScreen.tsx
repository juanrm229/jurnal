/**
 * Halaman akhir Wrap: kartu publik (tanpa isi pribadi), OST lingkaran, dan —
 * untuk Tahun Kita — surat untuk diri sendiri yang baru terbuka tahun depan.
 */
import { COPY, type PublicWrapWire, type SongRef, type Wrap } from '@sehari/core';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { type HostInstance, Platform, Pressable, ScrollView, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { shareText } from '@/lib/share';
import { exportPlaylist, spotifyAvailable } from '@/lib/spotify';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Row, Section, Sticky, Txt } from '@/ui/kit';
import { MAX_WIDTH, RADIUS, SPACE, useTheme } from '@/ui/theme';
import { openSong, PROVIDER_LABEL } from './cards';
import { PublicCard } from './PublicCard';

export function songListText(songs: (SongRef & { count: number })[], title: string): string {
  return [`${title} — OST Sehari`, '', ...songs.map((s, i) => `${i + 1}. ${s.title} — ${s.artist}${s.url ? `\n   ${s.url}` : ''}`)].join('\n');
}

export function EndScreen({
  wrap,
  songs,
  onReplay,
  onBack,
  onClose,
}: {
  wrap: Wrap;
  songs: (SongRef & { count: number })[];
  onReplay: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<HostInstance>(null);
  const [busy, setBusy] = useState<'share' | 'link' | 'spotify' | null>(null);
  const [ostNote, setOstNote] = useState<string | null>(null);
  const [link, setLink] = useState<PublicWrapWire | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const year = wrap.scope === 'year' ? Number(wrap.period) : null;
  const native = Platform.OS !== 'web';

  const shareImage = async () => {
    setBusy('share');
    setNote(null);
    try {
      const uri = await captureRef(cardRef as never, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: wrap.title, UTI: 'public.png' });
      else setNote('Berbagi belum tersedia di perangkat ini.');
    } catch (e) {
      setNote((e as Error).message || 'Kartunya belum bisa dibuat. Coba sekali lagi.');
    } finally {
      setBusy(null);
    }
  };

  const makeLink = async () => {
    setBusy('link');
    setNote(null);
    try {
      // Hanya PublicWrapData yang dikirim; server membersihkannya lagi.
      setLink(await api.post<PublicWrapWire>('/public-wraps', { data: wrap.public }));
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toSpotify = async () => {
    setBusy('spotify');
    setOstNote(null);
    try {
      const r = await exportPlaylist(`${wrap.title} · ${wrap.label}`, 'OST lingkaran dari Sehari.', songs);
      setOstNote(r.missing ? `Tersimpan ${r.added} lagu. ${r.missing} lagu belum ketemu di Spotify.` : `Tersimpan ${r.added} lagu di Spotify.`);
      void WebBrowser.openBrowserAsync(r.url).catch(() => {});
    } catch (e) {
      setOstNote(`Belum bisa menyimpan ke Spotify. ${(e as Error).message || ''} Daftar lagunya tetap bisa disalin.`.trim());
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string, msg: string) => {
    await Clipboard.setStringAsync(text);
    setNote(msg);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SPACE.md, paddingBottom: insets.bottom + SPACE.xxl, alignItems: 'center' }} testID="wrap-end">
      <View style={{ width: '100%', maxWidth: MAX_WIDTH }}>
        <Txt v="label" ink soft center>
          {wrap.title.toLowerCase()} · {wrap.label.toLowerCase()}
        </Txt>
        <Txt v="title" ink center style={{ marginTop: 4 }}>
          simpan & bagikan
        </Txt>

        <Section title="kartu publik">
          <View style={{ alignItems: 'center' }}>
            <View style={{ transform: [{ rotate: '-1.5deg' }], shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5, borderRadius: 18 }}>
              <PublicCard ref={cardRef} data={wrap.public} />
            </View>
          </View>
          <Gap h={SPACE.md} />
          <Row gap={8} style={{ alignItems: 'flex-start' }}>
            <Doodle id="ui-gembok" size={20} />
            <Txt v="small" soft style={{ flex: 1 }}>
              {COPY.wraps.publicVersion}
            </Txt>
          </Row>
          <Gap h={SPACE.md} />
          {native ? <Button title="bagikan kartu publik" icon="ui-bagikan" onPress={shareImage} loading={busy === 'share'} testID="share-public" /> : null}
          {!link ? (
            <Button
              kind={native ? 'ghost' : 'primary'}
              title={native ? 'atau buat tautan publik' : 'bagikan kartu publik'}
              icon={native ? undefined : 'ui-bagikan'}
              onPress={makeLink}
              loading={busy === 'link'}
              style={{ marginTop: native ? SPACE.sm : 0 }}
              testID="make-public-link"
            />
          ) : (
            <Card style={{ gap: SPACE.sm }} testID="public-link">
              <Txt v="tiny" soft>
                tautan publik
              </Txt>
              <Txt v="small" ink selectable numberOfLines={2}>
                {link.url}
              </Txt>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                <Button kind="soft" title="salin tautan" onPress={() => copy(link.url, 'Tautan disalin.')} style={{ flex: 1, minHeight: 44, minWidth: 130, paddingHorizontal: 10 }} testID="copy-public-link" />
                <Button kind="soft" title="buka gambar" onPress={() => WebBrowser.openBrowserAsync(link.imageUrl)} style={{ flex: 1, minHeight: 44, minWidth: 130, paddingHorizontal: 10 }} />
              </Row>
              <Button kind="ghost" title="bagikan tautan" onPress={() => shareText(`${wrap.title} · ${wrap.label}`, link.url).then((r) => r === 'copied' && setNote('Tautan disalin.'))} style={{ minHeight: 44 }} />
            </Card>
          )}
          {note ? (
            <Txt v="small" ink center style={{ marginTop: SPACE.sm }}>
              {note}
            </Txt>
          ) : null}
        </Section>

        <Section
          title="simpan OST"
          right={
            songs.length ? (
              <Pressable onPress={() => Clipboard.setStringAsync(songListText(songs, wrap.title)).then(() => setOstNote('Daftar lagu disalin.'))} testID="copy-ost">
                <Txt v="tiny" ink>
                  salin daftar lagu
                </Txt>
              </Pressable>
            ) : undefined
          }>
          {songs.length ? (
            <Card style={{ paddingVertical: SPACE.sm }}>
              {songs.map((s, i) => (
                <Pressable key={`${s.title}|${s.artist}`} onPress={() => openSong(s.url)} accessibilityRole="link" style={({ pressed }) => ({ paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
                  <Row gap={12}>
                    <Txt v="tiny" soft style={{ width: 20 }}>
                      {String(i + 1).padStart(2, '0')}
                    </Txt>
                    <View style={{ flex: 1 }}>
                      <Txt v="small" ink numberOfLines={1}>
                        {s.title}
                      </Txt>
                      <Txt v="tiny" soft numberOfLines={1}>
                        {s.artist} · {PROVIDER_LABEL[s.provider] ?? 'tautan'}
                        {s.count > 1 ? ` · ${s.count}×` : ''}
                      </Txt>
                    </View>
                    <Doodle id="ui-panah-kanan" size={16} opacity={0.6} />
                  </Row>
                </Pressable>
              ))}
            </Card>
          ) : (
            <Card style={{ alignItems: 'center', gap: 6 }}>
              <Doodle id="ui-lagu" size={30} opacity={0.6} />
              <Txt v="small" soft center>
                Belum ada lagu di periode ini. Lagu yang kalian Drop akan jadi OST di sini.
              </Txt>
            </Card>
          )}
          {songs.length && spotifyAvailable() ? (
            <Button kind="soft" title="simpan ke Spotify" icon="ui-lagu" onPress={toSpotify} loading={busy === 'spotify'} style={{ marginTop: SPACE.sm }} testID="ost-spotify" />
          ) : null}
          {ostNote ? (
            <Txt v="small" ink center style={{ marginTop: SPACE.sm }}>
              {ostNote}
            </Txt>
          ) : null}
          <Txt v="tiny" soft style={{ marginTop: 6 }}>
            Tautan dibuka di aplikasi musikmu. Sehari tidak memutar lagu.
          </Txt>
        </Section>

        {year ? (
          <Section title="untuk tahun depan">
            <Sticky color="peach" tilt={1.2}>
              <Row gap={12} style={{ alignItems: 'flex-start' }}>
                <Doodle id="jam-pasir" size={40} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt v="hand" style={{ fontSize: 26, lineHeight: 28, color: c.text }}>
                    {COPY.wraps.letterToSelf}
                  </Txt>
                  <Txt v="small" soft>
                    Tulis untuk dirimu yang membuka jilid {year + 1}. Surat ini terkunci sampai 1 Januari.
                  </Txt>
                </View>
              </Row>
              <Gap h={SPACE.sm} />
              <Button
                title="tulis surat"
                icon="pena"
                onPress={() => router.push({ pathname: '/surat/tulis', params: { kind: 'future', self: '1', deliverOn: `${year + 1}-01-01` } })}
                testID="letter-to-self"
              />
            </Sticky>
          </Section>
        ) : null}

        <Gap h={SPACE.lg} />
        <Row gap={8}>
          <Button kind="ghost" title="kembali" onPress={onBack} style={{ flex: 1 }} />
          <Button kind="soft" title="putar lagi" onPress={onReplay} style={{ flex: 1 }} testID="wrap-replay" />
        </Row>
        <Button kind="ghost" title="tutup" onPress={onClose} style={{ marginTop: SPACE.sm, borderRadius: RADIUS.sm }} />
      </View>
    </ScrollView>
  );
}
