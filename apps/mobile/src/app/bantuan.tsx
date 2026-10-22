/**
 * Bantuan untuk hari yang terlalu berat. Lembut, tanpa menggurui: hanya pintu
 * yang bisa diketuk kapan pun kamu siap.
 */
import { COPY, HELP_RESOURCES, type HelpResource } from '@sehari/core';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { Doodle } from '@/ui/Doodle';
import { Card, Gap, Header, Row, Screen, Section, Sticky, Txt } from '@/ui/kit';
import { RADIUS, SPACE, useTheme } from '@/ui/theme';

interface Action {
  label: string;
  url: string;
  icon: string;
}

/** "119 ext. 8" → tel:119, "WA 08111-129-129" → wa.me, URL → dibuka apa adanya. */
function actionsFor(r: HelpResource): Action[] {
  return r.contact
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part): Action => {
      if (/^https?:\/\//.test(part)) return { label: `buka ${part.replace(/^https?:\/\//, '').replace(/\/$/, '')}`, url: part, icon: 'ui-panah-kanan' };
      if (/^WA\b/i.test(part)) {
        const digits = part.replace(/\D/g, '').replace(/^0/, '62');
        return { label: `chat ${part}`, url: `https://wa.me/${digits}`, icon: 'ui-teks' };
      }
      const number = part.split(/ext/i)[0]!.replace(/[^\d+]/g, '');
      return { label: `telepon ${part}`, url: `tel:${number}`, icon: 'ui-hati' };
    });
}

export default function Help() {
  const { c } = useTheme();
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => {});
  };
  return (
    <Screen header={<Header title="bantuan" subtitle="untuk hari yang berat" />}>
      <Gap h={SPACE.sm} />
      <View style={{ alignItems: 'center', gap: SPACE.sm }}>
        <Doodle id="lilin" size={56} />
        <Txt v="hand" center style={{ fontSize: 28, lineHeight: 32, color: c.text }}>
          Kamu tidak harus memikulnya sendirian.
        </Txt>
        <Txt center soft>
          {COPY.silentRoom.helpLead}
        </Txt>
      </View>

      <Gap h={SPACE.lg} />
      <Card tint={c.sticky.peach} style={{ gap: 6 }} testID="emergency">
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Doodle id="lampu" size={26} />
          <Txt v="small" style={{ flex: 1, color: c.text }}>
            {COPY.silentRoom.emergencyLead}
          </Txt>
        </Row>
        <Pressable onPress={() => open('tel:112')} accessibilityRole="button" accessibilityLabel="telepon 112" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignSelf: 'flex-start', marginLeft: 36 })}>
          <View style={{ backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Txt v="small" style={{ color: c.onInk }}>
              telepon 112
            </Txt>
          </View>
        </Pressable>
      </Card>

      <Section title="yang siap mendengar">
        <View style={{ gap: SPACE.sm }}>
          {HELP_RESOURCES.map((r) => (
            <Card key={r.name} style={{ gap: SPACE.sm }} testID={`help-${r.name}`}>
              <Txt v="h2" ink>
                {r.name}
              </Txt>
              <Txt v="small">{r.description}</Txt>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {actionsFor(r).map((a) => (
                  <Pressable key={a.url} onPress={() => open(a.url)} accessibilityRole={a.url.startsWith('tel:') ? 'button' : 'link'} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <Row gap={6} style={{ backgroundColor: c.pill, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Doodle id={a.icon} size={16} />
                      <Txt v="small" ink>
                        {a.label}
                      </Txt>
                    </Row>
                  </Pressable>
                ))}
              </Row>
            </Card>
          ))}
        </View>
        <Txt v="tiny" soft style={{ marginTop: SPACE.sm }}>
          Nomor layanan bisa berubah. Kalau belum tersambung, coba lagi sebentar lagi, atau pilih jalur lain di atas.
        </Txt>
      </Section>

      <Section title="ruang hening">
        <Sticky color="blue" tilt={-1} pin={false} onPress={() => router.push({ pathname: '/drop', params: { kind: 'silent' } })}>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <Doodle id="ui-hening" size={32} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="small" style={{ color: c.text }}>
                {COPY.silentRoom.intro}
              </Txt>
              <Txt v="tiny" style={{ color: c.text, opacity: 0.7 }}>
                Di layar Drop, pilih “hening”. {COPY.silentRoom.candleOnly}
              </Txt>
            </View>
          </Row>
        </Sticky>
      </Section>

      <Gap h={SPACE.lg} />
      <View style={{ borderRadius: RADIUS.md, padding: SPACE.md, alignItems: 'center' }}>
        <Txt v="tiny" soft center>
          Sehari bukan layanan kesehatan dan tidak membaca isi kapsulmu. Halaman ini hanya menunjukkan pintu-pintu yang bisa diketuk.
        </Txt>
      </View>
    </Screen>
  );
}
