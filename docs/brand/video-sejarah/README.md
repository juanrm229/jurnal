# Video "Dulu Kita Menulis"

Hasil jadi: [`../sehari-dulu-kita-menulis.mp4`](../sehari-dulu-kita-menulis.mp4). Formatnya 1080×1920 (9:16), 30 fps, durasi 71 detik, dengan lagu "Prayer for Her" (detik 0:19–1:30) yang dipaskan ke beat.

Strukturnya meniru video esai sejarah (babak I → babak II → kutipan → produk → logo). Versi 2 bergaya **scrapbook jurnal**: foto arsip asli (domain publik / CC, lihat [`arsip/CREDITS.md`](arsip/CREDITS.md)) diberi duotone biru Sehari, ditempel di halaman bertitik dengan selotip dan coretan tangan. Kamera terus bergerak, transisinya menyambung (tinta menyebar, kertas sobek, menembus telapak tangan), dan teks muncul per huruf dengan bobot huruf yang ikut bergerak. Bagian aplikasi memakai ilustrasi Sehari.

| Detik | Adegan | Isi & sumber |
| --- | --- | --- |
| 0–4,6 | ‹ jauh sebelum ada huruf › | goresan tinta berkumpul |
| 4,3–10,9 | foto cap tangan gua Maros + **67.800** → kamera menembus telapak → "✳ kita meninggalkan *tanda*." | cap tangan di Liang Metanduno, Muna, setidaknya 67.800 tahun (Nature, Jan 2026) |
| 10,6–15,8 | kamera meluncur turun di halaman jurnal | lempeng Uruk ± 3.300 SM · Yupa Kutai ± 400 M · lontar Bali · kantor pos Batavia 1746 · Kartini 1899–1904 |
| 15,6–21,9 | cetak biru alat tulis (foto kalam, pena, mesin tik + ilustrasi pena bulu) | "Alatnya berganti. *rindunya sama.*" |
| 21,6–24,4 | ‹ BABAK II — SURAT › | jaringan rute pos |
| 24,4–32,6 | disegel · diantar · Kartini · buku harian · telegram · ditunggu | |
| 32,6–38,4 | barisan alat tulis | "Kita tidak pernah berhenti menulis —" |
| 38,4–42 | chat menggulung | "— hanya berhenti *menyimpannya.*" + surat pos AS 103,6 miliar (2001) → 44,3 miliar (2024) |
| 42–48,2 | kutipan | Pramoedya Ananta Toer: "Orang boleh pandai setinggi langit…" |
| 48,2–51,2 | dinding kata | *tulis, simpan, kirim.* |
| 51,5–55,3 | disegel 1940 · dibuka **8113** → jadi, kami membuat sebuah *kapsul.* | Crypt of Civilization |
| 55,3–60,7 | Sehari adalah kapsul waktu harian (HP + label fitur) | tulis · foto · suara · surat tersesat · kapsul 1–25 tahun |
| 60–63,2 | ✳ selamat malam, *penulis.* | |
| 63,2–67 | langit malam, logo, sehari.online | |

## Musik & sinkron beat

- Lagu: "Prayer for Her", dipakai dari detik **0:19** (awal bait) sampai **±1:30**. Taruh file lagunya sebagai `musik.m4a` di folder ini (tidak di-commit), atau pakai `--musik file`. Tanpa lagu, render memakai musik latar sementara dari `audio.cjs --latar`.
- Kenapa bagian itu: bait yang tegas di 0:19 membuka video. Reff di 0:50 jatuh di montase surat (video 31, saat lak dihantamkan). Jeda hampir hening di 1:11,8–1:13,4 menampung "jadi, kami membuat sebuah", lalu reff besar di 1:13,56 jadi momen lak **kapsul.** dihantamkan dan Sehari muncul.
- `timing.js` berisi beat lagu (`BEATS`), titik jangkar [waktu adegan, beat] (`ANCHORS`), dan `MUSIC_START` (detik lagu = video 0).

```bash
node docs/brand/video-sejarah/render.cjs
node docs/brand/video-sejarah/render.cjs /tmp/x.mp4 --stills 7.6,24.9
```
