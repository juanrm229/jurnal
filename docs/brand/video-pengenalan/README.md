# Video pengenalan Sehari

Hasil jadi: [`../sehari-video-pengenalan.mp4`](../sehari-video-pengenalan.mp4). Formatnya 1080×1920 (9:16, untuk Reels/TikTok/Story), 30 fps, durasi 25,5 detik, dengan audio.

Gaya: UI motion dengan warna dasar biru tinta Sehari (`#2A14D6`), kertas `#E6E6E8`, huruf Fraunces, Caveat, dan IBM Plex Mono, serta doodle tangan dari `packages/doodles`.

| Detik | Adegan |
| --- | --- |
| 0–3 | Setitik tinta jatuh lalu tumbuh jadi logo tunas, disusul wordmark "sehari" |
| 3–6 | "Bukan jarak yang kamu catat" dicoret, diganti "tapi hari yang kamu *jalani.* bersama." |
| 6–10 | HP muncul dengan halaman Hari ini: catatan diketik, foto polaroid jatuh, stiker, dan label fitur (tulisan, foto, voice note, lagu, warna mood) |
| 10–13,5 | Kamera masuk lewat tombol lak, lalu upacara segel: kalimat terakhir, tahan, dan lak dihantamkan |
| 13,5–16,5 | Dua sisi satu hari: halaman teman yang terkunci terbuka bersama |
| 16,5–19,5 | Streak 127 hari, angka drop/foto/surat, dan papan tahun 365 petak |
| 19,5–21,7 | hari jadi halaman → minggu jadi adegan → bulan jadi bab → tahun jadi jilid |
| 21,7–25,5 | Penutup: logo, "sehari", tagline, terenkripsi end-to-end |

## Mengubah & merender ulang

- `index.html` berisi seluruh animasi. Setiap frame dihitung dari waktu `t`, jadi hasilnya selalu sama. Buka file ini di peramban untuk pratinjau berulang (klik untuk mengulang), atau pakai `?t=12.5` untuk melihat satu frame.
- `audio.cjs` membuat musik latar dan efek suara dari nol (tanpa sampel, jadi bebas hak cipta). Waktu cue-nya mengikuti timeline di `index.html`.
- `doodles.js` adalah potongan doodle yang dipakai video ini.

```bash
node docs/brand/video-pengenalan/render.cjs                      # MP4 ke docs/brand/
node docs/brand/video-pengenalan/render.cjs /tmp/x.mp4 --stills 3,9.5,12.6   # hanya beberapa frame PNG
```

Perlu Playwright (Chromium), ffmpeg, dan koneksi internet untuk Google Fonts.
