# Deploy gratis (pemakaian pribadi)

Satu layanan berisi web app (PWA) + API. Semua fitur terbuka untuk semua akun (`FREE_ALL=1`), tanpa pembayaran.

| Bagian | Layanan gratis | Catatan |
| --- | --- | --- |
| Server + web app | [Render](https://render.com) — Web Service, plan **Free** | tidur setelah 15 menit sepi; dibangunkan cron di bawah |
| Database | [Neon](https://neon.tech) — Postgres **Free** (0,5 GB) | foto/suara terenkripsi ikut disimpan di sini (`BLOB_STORE=db`) |
| Email kode masuk | Gmail + **App Password** (SMTP) | ±500 email/hari, lebih dari cukup |
| Jadwal & tetap bangun | [cron-job.org](https://cron-job.org) | panggil `/cron?token=…` tiap 10 menit |
| Notifikasi | Web Push (VAPID) | gratis, tanpa layanan pihak ketiga |

Kalau foto sudah banyak (0,5 GB ≈ 2.000–3.000 foto), pindahkan media ke Cloudflare R2 (10 GB gratis): isi `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto`, lalu hapus `BLOB_STORE`.

## Langkah

1. **Neon** → buat project → salin *connection string* (`postgresql://…?sslmode=require`).
2. **Gmail** → Akun Google → Keamanan → Verifikasi 2 langkah (nyalakan) → *App passwords* → buat satu untuk "Sehari". Simpan 16 hurufnya.
3. **Kunci VAPID** (untuk notifikasi), sekali saja di komputermu:
   ```bash
   npx web-push generate-vapid-keys
   ```
4. **Render** → *New* → *Blueprint* → pilih repo ini (file `render.yaml` terbaca otomatis). Isi variabel yang diminta:
   - `DATABASE_URL` — dari Neon
   - `PUBLIC_URL` dan `APP_URL` — alamat Render-mu, mis. `https://sehari-xxxx.onrender.com` (boleh diisi setelah deploy pertama, lalu *Manual Deploy* lagi)
   - `SMTP_USER` — alamat Gmail-mu, `SMTP_PASS` — App Password
   - `EMAIL_FROM` — mis. `Sehari <kamu@gmail.com>`
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` dari langkah 3, `VAPID_SUBJECT` = `mailto:kamu@gmail.com`
   - `SERVER_SECRET` dan `CRON_TOKEN` dibuat otomatis. **Jangan ganti `SERVER_SECRET` setelah dipakai.**
5. Tunggu build selesai, buka alamatnya. Migrasi database berjalan sendiri saat server menyala.
6. **cron-job.org** → buat cron job: URL `https://ALAMATMU/cron?token=CRON_TOKEN` (lihat nilainya di Render → Environment), setiap 10 menit. Ini menjalankan pengingat senja, kapsul waktu, Wrap mingguan, sekaligus menjaga server tidak tidur.

## Memakai

- Buka alamatnya di HP → menu peramban → **Tambahkan ke Layar Utama**. Di iPhone, notifikasi hanya bisa dinyalakan dari aplikasi yang sudah dipasang di layar utama (iOS 16.4+).
- Masuk pakai email → simpan **kode pemulihan** (satu-satunya cara membuka arsip di perangkat baru).
- Buat lingkaran (berdua atau 3–8 orang) → kirim tautan undangan lewat WhatsApp. Rahasia kunci ada di bagian `#…` tautan, tidak pernah sampai ke server.

## Menjalankan di komputer sendiri

```bash
npm install
npm run dev:server          # API di :8787 (PGlite lokal, kode masuk tampil di layar)
npm run dev -w @sehari/web  # web app di :5173 (proxy ke :8787)
```

Atau satu proses seperti produksi:

```bash
npm run build -w @sehari/web
WEB_DIST=$PWD/apps/web/dist FREE_ALL=1 BLOB_STORE=db npm run dev:server   # buka http://localhost:8787
```

Aplikasi Expo (`apps/mobile`) tetap disimpan untuk dikembangkan nanti; web app memakai server dan paket `core`/`doodles` yang sama.
