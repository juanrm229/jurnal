# Video "Dulu Kita Menulis"

Hasil jadi: [`../sehari-dulu-kita-menulis.mp4`](../sehari-dulu-kita-menulis.mp4). Formatnya 1080×1920 (9:16), 30 fps, durasi 71 detik, dengan lagu "Prayer for Her" (detik 0:19–1:30) yang dipaskan ke beat.

Strukturnya meniru video esai sejarah (babak I → babak II → kutipan → produk → logo). Versi 2 bergaya **scrapbook jurnal**: foto arsip asli (domain publik / CC, lihat [`arsip/CREDITS.md`](arsip/CREDITS.md)) diberi duotone biru Sehari, ditempel di halaman bertitik dengan selotip dan coretan tangan. Kamera terus bergerak, transisinya menyambung (tinta menyebar, kertas sobek, menembus telapak tangan), dan teks muncul per huruf dengan bobot huruf yang ikut bergerak. Bagian aplikasi memakai ilustrasi Sehari.

### Versi 3 (melankolis)

Adegan lebih sedikit dan masing-masing lebih lama (5–8 detik, berganti di ketukan pertama birama). Transisinya larut pelan seperti tinta atau cahaya meresap, dan narasi muncul kata demi kata.

| Detik (video) | Narasi | Gambar |
| --- | --- | --- |
| 0–6 | Dulu, *jauh sebelum ada huruf,* | malam, debu cahaya |
| 5,3–14 | kita menempelkan telapak tangan di dinding gua — *seolah berkata: aku pernah di sini.* | foto cap tangan gua Maros; ±67.800 tahun (Muna, Sulawesi) |
| 13–22 | Lalu kita belajar menulis. *Di tanah liat. Di batu. Di daun lontar.* | lempeng Uruk, Yupa Kutai, lontar Bali |
| 20,6–27 | Alatnya berganti, *rindunya tidak.* | pena tinta → mesin tik |
| 25,8–32 | Kita menulis surat, *lalu menunggu —* berhari-hari, berminggu-minggu. | kantor pos Batavia (1746) |
| 31–40 (reff) | Dari Jepara, seorang perempuan menulis surat demi surat. *Seratus tahun kemudian, suaranya masih sampai kepada kita.* | potret Kartini (1899–1904) |
| 38,7–48 | Surat-surat itu kita ikat, kita simpan, *dan kita baca lagi setiap kali rindu.* | surat lama, lak segel |
| 46,5–53,5 | Hari ini, kita menulis lebih banyak dari sebelumnya. *Tapi semuanya lewat — lalu hilang.* | chat yang menggulung lalu memudar |
| 52,8–54,5 (jeda hening) | Maka kami membuat sebuah… | diketik |
| 54,56 (hantaman reff) | *kapsul.* untuk hari-hari yang ingin kita simpan. | segel lak Sehari |
| 57–64 | Satu hal kecil, setiap hari. *Disegel malam ini. Dibuka bersama orang yang kamu sayang.* | HP, halaman hari ini |
| 62,5–71,2 | untuk kamu, di hari nanti. → sehari · *tulis hari ini, baca bersama, nanti.* · sehari.online | tulisan tangan di atas surat lama, lalu langit malam dan logo |

## Musik & sinkron beat

- Lagu: "Prayer for Her", dipakai dari detik **0:19** (awal bait) sampai **±1:30**. Taruh file lagunya sebagai `musik.m4a` di folder ini (tidak di-commit), atau pakai `--musik file`. Tanpa lagu, render memakai musik latar sementara dari `audio.cjs --latar`.
- Kenapa bagian itu: bait yang tegas di 0:19 membuka video. Reff di 0:50 jatuh di montase surat (video 31, saat lak dihantamkan). Jeda hampir hening di 1:11,8–1:13,4 menampung "jadi, kami membuat sebuah", lalu reff besar di 1:13,56 jadi momen lak **kapsul.** dihantamkan dan Sehari muncul.
- `timing.js` berisi beat lagu (`BEATS`), titik jangkar [waktu adegan, beat] (`ANCHORS`), dan `MUSIC_START` (detik lagu = video 0).

```bash
node docs/brand/video-sejarah/render.cjs
node docs/brand/video-sejarah/render.cjs /tmp/x.mp4 --stills 7.6,24.9
```
