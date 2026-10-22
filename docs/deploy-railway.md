# Deploy ke Railway (± 10 menit)

> Sudah berjalan: **https://sehari-production.up.railway.app** (project `sehari`, auto-deploy dari branch `claude/funny-fermi-hqxbaj`).
> Uji di server sungguhan: `NODE_USE_ENV_PROXY=1 APP_URL=https://sehari-production.up.railway.app MAILTM=1 npm run e2e:web -- flow` (memakai kotak surat sekali pakai, akun uji dihapus lagi di akhir).

Satu layanan berisi web app + API, plus satu database Postgres. Semua fitur terbuka (`FREE_ALL=1` sudah diatur di `Dockerfile`). Kunci rahasia server dan kunci notifikasi dibuat otomatis saat pertama menyala dan disimpan di database — tidak perlu diisi.

Yang perlu kamu isi hanya **2 variabel**: database dan email.

## 1. Email pengirim kode masuk (Brevo, gratis 300 email/hari)

Railway memblokir SMTP (Gmail) di paket Hobby, jadi email dikirim lewat API Brevo.

1. Daftar di <https://www.brevo.com> (gratis).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: isi nama `Sehari` dan alamat Gmail-mu, lalu klik tautan verifikasi yang masuk ke Gmail.
3. **SMTP & API → API Keys → Generate a new API key**. Salin kuncinya (`xkeysib-…`).

## 2. Railway

1. <https://railway.com/new> → **Deploy from GitHub repo** → pilih `juanrm229/jurnal`.
   - Di **Settings → Source**, pilih branch `claude/funny-fermi-hqxbaj` (atau `main` kalau sudah digabung).
   - Railway otomatis memakai `railway.json` + `Dockerfile`.
2. Di kanvas project: **+ Create → Database → PostgreSQL**.
3. Buka layanan `jurnal` → **Variables → Raw Editor**, tempel lalu ganti dua baris terakhir:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   BREVO_API_KEY=xkeysib-ganti-dengan-kuncimu
   EMAIL_FROM=Sehari <emailmu@gmail.com>
   ```
   `EMAIL_FROM` harus alamat yang sudah diverifikasi di Brevo.
4. **Settings → Networking → Generate Domain** (port dideteksi otomatis; kalau ditanya, isi `8787`). Alamat `https://….up.railway.app` langsung dipakai sebagai alamat aplikasi dan tautan undangan.
5. Tunggu deploy hijau, buka alamatnya. Selesai.

Pengingat senja, kapsul waktu, dan Wrap mingguan berjalan sendiri di dalam server (Railway tidak menidurkan layanan), jadi tidak perlu cron dari luar.

## Memakai

- Buka alamatnya di HP → menu peramban → **Tambahkan ke Layar Utama**. Notifikasi dinyalakan dari **aku → notifikasi di perangkat ini** (di iPhone harus dari aplikasi yang sudah dipasang di layar utama, iOS 16.4+).
- Masuk pakai email → simpan **kode pemulihan** baik-baik.
- Buat lingkaran → kirim tautan undangan lewat WhatsApp ke pacar/teman.
- Email kode masuk kadang masuk folder **Spam/Promosi** dulu; tandai "bukan spam" sekali.

## Biaya

Railway tidak sepenuhnya gratis: ada kredit uji coba, setelah itu paket Hobby $5/bulan (sudah termasuk pemakaian $5). Untuk beberapa orang, layanan + Postgres ini biasanya muat di dalamnya. Alternatif gratis total: [deploy-gratis.md](deploy-gratis.md) (Render + Neon).

## Opsional

| Variabel | Fungsi |
| --- | --- |
| `SERVER_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | isi sendiri kalau tidak mau dibuat otomatis |
| `APP_URL`, `PUBLIC_URL` | kalau memakai domain sendiri |
| `S3_*` | simpan foto di Cloudflare R2/S3 alih-alih Postgres (set juga `BLOB_STORE=` kosong) |
