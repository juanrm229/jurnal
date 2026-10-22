/**
 * Kartu publik Wrap: satu-satunya bentuk yang boleh keluar dari lingkaran.
 * Hanya menerima `PublicWrapData` — angka streak, taman hari tersegel, palet,
 * judul bab, lagu tema. Tidak ada nama, isi, atau foto.
 */
import type { PublicWrapData } from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { forwardRef } from 'react';
import { type HostInstance, Text, View } from 'react-native';
import { Doodle } from '@/ui/Doodle';
import { FONTS, LIGHT } from '@/ui/theme';

const TITLE: Record<PublicWrapData['scope'], string> = { week: 'Minggu Kita', month: 'Bulan Kita', year: 'Tahun Kita', moment: 'Kapsul Momen' };
const KIND: Record<PublicWrapData['circleKind'], string> = { duo: 'berdua', circle: 'satu lingkaran', chosen_family: 'keluarga pilihan', moment: 'satu acara' };

export const PUBLIC_CARD_W = 300;
export const PUBLIC_CARD_H = 533;

function Garden({ data, width }: { data: PublicWrapData; width: number }) {
  const n = data.garden.length;
  const cols = n <= 7 ? 7 : n <= 31 ? 7 : n <= 120 ? 12 : 19;
  const cell = Math.floor(width / cols);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: cell * cols }}>
      {data.garden.map((sealed, i) => (
        <View key={i} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
          {sealed ? (
            <Doodle id={gardenDoodleFor(`${data.period}:${i}`).id} size={cell * 0.92} color={LIGHT.ink} strokeWidth={n > 120 ? 3.2 : 2.4} />
          ) : (
            <View style={{ width: Math.max(3, cell * 0.18), height: Math.max(3, cell * 0.18), borderRadius: 4, backgroundColor: LIGHT.fog }} />
          )}
        </View>
      ))}
    </View>
  );
}

export const PublicCard = forwardRef<HostInstance, { data: PublicWrapData }>(function PublicCard({ data }, ref) {
  const c = LIGHT;
  const inner = PUBLIC_CARD_W - 40;
  return (
    <View
      ref={ref}
      collapsable={false}
      testID="public-card"
      style={{ width: PUBLIC_CARD_W, height: PUBLIC_CARD_H, backgroundColor: c.paper, borderRadius: 18, padding: 20, overflow: 'hidden', justifyContent: 'space-between' }}>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.monoMedium, fontSize: 12, letterSpacing: 3, color: c.ink }}>SEHARI</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSoft }}>{data.label.toLowerCase()}</Text>
        </View>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 28, lineHeight: 34, color: c.ink, marginTop: 14 }}>{TITLE[data.scope]}</Text>
        {data.chapterTitle ? <Text style={{ fontFamily: FONTS.handBold, fontSize: 26, lineHeight: 28, color: c.text }}>“{data.chapterTitle}”</Text> : null}
        {data.genre ? <Text style={{ fontFamily: FONTS.hand, fontSize: 22, color: c.text }}>genre: {data.genre}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Doodle id="ui-api" size={46} color={c.ink} />
        <View>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 52, lineHeight: 56, color: c.ink }}>{data.streak}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSoft }}>
            hari berturut-turut · terpanjang {data.longest}
          </Text>
        </View>
      </View>

      <View>
        <Garden data={data} width={inner} />
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSoft, marginTop: 6 }}>
          {data.sealedDays}/{data.totalDays} hari tersegel · {KIND[data.circleKind]}
          {data.circleKind === 'duo' ? '' : `, ${data.memberCount} orang`}
        </Text>
      </View>

      {data.palette.length ? (
        <View style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden' }}>
          {data.palette.map((p) => (
            <View key={p.mood} style={{ flex: Math.max(0.05, p.share), backgroundColor: p.color }} />
          ))}
        </View>
      ) : (
        <View style={{ height: 18, borderRadius: 9, backgroundColor: c.fog, opacity: 0.5 }} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {data.themeSong ? (
          <>
            <Doodle id="ui-lagu" size={26} color={c.ink} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1, color: c.textSoft }}>LAGU TEMA</Text>
              <Text numberOfLines={1} style={{ fontFamily: FONTS.monoMedium, fontSize: 13, color: c.text }}>
                {data.themeSong.title} — {data.themeSong.artist}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ fontFamily: FONTS.hand, fontSize: 20, color: c.text, flex: 1 }}>hari-hari kecil, dijalani bersama.</Text>
        )}
      </View>
    </View>
  );
});
