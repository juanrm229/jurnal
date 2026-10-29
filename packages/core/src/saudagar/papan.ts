/**
 * Papan SAUDAGAR: 40 petak bertema kota-kota Indonesia, dengan harga & sewa
 * persis aturan Monopoli resmi, plus 16 kartu Kesempatan dan 16 kartu Dana Umum.
 * Satuan uang: juta rupiah (1500 = Rp1,5 M).
 */

export type Grup = 'coklat' | 'biru-muda' | 'pink' | 'oranye' | 'merah' | 'kuning' | 'hijau' | 'biru-tua';

export type Petak =
  | { i: number; jenis: 'start' | 'penjara' | 'parkir' | 'kepenjara'; nama: string }
  | { i: number; jenis: 'kota'; nama: string; grup: Grup; harga: number; sewa: number[]; bangun: number }
  | { i: number; jenis: 'transport'; nama: string; harga: number }
  | { i: number; jenis: 'utilitas'; nama: string; harga: number }
  | { i: number; jenis: 'kesempatan' | 'dana'; nama: string }
  | { i: number; jenis: 'pajak'; nama: string; jumlah: number };

export type Milikan = Extract<Petak, { harga: number }>;

export const WARNA_GRUP: Record<Grup, string> = { coklat: '#8a5a3b', 'biru-muda': '#7cc6ec', pink: '#d7489b', oranye: '#f08a24', merah: '#e23b3b', kuning: '#f4cc2a', hijau: '#2f9e57', 'biru-tua': '#2643a6' };
export const NAMA_GRUP: Record<Grup, string> = { coklat: 'Maluku', 'biru-muda': 'Nusa Tenggara & Papua', pink: 'Kalimantan', oranye: 'Sumatra Barat & Selatan', merah: 'Sulawesi & Medan', kuning: 'Jawa Tengah', hijau: 'Jawa Timur & Barat', 'biru-tua': 'Bali & Jakarta' };

const kota = (i: number, nama: string, grup: Grup, harga: number, sewa: number[], bangun: number): Petak => ({ i, jenis: 'kota', nama, grup, harga, sewa, bangun });

export const PETAK: Petak[] = [
  { i: 0, jenis: 'start', nama: 'Mulai' },
  kota(1, 'Ternate', 'coklat', 60, [2, 10, 30, 90, 160, 250], 50),
  { i: 2, jenis: 'dana', nama: 'Dana Umum' },
  kota(3, 'Ambon', 'coklat', 60, [4, 20, 60, 180, 320, 450], 50),
  { i: 4, jenis: 'pajak', nama: 'Pajak Penghasilan', jumlah: 200 },
  { i: 5, jenis: 'transport', nama: 'Stasiun Gambir', harga: 200 },
  kota(6, 'Jayapura', 'biru-muda', 100, [6, 30, 90, 270, 400, 550], 50),
  { i: 7, jenis: 'kesempatan', nama: 'Kesempatan' },
  kota(8, 'Kupang', 'biru-muda', 100, [6, 30, 90, 270, 400, 550], 50),
  kota(9, 'Mataram', 'biru-muda', 120, [8, 40, 100, 300, 450, 600], 50),
  { i: 10, jenis: 'penjara', nama: 'Penjara' },
  kota(11, 'Pontianak', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  { i: 12, jenis: 'utilitas', nama: 'PLN', harga: 150 },
  kota(13, 'Banjarmasin', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  kota(14, 'Balikpapan', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
  { i: 15, jenis: 'transport', nama: 'Pelabuhan Tanjung Perak', harga: 200 },
  kota(16, 'Pekanbaru', 'oranye', 180, [14, 70, 200, 550, 750, 950], 100),
  { i: 17, jenis: 'dana', nama: 'Dana Umum' },
  kota(18, 'Padang', 'oranye', 180, [14, 70, 200, 550, 750, 950], 100),
  kota(19, 'Palembang', 'oranye', 200, [16, 80, 220, 600, 800, 1000], 100),
  { i: 20, jenis: 'parkir', nama: 'Parkir Bebas' },
  kota(21, 'Manado', 'merah', 220, [18, 90, 250, 700, 875, 1050], 150),
  { i: 22, jenis: 'kesempatan', nama: 'Kesempatan' },
  kota(23, 'Makassar', 'merah', 220, [18, 90, 250, 700, 875, 1050], 150),
  kota(24, 'Medan', 'merah', 240, [20, 100, 300, 750, 925, 1100], 150),
  { i: 25, jenis: 'transport', nama: 'Bandara Ngurah Rai', harga: 200 },
  kota(26, 'Solo', 'kuning', 260, [22, 110, 330, 800, 975, 1150], 150),
  kota(27, 'Yogyakarta', 'kuning', 260, [22, 110, 330, 800, 975, 1150], 150),
  { i: 28, jenis: 'utilitas', nama: 'PDAM', harga: 150 },
  kota(29, 'Semarang', 'kuning', 280, [24, 120, 360, 850, 1025, 1200], 150),
  { i: 30, jenis: 'kepenjara', nama: 'Masuk Penjara' },
  kota(31, 'Malang', 'hijau', 300, [26, 130, 390, 900, 1100, 1275], 200),
  kota(32, 'Bandung', 'hijau', 300, [26, 130, 390, 900, 1100, 1275], 200),
  { i: 33, jenis: 'dana', nama: 'Dana Umum' },
  kota(34, 'Surabaya', 'hijau', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  { i: 35, jenis: 'transport', nama: 'Terminal Pulo Gebang', harga: 200 },
  { i: 36, jenis: 'kesempatan', nama: 'Kesempatan' },
  kota(37, 'Denpasar', 'biru-tua', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { i: 38, jenis: 'pajak', nama: 'Pajak Barang Mewah', jumlah: 100 },
  kota(39, 'Jakarta', 'biru-tua', 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

export const isMilikan = (p: Petak): p is Milikan => p.jenis === 'kota' || p.jenis === 'transport' || p.jenis === 'utilitas';
export const anggotaGrup = (g: Grup) => PETAK.filter((p): p is Extract<Petak, { jenis: 'kota' }> => p.jenis === 'kota' && p.grup === g).map((p) => p.i);
export const TRANSPORT = PETAK.filter((p) => p.jenis === 'transport').map((p) => p.i);
export const UTILITAS = PETAK.filter((p) => p.jenis === 'utilitas').map((p) => p.i);
export const GRUP: Grup[] = ['coklat', 'biru-muda', 'pink', 'oranye', 'merah', 'kuning', 'hijau', 'biru-tua'];

/** Uang dalam juta: 60 → "Rp60 jt", 1500 → "Rp1,5 M". */
export const rp = (n: number) => {
  const neg = n < 0 ? '-' : '';
  const a = Math.abs(n);
  return a >= 1000 ? `${neg}Rp${(a / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} M` : `${neg}Rp${a} jt`;
};

// ── Kartu ───────────────────────────────────────────────────────────────────

export type AksiKartu =
  | { t: 'maju'; ke: number }
  | { t: 'terdekat'; jenis: 'transport' | 'utilitas' }
  | { t: 'mundur'; n: number }
  | { t: 'penjara' }
  | { t: 'bebas' }
  | { t: 'terima'; n: number }
  | { t: 'bayar'; n: number }
  | { t: 'perbaikan'; rumah: number; hotel: number }
  | { t: 'bayarSemua'; n: number }
  | { t: 'terimaSemua'; n: number };

export interface Kartu {
  id: number;
  dek: 'k' | 'd';
  teks: string;
  aksi: AksiKartu;
}

const K = (teks: string, aksi: AksiKartu) => ({ teks, aksi });
const KESEMPATAN = [
  K('Terbang ke Jakarta. Ada urusan bisnis besar di ibu kota.', { t: 'maju', ke: 39 }),
  K('Kembali ke Mulai. Terima Rp200 jt.', { t: 'maju', ke: 0 }),
  K('Lanjutkan perjalanan ke Medan. Kalau melewati Mulai, terima Rp200 jt.', { t: 'maju', ke: 24 }),
  K('Ikut pameran dagang di Pontianak. Kalau melewati Mulai, terima Rp200 jt.', { t: 'maju', ke: 11 }),
  K('Naik transportasi terdekat. Kalau sudah dimiliki, bayar dua kali lipat sewanya. Kalau belum, boleh dibeli.', { t: 'terdekat', jenis: 'transport' }),
  K('Naik transportasi terdekat. Kalau sudah dimiliki, bayar dua kali lipat sewanya. Kalau belum, boleh dibeli.', { t: 'terdekat', jenis: 'transport' }),
  K('Pergi ke kantor PLN atau PDAM terdekat. Kalau sudah dimiliki, lempar dadu dan bayar 10 kali angkanya.', { t: 'terdekat', jenis: 'utilitas' }),
  K('Bank membagikan dividen. Terima Rp50 jt.', { t: 'terima', n: 50 }),
  K('Bebas dari penjara. Simpan kartu ini sampai dipakai atau dijual.', { t: 'bebas' }),
  K('Salah ambil jalan tol. Mundur 3 petak.', { t: 'mundur', n: 3 }),
  K('Masuk penjara. Langsung ke penjara, tidak melewati Mulai.', { t: 'penjara' }),
  K('Renovasi semua bangunanmu: bayar Rp25 jt per rumah dan Rp100 jt per hotel.', { t: 'perbaikan', rumah: 25, hotel: 100 }),
  K('Tilang ngebut di jalan tol. Bayar Rp15 jt.', { t: 'bayar', n: 15 }),
  K('Naik kereta dari Stasiun Gambir. Kalau melewati Mulai, terima Rp200 jt.', { t: 'maju', ke: 5 }),
  K('Kamu terpilih jadi ketua arisan. Bayar Rp50 jt ke setiap pemain.', { t: 'bayarSemua', n: 50 }),
  K('Pinjaman usahamu jatuh tempo dan untung. Terima Rp150 jt.', { t: 'terima', n: 150 }),
];
const DANA = [
  K('Kembali ke Mulai. Terima Rp200 jt.', { t: 'maju', ke: 0 }),
  K('Bank salah transfer ke rekeningmu. Terima Rp200 jt.', { t: 'terima', n: 200 }),
  K('Biaya dokter. Bayar Rp50 jt.', { t: 'bayar', n: 50 }),
  K('Hasil jual saham. Terima Rp50 jt.', { t: 'terima', n: 50 }),
  K('Bebas dari penjara. Simpan kartu ini sampai dipakai atau dijual.', { t: 'bebas' }),
  K('Masuk penjara. Langsung ke penjara, tidak melewati Mulai.', { t: 'penjara' }),
  K('Tabungan hari raya cair. Terima Rp100 jt.', { t: 'terima', n: 100 }),
  K('Pengembalian pajak. Terima Rp20 jt.', { t: 'terima', n: 20 }),
  K('Hari ini ulang tahunmu! Setiap pemain memberimu Rp10 jt.', { t: 'terimaSemua', n: 10 }),
  K('Asuransi jiwa cair. Terima Rp100 jt.', { t: 'terima', n: 100 }),
  K('Biaya rumah sakit. Bayar Rp100 jt.', { t: 'bayar', n: 100 }),
  K('Uang sekolah. Bayar Rp50 jt.', { t: 'bayar', n: 50 }),
  K('Honor konsultasi. Terima Rp25 jt.', { t: 'terima', n: 25 }),
  K('Perbaikan jalan di depan propertimu: bayar Rp40 jt per rumah dan Rp115 jt per hotel.', { t: 'perbaikan', rumah: 40, hotel: 115 }),
  K('Juara dua lomba masak RT. Terima Rp10 jt.', { t: 'terima', n: 10 }),
  K('Dapat warisan. Terima Rp100 jt.', { t: 'terima', n: 100 }),
];
export const KARTU: Kartu[] = [...KESEMPATAN.map((k, i) => ({ id: i, dek: 'k' as const, ...k })), ...DANA.map((k, i) => ({ id: 16 + i, dek: 'd' as const, ...k }))];
