# Konvensi aplikasi mobile (`apps/mobile`)

Expo SDK 58 · React Native 0.88 · expo-router (folder `src/app`) · TypeScript strict · @tanstack/react-query.

## Prinsip
- **Isi selalu terenkripsi.** Server hanya menerima ciphertext. Semua teks pribadi (isi Drop, nama lingkaran, judul bab, julukan, nama rasi, istilah kamus, motif, surat) dienkripsi di perangkat.
  - Isi Drop / surat / catatan kaki → `sealEnvelope(value, recipients)` dari `@sehari/core`, lihat `buildDropBody` di `src/lib/data.ts`.
  - Teks pendek milik lingkaran → `sealCircleText(circle, text)` / `openCircleText(circle, enc)` (`src/lib/data.ts`).
- **Estetika kertas, bukan layar.** Pakai komponen di `src/ui/kit.tsx` (`Screen`, `Header`, `Card`, `Txt`, `Button`, `Pill`, `Field`, `Toggle`, `ListItem`, `Section`, `Sticky`, `Empty`, `Growing`, `ErrorNote`) dan `Doodle` (`src/ui/Doodle.tsx`, id dari `@sehari/doodles`). Warna dari `useTheme().c` — jangan hardcode warna kecuali palet mood (`MOODS`).
- **Bahasa:** Indonesia santai & hangat, huruf kecil untuk label. Teks siap pakai ada di `COPY` (`@sehari/core`). Tidak ada kata yang menyalahkan, tidak ada peringkat, tidak ada "terakhir dilihat".
- **Lambat itu fitur; tidak ada kalah.** Kabut, bukan api padam. Lilin, bukan komentar.

## Pola layar
```tsx
export default function Contoh() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circle = useCircle(id);              // CircleView: name, keys, me, active, others…
  const q = useQuery({ queryKey: ['x', id], queryFn: () => api.get<T>(`/circles/${id}/x`) });
  if (!circle || q.isLoading) return <Screen header={<Header />}><Growing /></Screen>;
  return <Screen header={<Header title="judul" subtitle={circle.name} />}>…</Screen>;
}
```
- Data & dekripsi: `src/lib/data.ts` (`useCircles`, `useCircle`, `useKeyring`, `useOpenDrops`, `useCircleRange`, `useCalendar`, `useMyDays`, `useCreateDrop`, `useToday`, `useMe`).
- HTTP: `api.get/post/put/patch/del/upload/download` (`src/lib/api.ts`), path relatif ke `/v1`. Kontrak & tipe ada di `packages/core/src/api.ts`; rute server di `apps/server/src/routes/*`.
- Sesi & kunci: `useSession()` / `useReady()` (`src/lib/session.tsx`).
- Media terenkripsi: `uploadPhoto`, `uploadFile`, `useMediaUri`, komponen `Photo`, `VoiceNote` (`src/ui/media.tsx`).
- Bagikan: `shareText` (`src/lib/share.ts`).
- `testID` di elemen penting (dipakai Playwright di web; di web menjadi `data-testid`).

## Menjalankan
```bash
npm run dev:server            # API di :8787 (PGlite di apps/server/data)
cd apps/mobile && EXPO_OFFLINE=1 npx expo start --web   # web di :8081
npx tsc --noEmit -p apps/mobile
```
Di mode pengembangan, `POST /v1/auth/request-code` mengembalikan `devCode` dan layar email menampilkannya.
