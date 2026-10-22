# Coba di laptop sendiri

Butuh **Node.js 22** (unduh di <https://nodejs.org>, pilih versi LTS) dan **Git**.

```bash
git clone https://github.com/juanrm229/jurnal.git
cd jurnal
git checkout claude/funny-fermi-hqxbaj
npm run lokal
```

Pertama kali butuh beberapa menit (memasang paket & membangun web app). Setelah itu buka **http://localhost:8787**.

- Kode masuk langsung tampil di layar masuk — tanpa email.
- Data tersimpan di `apps/server/data` dan tetap ada setelah dimatikan (Ctrl+C) lalu dinyalakan lagi.
- HP di Wi-Fi yang sama bisa membuka alamat `http://192.168.x.x:8787` yang tercetak di terminal (notifikasi & pasang ke layar utama butuh https, jadi belum bisa lewat cara ini).
- Setelah ada pembaruan: `git pull` lalu `npm run lokal -- --build`.

## Mengajak pacar/teman dari tempat lain (opsional)

1. Buat file `.env` di folder `jurnal` supaya kode masuk dikirim lewat email (wajib kalau dibuka dari internet):
   ```
   BREVO_API_KEY=xkeysib-…
   EMAIL_FROM=Sehari <juanmaulana29@gmail.com>
   ```
2. Jalankan `npm run lokal`, lalu di terminal lain:
   ```bash
   npx cloudflared tunnel --url http://localhost:8787
   ```
   Muncul alamat `https://….trycloudflare.com` — kirim itu ke mereka. Alamatnya berganti setiap kali dijalankan ulang, dan hanya bisa dibuka selama laptopmu menyala.

Kalau sudah cocok dan mau online terus tanpa laptop: [deploy-railway.md](deploy-railway.md) atau gratis di Render + Neon: [deploy-gratis.md](deploy-gratis.md).
