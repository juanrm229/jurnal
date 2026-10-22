import { getCity, limitsFor, zoneLabel } from '@sehari/core';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useMe } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Avatar } from '@/ui/Avatar';
import { Button, Card, Gap, ListItem, Pill, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

export default function MeTab() {
  const me = useMe();
  const { signOut } = useSession();
  const { c } = useTheme();
  const city = getCity(me.user.cityId);
  const plus = me.user.plan !== 'free';
  return (
    <Screen>
      <Gap h={SPACE.md} />
      <Txt v="display" ink>
        aku
      </Txt>
      <Gap />
      <Card onPress={() => router.push('/aku/profil')} testID="profile-card">
        <Row gap={14}>
          <Avatar doodle={me.user.doodle} size={56} sealed />
          <View style={{ flex: 1 }}>
            <Txt v="title" ink>
              {me.user.penName}
            </Txt>
            <Txt v="tiny" soft>
              {city ? `${city.name} · ` : ''}
              {zoneLabel(me.user.tz)}
            </Txt>
          </View>
          <Pill active={plus}>{plus ? (me.user.plan === 'plus_duo' ? 'Plus Duo' : 'Plus') : 'gratis'}</Pill>
        </Row>
      </Card>
      {!plus ? (
        <Card tint={c.pill} onPress={() => router.push('/plus')} style={{ marginTop: SPACE.sm }} testID="plus-card">
          <Txt ink>Sehari Plus</Txt>
          <Txt v="tiny">Lingkaran tanpa batas, voice note 5 menit, kapsul waktu 25 tahun, Kamus Lingkaran, ekspor OST.</Txt>
        </Card>
      ) : null}

      <Section title="pengaturan">
        <ListItem icon="ui-jam" title="Pengingat & notifikasi" subtitle={me.user.settings.sunsetSeal ? 'segel saat senja' : `pukul ${me.user.settings.sealHour}.00`} onPress={() => router.push('/aku/pengaturan')} testID="settings" />
        <ListItem icon="matahari" title="Jejak otomatis" subtitle="cuaca, langkah, kota — semua opsional" onPress={() => router.push('/aku/jejak')} />
        <ListItem icon="ui-gembok" title="Keamanan & perangkat" subtitle="kode pemulihan, tautkan HP baru" onPress={() => router.push('/aku/keamanan')} testID="security" />
        <ListItem icon="kunci" title="Privasi & data" subtitle="E2EE, AI, ekspor, hapus akun" onPress={() => router.push('/aku/privasi')} testID="privacy" />
      </Section>
      <Section title="toko kecil">
        <ListItem icon="kartu" title="Dek kartu tematik" subtitle="Rindu, Perantau, Ramadan, …" onPress={() => router.push('/aku/dek')} />
        <ListItem icon="buku" title="Buku Tahunan" subtitle="cetak Tahun Kita" onPress={() => router.push('/rak')} />
        <ListItem icon="kado" title="Hadiah & kode" subtitle="hadiahkan Plus atau tukar kode" onPress={() => router.push('/aku/hadiah')} />
        <ListItem icon="tiket" title="Pesanan" onPress={() => router.push('/aku/pesanan')} />
      </Section>
      <Section title="lainnya">
        <ListItem icon="lilin" title="Bantuan & dukungan" subtitle="kalau hari terasa terlalu berat" onPress={() => router.push('/bantuan')} />
        <ListItem icon="ui-bendera-lapor" title="Diblokir" onPress={() => router.push('/aku/blokir')} />
      </Section>
      <Gap h={SPACE.lg} />
      <Button kind="ghost" title="keluar" onPress={signOut} testID="sign-out" />
      <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
        Sehari · paket {me.user.plan} · {limitsFor(me.user.plan).maxCircles} lingkaran
      </Txt>
    </Screen>
  );
}
