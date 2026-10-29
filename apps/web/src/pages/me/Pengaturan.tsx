/** Pengingat & notifikasi, plus jalan pintas ke tampilan (tinta & kertas). */
import { COPY, getCity, sunsetUtc, type UserSettings } from '@sehari/core';
import { useMe, useToday } from '@/lib/data';
import { navigate } from '@/lib/router';
import { Header, ListLink, Section, Toggle } from '@/ui/kit';
import { Hr, HourPicker, ListCard, Note, SavedHint, useSaveSettings } from './kit';

function sunsetLabel(day: string, cityId: string | null, tz: string): string | null {
  const city = getCity(cityId);
  if (!city) return null;
  const at = sunsetUtc(day, city.lat, city.lon);
  if (!at) return null;
  const time = new Intl.DateTimeFormat('id-ID', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
  return `Senja hari ini di ${city.name} sekitar pukul ${time.replace(':', '.')}.`;
}

export default function Pengaturan() {
  const me = useMe();
  const today = useToday();
  const { save, saving, error, savedAt } = useSaveSettings();
  const s = me.user.settings;
  const sunset = sunsetLabel(today, me.user.cityId, me.user.tz);
  const set = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) => void save({ [k]: v } as Partial<UserSettings>);

  return (
    <main className="screen">
      <Header title="pengingat & notifikasi" backTo="/aku" right={<SavedHint saving={saving} error={null} savedAt={savedAt} />} />
      {error ? (
        <Note color="peach" style={{ marginBottom: 12 }}>
          {error}
        </Note>
      ) : null}
      <p className="small soft" style={{ margin: 0 }}>
        Pengingat yang lembut, sekali sehari. Tidak ada pesan yang membuat merasa bersalah, dan semuanya bisa dimatikan.
      </p>

      <Section title="pengingat menyegel">
        <ListCard>
          <Toggle label="Segel Saat Senja" hint={sunset ?? 'Pengingat datang saat matahari terbenam di kotamu.'} value={s.sunsetSeal} onChange={(v) => set('sunsetSeal', v)} />
        </ListCard>
        {!s.sunsetSeal ? (
          <div className="col rise" style={{ marginTop: 14, gap: 10 }}>
            <span className="small">Ingatkan aku setiap hari pukul</span>
            <HourPicker value={s.sealHour} onChange={(h) => set('sealHour', h)} />
            <span className="tiny soft">Hari baru dimulai pukul 04.00, jadi menyegel lewat tengah malam tetap masuk hari kemarin.</span>
          </div>
        ) : null}
      </Section>

      <Section title="pagi">
        <ListCard>
          <Toggle label="Kartu pagi" hint={COPY.notifications.morningCard} value={s.morningCard} onChange={(v) => set('morningCard', v)} />
        </ListCard>
      </Section>

      <Section title="kabar dari lingkaran">
        <ListCard>
          <Toggle
            label="Saat orang yang kamu pilih menyegel"
            hint={`Contohnya: “${COPY.notifications.partnerSealed('Naya')}” Tidak ada jam, tidak ada “terakhir dilihat”.`}
            value={s.notifyPartnerSealed}
            onChange={(v) => set('notifyPartnerSealed', v)}
          />
          <Hr />
          <Toggle label="Wrap sudah jadi" hint={COPY.notifications.weeklyWrapReady} value={s.notifyWraps} onChange={(v) => set('notifyWraps', v)} />
          <Hr />
          <Toggle label="Surat yang tiba" hint={COPY.notifications.lostLetterArrived} value={s.notifyLetters} onChange={(v) => set('notifyLetters', v)} />
          <Hr />
          <Toggle label="Kabar dari teman" hint="Teman mulai mengisi halaman, memberi reaksi atau catatan kaki di halamanmu, dan mengajak main game." value={s.notifyActivity ?? true} onChange={(v) => set('notifyActivity', v)} />
        </ListCard>
        <p className="tiny soft" style={{ margin: '8px 0 0' }}>
          Notifikasi dikirim ke perangkat yang menyalakannya di halaman Aku → notifikasi di perangkat ini. Pilihan di sini berlaku untuk semua perangkatmu.
        </p>
      </Section>

      <Section title="tampilan">
        <ListCard>
          <ListLink icon="pena" title="tinta & kertas" sub="warna doodle dan warna latar, termasuk kertas malam" onClick={() => navigate('/aku/tema')} />
        </ListCard>
        <p className="tiny soft" style={{ margin: '8px 0 0' }}>
          Kertas malam memakai latar hitam pekat supaya mata tetap tenang sebelum tidur.
        </p>
      </Section>
    </main>
  );
}
