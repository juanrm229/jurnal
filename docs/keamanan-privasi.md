# Keamanan & privasi

Platform yang menyimpan isi hati orang hanya akan dipercaya kalau aman untuk semua jenis hidup — termasuk hidup yang tidak harmonis. Dokumen ini menjelaskan apa yang dilindungi, apa yang tidak, dan apa yang masih harus dikerjakan sebelum peluncuran publik.

## Yang dilihat server

| Terlihat (metadata) | Tidak terlihat (terenkripsi di perangkat) |
| --- | --- |
| email, nama pena, doodle avatar, tahun lahir, zona waktu, id kota (opsional) | isi Drop: tulisan, foto, voice note, lagu, warna mood, cuaca, kota per Drop, tag |
| keanggotaan lingkaran, jenis lingkaran, kapan bergabung/keluar | nama lingkaran, nama acara Kapsul Momen |
| hari, jenis Drop (`text`, `photo`, `silent`, …), audiens, jumlah | Kalimat Terakhir, jawaban Pertanyaan Malam & kartu |
| status segel per hari, pembeku yang dipakai | judul bab & adegan, julukan tokoh, nama rasi bintang, istilah kamus & motif |
| reaksi (peluk/aku juga/aku di sini/lilin) | catatan kaki, surat & kapsul waktu |
| id kartu/pertanyaan/ekspedisi yang dijawab | media (server hanya menyimpan byte terenkripsi) |
| ukuran media | |

Jenis Drop tetap terlihat karena dibutuhkan aturan (mis. Ruang Hening hanya menerima lilin). Ini sengaja dicatat agar jujur.

## Yang tidak bisa dijaga enkripsi (dikatakan terang-terangan di aplikasi)

- Orang yang diberi akses tetap bisa menangkap layar atau memotret layar.
- Mode Pisah tidak bisa menghapus salinan yang sudah disimpan penerima.
- Kalau HP salah satu anggota dibuka orang lain, isinya ikut terlihat.
- Kunci publik dipercaya saat pertama terlihat (TOFU). Bandingkan **kode keamanan** di pengaturan lingkaran untuk memastikan.
- Pemegang tautan undangan bisa bergabung. Tautan kedaluwarsa (48 jam bawaan) dan Duo hanya sekali pakai.
- Versi web menyimpan kunci di `localStorage` — kurang aman dibanding Keychain/Keystore di HP.

## AI: tiga tingkat yang jujur

1. **Berbasis aturan (bawaan)** — Wrap, usulan judul bab, kata terbanyak, Kamus & Motif dihitung di perangkat.
2. **AI di perangkat** — disiapkan sebagai jalur berikutnya; tidak mengirim apa pun.
3. **AI cloud (opt-in per lingkaran)** — hanya aktif bila **semua** anggota aktif setuju (`PUT /circles/:id/ai-consent`), hanya memproses potongan yang dipilih pengguna sendiri, dan layar persetujuan mengatakan bahwa untuk potongan itu janji "server tidak bisa melihat" tidak berlaku. AI hanya menawarkan judul bab; tidak pernah menyimpulkan kondisi psikologis.

## Desain yang tidak toxic & bukan alat pengawasan

- Tidak ada pengikut, papan peringkat publik, "terakhir dilihat", tanda dibaca, atau statistik perbandingan kerajinan.
- Api meredup, tidak mati. Hari terlewat menjadi kabut, bukan merah. Pembeku 2/bulan (Plus 4), bisa dihadiahkan.
- Lokasi mati secara bawaan; bila dinyalakan, yang tercatat hanya nama kota. Kota terdekat dihitung di perangkat.
- Bahasa onboarding tidak mengasumsikan keluarga harmonis; ada jenis **Keluarga Pilihan**.
- **Mode Pisah**, **Mode Kenangan** (butuh 1 konfirmasi di Duo, 2 di lingkaran; orang yang ditandai bisa membatalkan), keluar satu ketukan tanpa pemberitahuan dramatis.
- Fitur melankolis (Setahun Lalu, Halaman Menguning, Surat Tersesat) bisa dimatikan per lingkaran dan berhenti otomatis di Mode Pisah/Kenangan.
- Ruang Hening selalu menampilkan jalan ke bantuan profesional dengan lembut (Healing119, SAPA 129, 112 — terverifikasi Oktober 2026, sumber di `packages/core/src/content/help.ts`).

## Pelaporan dalam sistem E2EE

Laporan atas tindakan pengguna: perangkat pelapor mengirim isi yang **ia pilih sendiri** (sudah didekripsi) ke tim keamanan (`POST /reports` field `disclosedContent`). Tim melihatnya di `/admin/reports`. Server tidak bisa memindai isi.

## Kapsul Indonesia (k-anonimitas)

Opt-in. Yang dikirim hanya (hari, provinsi, warna mood). Pencegah hitung ganda memakai HMAC harian (bukan id pengguna) dan dihapus setelah 2 hari. Provinsi dengan kontribusi < 5 tidak ditampilkan.

## Hak atas data (UU PDP)

- **Ekspor**: `GET /me/export` + dekripsi di perangkat menjadi JSON yang bisa dibaca.
- **Hapus akun**: `DELETE /me?confirm=HAPUS` menghapus akun, Drop, media, sesi, dan keanggotaan (cascade); lingkaran yang ditinggalkan diminta memutar kunci.

## Daftar periksa sebelum peluncuran publik (bukan nasihat hukum)

- [ ] DPIA untuk data spesifik (kesehatan dapat muncul di jurnal bebas) — UU 27/2022.
- [ ] Prosedur pemberitahuan insiden data (tenggat singkat) + runbook.
- [ ] Pendaftaran PSE Privat lewat OSS, termasuk kewajiban konten buatan pengguna.
- [ ] Kajian pelaporan konten pada sistem E2EE bersama konsultan hukum.
- [ ] Verifikasi usia yang lebih kuat dari pernyataan tahun lahir; kajian aturan pelindungan anak.
- [ ] Audit kriptografi oleh pihak ketiga (MASVS untuk aplikasi mobile; evaluasi MLS RFC 9420 untuk kunci grup besar seperti Kapsul Momen).
- [ ] Ganti `SERVER_SECRET`, set `DEV_AUTH=0`, `NODE_ENV=production`, aktifkan Resend, Xendit (dengan callback token), S3, Expo push.
