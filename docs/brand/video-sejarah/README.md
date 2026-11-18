# Video "Dulu Kita Menulis"

Hasil jadi: [`../sehari-dulu-kita-menulis.mp4`](../sehari-dulu-kita-menulis.mp4). Formatnya 1080×1920 (9:16), 30 fps, durasi 67 detik.

Strukturnya meniru video esai sejarah (babak I → babak II → kutipan → produk → logo), tapi semua gambar adalah doodle dan ilustrasi garis bergaya Sehari, tanpa footage pihak lain.

| Detik | Adegan | Isi & sumber |
| --- | --- | --- |
| 0–4,6 | ‹ jauh sebelum ada huruf › | goresan tinta berkumpul |
| 4,4–8,6 | kolase gua + **67.800** | cap tangan di Liang Metanduno, Muna, setidaknya 67.800 tahun (Nature, Jan 2026) |
| 8,6–10,8 | ✳ kita meninggalkan tanda. | cap tangan bercahaya |
| 10,8–15,4 | 6 plate sejarah | ± 3.300 SM lempeng Uruk · ± 400 M Yupa Kutai · lontar (pengutik) · 1746 kantor pos Batavia · 1899–1904 surat Kartini · 1940 kapsul waktu, dibuka 8113 |
| 15,4–21,6 | cetak biru alat tulis | kalam → pengutik → pena bulu → pena → mesin tik, "Alatnya berganti. *rindunya sama.*" |
| 21,6–24,4 | ‹ BABAK II — SURAT › | jaringan rute pos |
| 24,4–32,6 | disegel · diantar · Kartini · buku harian · telegram · ditunggu | |
| 32,6–38,4 | barisan alat tulis | "Kita tidak pernah berhenti menulis —" |
| 38,4–42 | chat menggulung | "— hanya berhenti *menyimpannya.*" + surat pos AS 103,6 miliar (2001) → 44,3 miliar (2024) |
| 42–48,2 | kutipan | Pramoedya Ananta Toer: "Orang boleh pandai setinggi langit…" |
| 48,2–51,2 | dinding kata | *tulis, simpan, kirim.* |
| 51,2–53,8 | jadi, kami membuat sebuah *kapsul.* | |
| 53,8–60 | Sehari adalah kapsul waktu harian | tulis · foto & suara · segel · buka bersama · surat tersesat (1–12 bulan) · kapsul terkunci (1–25 tahun) |
| 60–63,2 | ✳ selamat malam, *penulis.* | |
| 63,2–67 | langit malam, logo, sehari.online | |

## Musik & sinkron beat

- Taruh lagu di `musik.m4a` di folder ini (tidak di-commit), atau pakai `--musik file`. Tanpa lagu, render memakai musik latar sementara dari `audio.cjs --latar`.
- `timing.js` memetakan waktu video (ikut lagu) ke waktu animasi. Isi `BEATS` dengan beat lagu dan `ANCHORS` dengan pasangan [waktu adegan, beat], lalu render ulang.

```bash
node docs/brand/video-sejarah/render.cjs
node docs/brand/video-sejarah/render.cjs /tmp/x.mp4 --stills 7.6,24.9
```
