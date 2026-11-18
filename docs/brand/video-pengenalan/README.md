# Video pengenalan Sehari

Hasil jadi: [`../sehari-video-pengenalan.mp4`](../sehari-video-pengenalan.mp4). Formatnya 1080×1920 (9:16, untuk Reels/TikTok/Story), 30 fps, durasi 31 detik. Musiknya lagu pilihan sendiri (±117,5 BPM), dan transisinya dipaskan ke beat lagu.

Gaya: UI motion dengan warna dasar biru tinta Sehari (`#2A14D6`), kertas `#E6E6E8`, huruf Fraunces, Caveat, dan IBM Plex Mono, serta doodle tangan dari `packages/doodles`.

| Detik (video) | Adegan |
| --- | --- |
| 0–3 | Setitik tinta jatuh lalu tumbuh jadi logo tunas, disusul wordmark "sehari" |
| 3–6 | "Bukan jarak yang kamu catat" dicoret, diganti "tapi hari yang kamu *jalani.* bersama." |
| 6–10 | HP muncul dengan halaman Hari ini: catatan diketik, foto polaroid jatuh, stiker, dan label fitur |
| 10–14 | Tombol lak ditekan tepat di hentakan lagu (9,9), lalu upacara segel; lak dihantamkan di beat 13,3 |
| 14–18 | Dua sisi satu hari: halaman teman yang terkunci terbuka bersama |
| 18–21,7 | Streak 127 hari dan papan tahun 365 petak (masuk di hentakan 18,1) |
| 21,7–25,4 | hari jadi halaman → minggu jadi adegan → bulan jadi bab → tahun jadi jilid, satu kata per beat |
| 25,45–31 | Penutup dibuka di jeda lagu; saat drop (28,45) muncul lingkaran dan "terenkripsi end-to-end", lalu **sehari.online** di beat 29,0; logo berdenyut setiap beat |

## Mengubah & merender ulang

- `index.html` berisi seluruh animasi. Setiap frame dihitung dari waktu, jadi hasilnya selalu sama. Buka file ini di peramban untuk pratinjau (klik untuk memutar bersama lagu), atau pakai `?t=12.5` untuk melihat frame di detik 12,5.
- `timing.js` memetakan waktu video (ikut lagu) ke waktu animasi. Isinya daftar beat lagu dan titik jangkar yang menaruh momen penting di beat. Kalau lagunya diganti, cukup ubah file ini.
- `audio.cjs` membuat efek suara (whoosh, pop, ketikan, hantaman lak) dari nol. Hasilnya dicampur pelan di bawah lagu oleh `render.cjs`.
- Lagunya dibaca dari `musik.m4a` di folder ini. File ini tidak di-commit (lihat `.gitignore`), jadi taruh sendiri sebelum merender, atau pakai `--musik file.m4a`.
- `doodles.js` adalah potongan doodle yang dipakai video ini.

```bash
node docs/brand/video-pengenalan/render.cjs                      # MP4 ke docs/brand/ (pakai musik.m4a)
node docs/brand/video-pengenalan/render.cjs /tmp/x.mp4 --stills 3,9.5,12.6   # hanya beberapa frame PNG
```

Perlu Playwright (Chromium), ffmpeg, dan koneksi internet untuk Google Fonts.
