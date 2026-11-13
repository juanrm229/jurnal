# Peta Sangkala: render sendiri atau pasang ilustrasimu

Peta Kota Sangkala punya dua lapis yang harus selalu cocok:

1. **Tata letak** (`packages/core/src/kotaData.ts`): wilayah dan 944 persil musim 1, dengan koordinat dalam ruang peta 2000×1125. Aplikasi meletakkan titik persil, patok, dan silsilah dari koordinat ini.
2. **Gambar** (`apps/web/public/kota/sangkala-{kecil,2k,4k}.webp`): lukisan petanya, 4000×2250 pada ukuran penuh.

Keduanya dihasilkan dari generator yang sama dengan benih tetap, jadi id persil tidak pernah berubah selama urutan acaknya tidak diubah.

## Render ulang lukisan bawaan

```bash
node scripts/peta/sangkala.mjs
```

```bash
node scripts/peta/render.mjs
```

```bash
python3 scripts/peta/pasang.py
```

`sangkala.mjs` menulis `out/` dan `kotaData.ts`. Periksa `git diff packages/core/src/kotaData.ts` kosong: kalau tidak, id persil berubah dan rumah warga akan pindah alamat. `render.mjs` melukis lewat Chromium (`lukis.js`: relief, bangunan bersudut miring dengan dinding dan jendela, bayangan, pohon, tekstur kertas cat air). `pasang.py` menulis ketiga WebP dan `out/cek-pasang.png`.

## Pasang ilustrasi buatanmu sendiri

```bash
node scripts/peta/panduan.mjs
```

Hasilnya:

- `scripts/peta/out/panduan-sangkala.png`: dasar peta pudar, tapak setiap rumah, titik dan nomor persil, batas wilayah.
- `scripts/peta/out/panduan-lapisan.png`: tapak, titik, dan batas saja, berlatar transparan. Taruh sebagai lapisan teratas di aplikasi gambar, lukis di bawahnya, sembunyikan saat mengekspor.

Aturan melukis:

- Kanvas 4000×2250 (atau rasio 16:9 yang sama).
- Setiap rumah persil berdiri di atas tapaknya; titik merah ada di dekat dinding depan. Gaya bebas (cat air, isometrik, tinta), asal rumahnya di tempat yang sama.
- Jalan, sungai, jembatan, dan batas wilayah boleh digambar ulang, jangan digeser.
- Jangan menulis nama wilayah di gambar bila tidak perlu: aplikasi sudah menampilkan label.

Lalu pasang:

```bash
python3 scripts/peta/pasang.py ilustrasiku.png
```

Buka `scripts/peta/out/cek-pasang.png`: setiap lingkaran merah harus jatuh di rumah. Kalau sudah cocok, commit ketiga berkas WebP di `apps/web/public/kota/`.
