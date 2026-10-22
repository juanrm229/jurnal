# Sehari

*Kapsul waktu harian yang diisi bersama orang terdekat.* Setiap hari kamu menjatuhkan satu hal kecil — tulisan, foto, voice note, lagu, warna mood — ke kapsul hari itu. Malamnya kalian menyegelnya, dan kapsul teman baru terbuka setelah kamu menyegel kapsulmu sendiri. Hari jadi halaman, minggu jadi adegan, bulan jadi bab, tahun jadi jilid.

> *"Strava-nya hidup sehari-hari. Bukan jarak yang kamu catat, tapi hari yang kamu jalani bersama."*

Isi lingkaran **dienkripsi end-to-end** di perangkat. Server hanya menyimpan ciphertext, daftar penerima kunci, dan status segel.

## Web app (PWA) — versi yang dipakai sekarang

`apps/web` adalah versi web penuh fitur yang bisa dipasang di layar utama HP: halaman jurnal bebas (ketuk di mana saja untuk menulis, seret & putar foto dan stiker di atas tulisan, tempel foto langsung dari galeri/papan klip), upacara segel dengan amplop & lilin, buka bersama berdampingan seperti buku, lingkaran, kenangan, surat, Wrap, papan & kitab, serta tema warna tinta doodle & kertas.

```bash
npm install
npm run dev:server   # API :8787
npm run dev:web      # web app :5173
```

Deploy gratis untuk pemakaian pribadi (Render + Neon + Gmail SMTP, semua fitur terbuka): lihat [docs/deploy-gratis.md](docs/deploy-gratis.md). Uji: `npm run e2e:web` (butuh dua perintah di atas berjalan).

Aplikasi Expo (`apps/mobile`) disimpan untuk dikembangkan nanti; keduanya memakai server dan paket yang sama.

## Isi repo

```
apps/
  web/       Web app PWA (Vite + React) — versi utama saat ini
  mobile/    Aplikasi Expo SDK 58 (iOS, Android, web) + widget layar utama (disimpan)
  server/    API Hono + Drizzle (Postgres / PGlite), penjadwal, halaman Wrap publik
packages/
  core/      Kontrak API, E2EE, hari & zona waktu, Hijriah/senja, streak, ritual, Wrap, konten
  doodles/   234 doodle tinta tangan + 10 ilustrasi besar (data SVG)
docs/        arsitektur, keamanan & privasi, konvensi mobile, katalog fitur
e2e/         uji ujung-ke-ujung (Playwright): web.mjs untuk web app, flow.mjs untuk Expo web
```

## Menjalankan

Butuh Node 22.

```bash
npm install
npm run dev:server                                   # API di http://localhost:8787 (PGlite di apps/server/data)
cd apps/mobile && EXPO_OFFLINE=1 npx expo start      # tekan w untuk web, atau buka di Expo Go / dev build
```

- Mode pengembangan: kode masuk email dicetak di konsol server **dan** ditampilkan di layar masuk. Pembayaran memakai halaman bayar tiruan (`/dev/pay/:id`).
- HP fisik: aplikasi otomatis memakai IP komputer Metro untuk API. Atau set `EXPO_PUBLIC_API_URL`.
- Widget, push, dan beberapa modul native butuh **dev build** (`npx expo run:ios` / `run:android` atau EAS), bukan Expo Go.
- Data contoh: `npm run seed` membuat Raka, Naya, dan Sari dalam satu Duo + satu Lingkaran, lalu mencetak isi `localStorage` untuk masuk di web.

### Tes

```bash
npm test                   # core (13) + server (19): E2EE, streak, Hijriah, segel timbal balik, kapsul waktu, Surat Tersesat, rotasi kunci, pembayaran, Wrap publik…
npm run typecheck          # semua workspace
CHROMIUM_PATH=/path/ke/chromium npm run e2e   # butuh server + web berjalan
```

## Produksi

- Server: `docker build -f apps/server/Dockerfile .` atau `docker compose up` (Postgres + server). Variabel lingkungan ada di `apps/server/.env.example`: Postgres, S3 (media terenkripsi), Resend (kode masuk), Xendit (QRIS/e-wallet/VA), Expo push, `ANTHROPIC_API_KEY` opsional untuk AI cloud opt-in.
- Aplikasi: EAS Build. Set `extra.apiUrl` di `app.json` (atau `EXPO_PUBLIC_API_URL`), `ios.appleTeamId`, `extra.eas.projectId`, dan `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` bila ekspor OST ke Spotify dipakai.
- Web (Wrap publik & landing undangan) dilayani server di `/w/:slug` dan `/j/:token`; aplikasi web lengkap: `npx expo export --platform web`.

Baca juga: [docs/arsitektur.md](docs/arsitektur.md) · [docs/keamanan-privasi.md](docs/keamanan-privasi.md) · [docs/fitur.md](docs/fitur.md) · [docs/mobile-conventions.md](docs/mobile-conventions.md)
