# Arsitektur Sehari

> Prinsip utama: **cloud mengatur lalu lintas, perangkat memahami isi.**

```
┌──────────────────────── perangkat (Expo / React Native) ────────────────────────┐
│  kunci identitas X25519 (Keychain/Keystore)   kunci lingkaran per epoch (memori) │
│  enkripsi/dekripsi Drop, media, surat, judul bab, julukan, kamus                │
│  Wrap, judul bab berbasis aturan, Kamus & Motif, token, Puisi Temuan (di HP)     │
│  pengingat senja & kartu pagi (notifikasi lokal) · widget layar utama            │
└───────────────┬─────────────────────────────────────────────────────────────────┘
                │ HTTPS (JSON + ciphertext, media = byte terenkripsi)
┌───────────────▼──────────── server (Hono + Drizzle) ────────────────────────────┐
│  akun & sesi · lingkaran & anggota · bungkus kunci per anggota per epoch         │
│  Drop: ciphertext + penerima kunci + metadata (hari, jenis, audiens)            │
│  aturan: segel timbal balik, kapsul waktu, Surat Tersesat, Mode Pisah/Kenangan   │
│  streak lembut · bab/adegan/jilid · papan · Kapsul Indonesia (k-anonim)          │
│  Wrap publik (tanpa isi) · pembayaran web · push · penjadwal tiap menit          │
└───────┬──────────────┬───────────────┬──────────────┬───────────────────────────┘
        │              │               │              │
   Postgres/PGlite   S3/disk      Xendit/QRIS     Expo Push · Resend · (opsional) Claude API
```

## Monorepo

| Paket | Isi |
| --- | --- |
| `packages/core` | Kontrak API (zod), E2EE (`crypto/`), hari & zona waktu, Hijriah/senja/purnama, kota, streak, ritual deterministik, analisis teks, mesin Wrap, paket & produk, bank konten berbahasa Indonesia. Dipakai server **dan** aplikasi. |
| `packages/doodles` | 150 doodle tinta tangan sebagai data SVG murni. |
| `apps/server` | API Hono, skema Drizzle (Postgres; PGlite untuk dev/tes), penjadwal, halaman web publik. |
| `apps/mobile` | Aplikasi Expo (iOS, Android, web) + widget layar utama. |

## Model kunci (E2EE)

Primitif yang dipakai (tidak menulis kriptografi sendiri): `tweetnacl` (X25519, XSalsa20-Poly1305) dan `@noble/hashes` (scrypt, SHA-256).

1. **Identitas.** Tiap akun punya satu pasangan kunci box. Kunci rahasia hanya di perangkat. Server menyimpan **cadangan** yang dienkripsi dengan kunci turunan scrypt dari **kode pemulihan** 120-bit (24 karakter Crockford base32) — kodenya tidak pernah dikirim.
2. **Kunci lingkaran per epoch.** Pembuat lingkaran membuat kunci simetris epoch 1 dan membungkusnya (sealed box) untuk dirinya. Saat anggota keluar, perangkat anggota tersisa yang pertama membuka aplikasi **memutar kunci** (epoch+1) dan membungkusnya untuk semua anggota aktif; Drop baru memakai epoch terbaru (server menolak epoch lama dengan `epoch_stale`).
3. **Undangan.** Tautan `…/j/<token>#<rahasia>`. Rahasia di fragmen URL tidak pernah dikirim browser ke server. Server menyimpan bundel kunci lingkaran yang dienkripsi dengan rahasia itu + `sha256(rahasia)` sebagai bukti. Penerima membuka bundel, lalu membungkus ulang kunci untuk kunci publiknya sendiri.
4. **Amplop Drop.** Isi (`DropPayload`) dienkripsi dengan kunci acak (DEK). DEK dibungkus untuk: penulis (selalu), satu orang, dan/atau satu-beberapa lingkaran (epoch saat ini). Media dienkripsi terpisah; kuncinya ada di dalam payload.
5. **Tautan perangkat.** HP baru membuat kunci efemeral dan QR; HP lama memindai, membungkus kunci identitas untuk kunci efemeral itu; server hanya meneruskan ciphertext.
6. **Kode keamanan.** `safetyCode(pkA, pkB)` — 6 kelompok angka yang bisa dibandingkan langsung untuk memastikan tidak ada kunci palsu (TOFU).

## Aturan yang ditegakkan server

Server tidak bisa membaca isi, tetapi **menahan ciphertext** sesuai aturan, jadi aturannya tidak bisa diakali aplikasi tiruan:

| Aturan | Tempat |
| --- | --- |
| Segel timbal balik: Drop teman di hari D baru dikirim bila kamu sudah menyegel D (kecuali mode `open` / Kapsul Momen) | `lib/visibility.ts` |
| Kapsul waktu: ciphertext ditahan sampai `unlockOn` | `lib/visibility.ts` |
| Kartu Rahasia: terbuka bila pembaca juga menjawab kartu yang sama | `lib/visibility.ts` |
| Mode Pisah: masing-masing hanya menerima Drop miliknya | `lib/visibility.ts` |
| Blokir: isi & reaksi orang yang diblokir tidak dikirim | `lib/visibility.ts`, `lib/domain.ts` |
| Surat Tersesat: waktu tiba acak 30–365 hari, dirahasiakan bahkan dari pengirim | `routes/letters.ts` |
| Ruang Hening: hanya lilin, tanpa catatan kaki | `routes/days.ts` |
| Batas paket (lingkaran, voice, video, kapsul waktu, foto per Drop) | `routes/days.ts`, `routes/circles.ts` |
| Hari bisa disegel sampai 04.00 keesokan harinya (zona pengguna) | `core/time.ts` `sealableDays` |

## Alur utama

- **Drop** → `POST /v1/drops` (amplop + penerima + metadata). Idempoten per id (antrean offline di perangkat mengirim ulang id yang sama).
- **Segel** → `POST /v1/days/:day/seal` (bisa membawa Kalimat Terakhir). Server mengabari anggota: "Naya sudah menyegel harinya" atau "Kapsul hari ini terbuka".
- **Hari bersama** → `GET /v1/circles/:id/days/:day` mengembalikan Drop yang boleh dibaca + daftar `locked` (amplop tertutup beserta alasannya).
- **Wrap** dihitung di perangkat dari `GET /v1/circles/:id/drops?from&to` + kalender segel. Versi publik (`PublicWrapData`) disaring ulang oleh server (`sanitizePublicWrap`) sebelum disimpan di `/w/:slug`.

## Streak lembut

`core/streak.ts`. Duo: hari dihitung bila keduanya menyegel (atau memakai pembeku). Lingkaran: minimal separuh anggota aktif. Api punya level `fog → ember → dim → warm → bright`; tidak pernah "mati". Milestone 7/30/100/365 (Gerbang, Jembatan, Mercusuar, Pelabuhan). Petak Istimewa di Papan Tahun berdasarkan **umur lingkaran**, bukan streak.

## Penjadwal (tiap menit)

`apps/server/src/jobs/scheduler.ts`: antar surat & kapsul waktu, kabar Minggu Kita (Minggu 19.00 lokal), Bulan Kita (tanggal 1), Upacara Tutup Bab (akhir bulan), tutup bab otomatis setelah tenggat, tutup Kapsul Momen, bersih-bersih dedupe Kapsul Indonesia & kode masuk. Pengingat senja & kartu pagi dijadwalkan **di perangkat**.

## Widget

`apps/mobile/src/widget`. Aplikasi menulis snapshot kecil (tanggal, api, status segel, doodle hari ini, taman titik setahun — **tanpa isi Drop**):
- Android: `react-native-android-widget` (headless JS, doodle dirender sebagai SVG).
- iOS: target WidgetKit `targets/widget` via `@bacons/apple-targets`, data lewat App Group `group.app.sehari`; aset doodle PNG dibuat `npm run -w @sehari/mobile icons` / `npx tsx scripts/widget-assets.ts`.
