/**
 * Satu doodle tangan: kumpulan garis tinta biru di kanvas 64x64.
 * Dirender dengan stroke (bukan fill), stroke-linecap & linejoin "round".
 */
export type DoodleCategory =
  | 'tanaman' // tumbuhan & rumput — isi utama taman tahunan
  | 'bunga'
  | 'buah' // buah & sayur
  | 'makhluk' // lebah, siput, burung, kupu-kupu, kucing kecil
  | 'benda' // barang sehari-hari
  | 'cuaca'
  | 'token' // Token Kenangan di Lemari Benda
  | 'musim' // ketupat, lentera, bendera, kembang api
  | 'ui' // ikon antarmuka bergaya tangan
  | 'makanan' // makanan & minuman sehari-hari
  | 'perjalanan' // kendaraan & perlengkapan jalan-jalan
  | 'perasaan' // hati, wajah sederhana, pelukan
  | 'stiker'; // hiasan scrapbook: panah, selotip, kilau, bingkai

export interface Doodle {
  /** id stabil kebab-case, mis. 'bunga-matahari'. Jangan diubah setelah rilis. */
  id: string;
  /** Nama Indonesia untuk aksesibilitas. */
  name: string;
  category: DoodleCategory;
  /** Selalu '0 0 64 64'. */
  viewBox: '0 0 64 64';
  /** Atribut `d` SVG untuk tiap garis. Dirender stroke-only. */
  strokes: string[];
  /** Bentuk kecil yang diisi penuh (titik mata, biji, dll). Opsional. */
  fills?: string[];
}
