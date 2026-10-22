import type { MediaRef } from '@sehari/core';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { useMediaUri } from '@/lib/media';
import { Doodle } from './Doodle';
import { Row, Txt } from './kit';
import { RADIUS, useTheme } from './theme';

export function Photo({ media, style, height = 220 }: { media: MediaRef; style?: StyleProp<ViewStyle>; height?: number }) {
  const { c } = useTheme();
  const { uri, error } = useMediaUri(media);
  const ratio = media.width && media.height ? media.width / media.height : 4 / 3;
  return (
    <View style={[{ borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: media.tint ?? c.pill, aspectRatio: ratio, maxHeight: height * 1.6 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} accessibilityLabel="foto" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Doodle id={error ? 'awan' : 'ui-foto'} size={32} opacity={0.6} />
        </View>
      )}
    </View>
  );
}

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function VoiceNote({ media }: { media: MediaRef }) {
  const { c } = useTheme();
  const { uri } = useMediaUri(media);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  const total = (media.durationMs ?? 0) / 1000 || status.duration || 0;
  const bars = Array.from({ length: 28 }, (_, i) => 6 + ((i * 37 + media.id.charCodeAt(i % media.id.length)) % 18));
  const progress = total ? status.currentTime / total : 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'jeda voice note' : 'putar voice note'}
      onPress={() => {
        if (!uri) return;
        if (status.playing) player.pause();
        else {
          if (status.didJustFinish || (total && status.currentTime >= total - 0.2)) player.seekTo(0);
          player.play();
        }
      }}
      style={{ backgroundColor: c.pill, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }}>
      <Row gap={10}>
        <Doodle id={status.playing ? 'ui-jam' : 'ui-mikrofon'} size={22} />
        <Row gap={2} style={{ flex: 1, height: 26 }}>
          {bars.map((h, i) => (
            <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: i / bars.length <= progress ? c.ink : c.inkSoft }} />
          ))}
        </Row>
        <Txt v="tiny" ink>
          {fmt(status.playing ? status.currentTime : total)}
        </Txt>
      </Row>
    </Pressable>
  );
}
