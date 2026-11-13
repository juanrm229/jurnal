/**
 * Kota Sehari: satu kota fiksi publik di atas peta ilustrasi buatan sendiri.
 * Wilayah berupa poligon di ruang peta 2000×1125; persil adalah rumah yang
 * tergambar di peta (data dari scripts/peta/sangkala.mjs), jadi tiap persil
 * punya id, letak, dan alamat tetap.
 */
import { SANGKALA_PERSIL, SANGKALA_WILAYAH } from './kotaData';

export const KOTA_W = 2000;
export const KOTA_H = 1125;
export const KOTA_TAHUN = { min: 1900, max: 2030 } as const;
export const KOTA_MUSIM = 1;
/** Rumah tanpa adegan terbit setelah sekian hari kembali lowong. */
export const KOTA_TERBENGKALAI_HARI = 14;
/** Laporan dari orang berbeda yang menyembunyikan rumah sampai ditinjau. */
export const KOTA_LAPOR_SEMBUNYI = 3;

export type KotaPoint = [number, number];

export interface KotaRegion {
  id: string;
  name: string;
  watak: string;
  /** Tahun wilayah ini mulai dihuni; sebelum itu tampil sebagai lahan kosong di penggeser zaman. */
  since: number;
  /** Musim dibukanya untuk dipatok; null = belum (alam atau tempat bersama). */
  musim: number | null;
  poly: KotaPoint[];
  /** Posisi label di peta. */
  label: KotaPoint;
}

/** Nama kota. Sangkala: kalimat yang menyandikan tahun, untuk kota yang hidup lewat lapisan zaman. */
export const KOTA_NAMA = 'Sangkala';
export const KOTA_ID = 'sangkala';
/** Wilayah Kota Sangkala, dihasilkan oleh scripts/peta/sangkala.mjs bersama gambarnya. */
export const KOTA_WILAYAH: KotaRegion[] = SANGKALA_WILAYAH;

export const kotaRegion = (id: string) => KOTA_WILAYAH.find((r) => r.id === id);

export function kotaInside(p: KotaPoint, poly: KotaPoint[]): boolean {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

export function kotaBBox(poly: KotaPoint[]) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export interface KotaPlot {
  id: string;
  region: string;
  x: number;
  y: number;
  address: string;
}

const PLOTS = new Map<string, KotaPlot[]>();
const BY_ID = new Map<string, KotaPlot>();
for (const [id, region, x, y, address] of SANGKALA_PERSIL) {
  const p = { id, region, x, y, address };
  if (!PLOTS.has(region)) PLOTS.set(region, []);
  PLOTS.get(region)!.push(p);
  BY_ID.set(id, p);
}

/** Persil dalam satu wilayah: setiap persil adalah rumah yang tergambar di peta. */
export const kotaPlots = (regionId: string): KotaPlot[] => PLOTS.get(regionId) ?? [];
export const kotaPlot = (id: string): KotaPlot | undefined => BY_ID.get(id);

export const kotaOpen = (r: KotaRegion) => r.musim !== null && r.musim <= KOTA_MUSIM;

/** Dua rentang tahun (inklusif) bertumpuk? */
export const kotaOverlap = (a: { from: number; to: number }, b: { from: number; to: number }) => a.from <= b.to && b.from <= a.to;

/** Rentang yang masih lowong di sebuah persil, dari rentang yang sudah terisi. */
export function kotaFree(taken: { from: number; to: number }[], min: number = KOTA_TAHUN.min, max: number = KOTA_TAHUN.max): { from: number; to: number }[] {
  const s = [...taken].sort((a, b) => a.from - b.from);
  const out: { from: number; to: number }[] = [];
  let cur = min;
  for (const t of s) {
    if (t.from > cur) out.push({ from: cur, to: Math.min(max, t.from - 1) });
    cur = Math.max(cur, t.to + 1);
  }
  if (cur <= max) out.push({ from: cur, to: max });
  return out.filter((x) => x.from <= x.to);
}

/** Nama pena kota: 3–24 huruf, angka, titik, garis bawah, atau tanda hubung. */
export const KOTA_PENA_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;

// ── Ketuk: hubungan antar-rumah ─────────────────────────────────────────────

/** "X adalah [jenis] dari Y". `balik` adalah jenis yang sama dilihat dari Y. */
export const KOTA_HUBUNGAN = {
  anak: { label: 'anak', balik: 'orangtua' },
  orangtua: { label: 'orang tua', balik: 'anak' },
  saudara: { label: 'saudara', balik: 'saudara' },
  pasangan: { label: 'pasangan', balik: 'pasangan' },
  keturunan: { label: 'keturunan', balik: 'leluhur' },
  leluhur: { label: 'leluhur', balik: 'keturunan' },
  tetangga: { label: 'tetangga', balik: 'tetangga' },
  teman: { label: 'teman lama', balik: 'teman' },
  musuh: { label: 'musuh', balik: 'musuh' },
  cinta: { label: 'cinta lama', balik: 'cinta' },
} as const;
export type KotaHubungan = keyof typeof KOTA_HUBUNGAN;
export const KOTA_HUBUNGAN_IDS = Object.keys(KOTA_HUBUNGAN) as KotaHubungan[];

/** Riwayat hidup singkat seorang tokoh untuk diperiksa: tahun lahir/wafat dan rentang rumahnya. */
export interface KotaJiwa {
  name: string;
  born?: number;
  died?: number;
  from: number;
  to: number;
}

export interface KotaCek {
  ok: boolean;
  /** Belum bisa diperiksa (tahun lahir kosong); tidak menghalangi. */
  warn?: boolean;
  text: string;
}

/** Periksa apakah hubungan masuk akal menurut waktu. Kegagalan (ok=false) menghalangi ketukan. */
export function kotaCekHubungan(type: KotaHubungan, a: KotaJiwa, b: KotaJiwa): KotaCek[] {
  const out: KotaCek[] = [];
  const alive = (x: KotaJiwa) => ({ s: x.born ?? x.from, e: x.died ?? Math.max(x.to, (x.born ?? x.from) + 60) });
  if (a.born === undefined || b.born === undefined) out.push({ ok: true, warn: true, text: `Tahun lahir ${a.born === undefined ? a.name : b.name} belum diisi, jadi usia belum bisa diperiksa.` });
  const older = (p: KotaJiwa, c: KotaJiwa, gap: number, what: string) => {
    if (p.born === undefined || c.born === undefined) return;
    const d = c.born - p.born;
    out.push(d >= gap ? { ok: true, text: `${p.name} ${d} tahun lebih tua dari ${c.name}.` } : { ok: false, text: d < 0 ? `${what} perlu setidaknya ${gap} tahun lebih tua, padahal ${p.name} justru ${-d} tahun lebih muda dari ${c.name}.` : `${what} perlu setidaknya ${gap} tahun lebih tua; selisihnya baru ${d} tahun.` });
    if (gap < 30 && p.died !== undefined && p.died < c.born - 1) out.push({ ok: false, text: `${p.name} wafat ${p.died}, sebelum ${c.name} lahir (${c.born}).` });
  };
  if (type === 'anak') older(b, a, 15, `${b.name} sebagai orang tua`);
  else if (type === 'orangtua') older(a, b, 15, `${a.name} sebagai orang tua`);
  else if (type === 'keturunan') older(b, a, 30, `${b.name} sebagai leluhur`);
  else if (type === 'leluhur') older(a, b, 30, `${a.name} sebagai leluhur`);
  else if (type === 'saudara') {
    if (a.born !== undefined && b.born !== undefined) {
      const d = Math.abs(a.born - b.born);
      out.push(d <= 25 ? { ok: true, text: `Selisih usia ${d} tahun.` } : { ok: false, text: `Selisih usia ${d} tahun terlalu jauh untuk saudara kandung.` });
    }
  } else {
    const x = alive(a);
    const y = alive(b);
    const meet = Math.max(x.s, y.s) <= Math.min(x.e, y.e);
    out.push(meet ? { ok: true, text: `Hidup mereka bersinggungan sekitar ${Math.max(x.s, y.s)}–${Math.min(x.e, y.e)}.` } : { ok: false, text: `${a.name} dan ${b.name} tidak pernah hidup di masa yang sama.` });
    if (type === 'tetangga') out.push(kotaOverlap(a, b) ? { ok: true, text: 'Rumah mereka berdiri di zaman yang sama.' } : { ok: false, text: 'Rumah mereka tidak berdiri di zaman yang sama.' });
  }
  return out;
}

/**
 * Aturan musim: tokoh adalah milik warga, patok adalah tempat tokoh-tokohnya tinggal.
 * Paling banyak 3 tokoh (tokoh utama dan figuran yang dipegang) dalam paling banyak 3 patok.
 * Satu tokoh boleh pindah ke patok lain (orang yang sama, zaman yang lain), dan satu patok
 * boleh dihuni beberapa tokoh bila mereka keluarga atau pernah tinggal di rumah itu.
 */
export const KOTA_TOKOH_MAKS = 3;
export const KOTA_PATOK_MAKS = 3;
/** Ikatan yang membolehkan tokoh baru di patok tambahan: keluarga. */
export const KOTA_IKATAN = ['anak', 'orangtua', 'saudara', 'pasangan', 'keturunan', 'leluhur'] as const;
export type KotaIkatan = (typeof KOTA_IKATAN)[number];
/** Apakah tokoh (lahir–wafat) masih hidup di sebagian rentang rumah. */
export const kotaHidupDi = (t: { born?: number; died?: number }, r: { from: number; to: number }) => (t.born === undefined || t.born <= r.to) && (t.died === undefined || t.died >= r.from);

// ── Almanak: peristiwa kota ─────────────────────────────────────────────────

export interface KotaPeristiwa {
  id: string;
  title: string;
  year: number;
  month?: number;
  /** Tahun berakhir untuk peristiwa yang berlangsung lama. */
  toYear?: number;
  /** Wilayah yang mengalaminya; kosong = seluruh kota. */
  regions: string[];
  body: string;
}

/** Almanak awal: jangkar sejarah Sangkala, kanon sejak kota dibuka. */
export const KOTA_ALMANAK_AWAL: KotaPeristiwa[] = [
  { id: 'awal.benteng', title: 'Benteng Lima Sudut berdiri di ujung tanjung', year: 1702, regions: ['bentenglimasudut'], body: 'Batu karang dipotong dan diangkut dengan perahu selama tujuh musim. Sejak itu tanjung ini punya nama, dan kota punya alasan untuk tumbuh di belakangnya.' },
  { id: 'awal.lonceng', title: 'Lonceng ketujuh dipasang di Gang Tujuh Lonceng', year: 1858, month: 4, regions: ['tujuhlonceng'], body: 'Enam lonceng pertama dipesan dari seberang; yang ketujuh dicor di gang ini sendiri, dari perabot tembaga yang disumbangkan warga. Bunyinya sedikit sumbang, dan karena itu paling dicintai.' },
  { id: 'awal.suar', title: 'Mercusuar Nusa Pelita menyala pertama kali', year: 1891, month: 9, regions: ['nusapelita'], body: 'Penjaga suar pertama mencatat di bukunya: malam ini tidak ada kapal yang tersesat. Catatan itu masih dibacakan tiap tahun.' },
  { id: 'awal.kereta', title: 'Kereta pertama tiba di Kampung Peluit', year: 1909, month: 8, regions: ['kampungpeluit', 'sawah'], body: 'Seluruh kampung keluar rumah mendengar peluitnya. Sejak hari itu, tak ada lagi yang memakai jam dinding di sepanjang rel.' },
  { id: 'awal.pasar', title: 'Pasar Senja dibuka', year: 1912, regions: ['pasarsenja'], body: 'Pedagang dari sawah dan pelabuhan sepakat berdagang setelah matahari turun, supaya siangnya tetap bisa bekerja. Harga mulai ditawar dengan lagu.' },
  { id: 'awal.telaga', title: 'Telaga Mangu digali', year: 1925, regions: ['telagamangu', 'padanggubernur'], body: 'Rawa kecil di belakang balai kota dikeruk jadi telaga. Paviliunnya dibangun belakangan, dari kayu kapal yang karam.' },
  { id: 'awal.sumbu', title: 'Kampung sumbu berdiri di tepi Kali Sirah', year: 1931, regions: ['lorongsumbu'], body: 'Keluarga-keluarga pembuat sumbu lampu menetap di tepian. Tiap rumah menggantung contoh sumbunya di jendela, dan gangnya mulai bercahaya tiap malam.' },
  { id: 'awal.kebakaran', title: 'Pasar Senja terbakar semalaman', year: 1965, month: 7, regions: ['pasarsenja', 'tujuhlonceng'], body: 'Api bermula dari lapak minyak dan menjalar ke atap-atap tenda. Lonceng ketujuh dibunyikan sampai pagi. Pasar dibangun ulang dalam empat puluh hari.' },
  { id: 'awal.dermaga', title: 'Dermaga Besi dibuka', year: 1974, regions: ['dermagabesi', 'tanjungjala', 'tiangseribu'], body: 'Derek pertama didirikan di muara. Para nelayan Tanjung Jala menyaksikan kapal-kapal besar masuk, dan bertanya-tanya ke mana ikan-ikan akan pergi.' },
  { id: 'awal.banjir', title: 'Banjir besar Kali Sirah', year: 1979, month: 2, regions: ['lorongsumbu', 'tiangseribu', 'tujuhlonceng'], body: 'Air naik selama tiga hari. Lorong Sumbu terendam sampai dada; rumah-rumah panggung Tiang Seribu menjadi tempat mengungsi. Di Gang Tujuh Lonceng, lonceng dibunyikan untuk menghitung yang masih hilang.' },
  { id: 'awal.karam', title: 'Kapal Sri Gading karam di Beting Karang', year: 1756, regions: ['bentenglimasudut', 'pasirpengantin'], body: 'Kapal dagang itu pecah di beting saat badai musim barat. Kayunya dipungut warga selama setahun; sebagian masih menjadi tiang rumah tertua di kota.' },
  { id: 'awal.undak', title: 'Seribu undak di bukit selesai dipahat', year: 1791, regions: ['bukitseribuundak'], body: 'Tiga generasi petani memahat lereng menjadi undakan. Undak terakhir sengaja dibiarkan tak rata, supaya bukit itu tidak pernah merasa selesai.' },
  { id: 'awal.pamali', title: 'Hutan Pamali ditutup untuk penebang', year: 1823, regions: ['hutanpamali'], body: 'Setelah tiga penebang hilang dalam satu musim, para tetua memasang tali ijuk di batas hutan. Sejak itu orang masuk hanya untuk mencari obat, dan selalu berdua.' },
  { id: 'awal.sawah', title: 'Bendungan kecil Sawah Seribu Petak', year: 1841, regions: ['sawah'], body: 'Petani membendung anak Kali Sirah dengan batu kali dan ijuk. Panen pertama sesudahnya dibagi rata ke seribu petak, dan dari situlah nama itu datang.' },
  { id: 'awal.wabah', title: 'Musim demam di kota tua', year: 1867, toYear: 1868, regions: ['tujuhlonceng'], body: 'Demam menyebar dari pelabuhan lama. Lonceng-lonceng berhenti dibunyikan untuk kematian, karena terlalu sering; yang tersisa hanya lonceng ketujuh, sekali tiap senja.' },
  { id: 'awal.jala', title: 'Kampung nelayan Tanjung Jala berdiri', year: 1881, regions: ['tanjungjala'], body: 'Enam keluarga nelayan dari pulau seberang mendarat dan membentang jala pertama di pasir. Mereka menamai tanjung itu dari benda yang paling sering mereka perbaiki.' },
  { id: 'awal.balaikota', title: 'Balai kota dan Padang Gubernur dibangun', year: 1889, regions: ['padanggubernur'], body: 'Gedung putih berpilar didirikan di tengah padang rumput. Jam di menaranya dipasang terlambat tujuh menit, dan tak seorang pun mau membetulkannya.' },
  { id: 'awal.panggung', title: 'Rumah panggung pertama di laguna', year: 1902, regions: ['tiangseribu'], body: 'Sebuah keluarga yang rumahnya tergerus pasang membangun ulang di atas tiang ulin di tengah laguna. Dalam sepuluh tahun, tiangnya menjadi seribu.' },
  { id: 'awal.sekolah', title: 'Sekolah rakyat pertama dibuka', year: 1916, regions: ['tujuhlonceng', 'pasarsenja'], body: 'Ruang kelasnya bekas gudang garam. Muridnya membawa bangku sendiri dari rumah; yang tidak punya bangku duduk di atas peti ikan yang dicuci bersih.' },
  { id: 'awal.gempa', title: 'Gempa kecil meretakkan menara lonceng', year: 1928, month: 11, regions: ['tujuhlonceng', 'padanggubernur'], body: 'Menara lonceng keempat retak dari atas ke bawah. Warga menambalnya dengan kapur dan putih telur, dan retakan itu kini disebut garis nasib.' },
  { id: 'awal.bioskop', title: 'Layar tancap pertama di Padang Gubernur', year: 1936, regions: ['padanggubernur'], body: 'Kain putih dibentangkan di antara dua pohon beringin. Penonton dari seluruh kota duduk di rumput, dan anak-anak Lorong Sumbu membawa sumbu menyala untuk pulang.' },
  { id: 'awal.mengungsi', title: 'Tahun-tahun mengungsi ke Rawa Kelana', year: 1942, toYear: 1945, regions: [], body: 'Banyak keluarga meninggalkan rumah dan bersembunyi di antara akar bakau. Mereka belajar membaca pasang dari suara kepiting, dan sebagian tak pernah kembali ke kota.' },
  { id: 'awal.bendera', title: 'Malam bendera di menara lonceng', year: 1945, month: 9, regions: ['tujuhlonceng'], body: 'Tujuh pemuda memanjat menara dan mengikat kain merah putih di lonceng ketujuh. Ma Lian, yang masih remaja, menarik talinya sampai pagi.' },
  { id: 'awal.jembatan', title: 'Jembatan kayu Kali Sirah', year: 1953, regions: ['lorongsumbu', 'padanggubernur'], body: 'Jembatan pertama yang menyeberangi Kali Sirah dibangun gotong royong. Perahu tambang Wak Lebai tetap jalan, karena orang tua tidak percaya jembatan.' },
  { id: 'awal.radio', title: 'Radio kota mulai mengudara', year: 1957, regions: [], body: 'Siaran pertama berupa lagu keroncong dan pengumuman kapal datang. Pemilik radio menaruh pesawatnya di jendela supaya tetangga ikut mendengar.' },
  { id: 'awal.lereng', title: 'Kampung baru di Lereng Kabut', year: 1966, regions: ['lerengkabut'], body: 'Keluarga-keluarga dari kampung yang tergusur membuka lahan di lereng. Rumah-rumahnya dibangun menghadap ke bawah, supaya selalu bisa melihat kota.' },
  { id: 'awal.layang', title: 'Festival layang-layang Pasir Pengantin', year: 1971, month: 8, regions: ['pasirpengantin', 'tanjungjala'], body: 'Angin musim timur membuat langit penuh layang-layang. Pemenangnya seorang anak nelayan yang layang-layangnya dari kertas peta laut bekas.' },
  { id: 'awal.listrik', title: 'Listrik masuk ke Tiang Seribu', year: 1977, regions: ['tiangseribu'], body: 'Kabel ditarik di atas laguna dengan perahu. Malam pertama, separuh kampung tidak bisa tidur karena belum terbiasa dengan terang.' },
  { id: 'awal.gerhana', title: 'Gerhana matahari total', year: 1983, month: 6, regions: [], body: 'Kota disuruh tinggal di dalam rumah. Yang membangkang naik ke atap dan melihat langit siang menghitam; ayam-ayam berkokok dua kali hari itu.' },
  { id: 'awal.pasarbaru', title: 'Pasar Senja dibangun beratap seng', year: 1986, regions: ['pasarsenja'], body: 'Tenda-tenda lama diganti atap seng. Pedagang mengeluh hujan terdengar terlalu keras, lalu belajar menawar lebih lantang.' },
  { id: 'awal.kapal', title: 'Kapal penumpang terakhir ke Nusa Pelita', year: 1992, regions: ['nusapelita', 'dermagabesi'], body: 'Kapal kayu yang melayani pulau selama tujuh puluh tahun berhenti berlayar. Penumpang terakhirnya seorang guru yang membawa sekeranjang buku.' },
  { id: 'awal.krisis', title: 'Tahun harga beras melonjak', year: 1997, toYear: 1998, regions: [], body: 'Antrean beras memanjang dari gudang beras kota sampai jembatan. Warga Lorong Sumbu menukar sumbu dengan beras, dan Koh Ahong menimbang tanpa memungut untung.' },
  { id: 'awal.tsunami', title: 'Gelombang pasang menghantam Tanjung Jala', year: 2004, month: 12, regions: ['tanjungjala', 'pasirpengantin', 'tiangseribu'], body: 'Laut surut jauh sebelum kembali dengan marah. Rumah-rumah panggung bertahan; kampung nelayan dibangun ulang lebih jauh dari pantai.' },
  { id: 'awal.mercusuar', title: 'Mercusuar Nusa Pelita diganti lampu otomatis', year: 2009, regions: ['nusapelita'], body: 'Penjaga suar terakhir turun membawa buku besar bersampul hijau. Malam itu lampunya tetap menyala, tapi warga pulau bilang cahayanya berbeda.' },
  { id: 'awal.lonceng2', title: 'Lonceng ketujuh retak', year: 2015, month: 3, regions: ['tujuhlonceng'], body: 'Seminggu setelah Ma Lian wafat, lonceng ketujuh retak saat dibunyikan. Warga memutuskan tidak menggantinya; bunyinya yang sumbang kini dianggap suaranya.' },
  { id: 'awal.sepi', title: 'Musim kota sepi', year: 2020, toYear: 2021, regions: [], body: 'Pasar tutup, sekolah kosong, lonceng berbunyi untuk jalan-jalan yang tak berpenghuni. Orang-orang saling menyapa dari jendela, dan kabar beredar lewat tukang sayur.' },
  { id: 'awal.mural', title: 'Mural sumbu di dinding Lorong Sumbu', year: 2023, regions: ['lorongsumbu'], body: 'Anak-anak muda melukis ratusan sumbu menyala di sepanjang dinding gang. Setiap sumbu diberi nama keluarga yang pernah tinggal di sana.' },
  { id: 'awal.gelap', title: 'Kota gelap tiga malam', year: 1998, month: 5, regions: [], body: 'Listrik padam di seluruh kota. Warga Lorong Sumbu kembali menyalakan sumbu-sumbu lama, dan untuk tiga malam kota kembali seperti dulu.' },
  { id: 'awal.kabut', title: 'Kabut tujuh hari di Lereng Kabut', year: 2003, month: 1, regions: ['lerengkabut', 'bukitseribuundak'], body: 'Kabut turun dan tidak naik lagi selama tujuh hari. Orang-orang saling memanggil nama supaya tidak tersesat di jalan sendiri.' },
];

/** Peristiwa yang sedang berlangsung pada tahun tertentu. */
export const kotaPeristiwaPada = <T extends KotaPeristiwa>(events: T[], year: number) => events.filter((e) => e.year <= year && year <= (e.toYear ?? e.year));

/**
 * "Dari kota" untuk Kacamata Tokoh: peristiwa yang terjadi sebelum atau pada
 * tahun adegan. Dialami bila wilayah rumahnya terdampak; peristiwa seluruh kota
 * dialami semua; peristiwa wilayah lain hanya didengar.
 */
export function kotaDariKota<T extends KotaPeristiwa>(events: T[], regionId: string, year: number) {
  const past = events.filter((e) => e.year <= year).sort((a, b) => b.year - a.year);
  return {
    mengalami: past.filter((e) => !e.regions.length || e.regions.includes(regionId)),
    mendengar: past.filter((e) => e.regions.length && !e.regions.includes(regionId)),
  };
}

/** Persetujuan warga lain yang dibutuhkan agar usulan peristiwa menjadi kanon. */
export const KOTA_SETUJU_KANON = 2;

// ── Buku Warga Kota: figuran kota bersama ───────────────────────────────────

/** Figuran kota: sosok publik yang boleh dijumpai siapa pun; fakta besarnya diubah lewat persetujuan warga. */
export interface KotaFigur {
  id: string;
  name: string;
  julukan?: string;
  /** Wilayah tempat ia biasa ditemui. */
  region: string;
  tempat: string;
  ciri: string;
  born?: number;
  died?: number;
  /** Hal yang tak boleh diubah satu rumah sendirian. */
  tetap: string[];
}

export const KOTA_WARGA_AWAL: KotaFigur[] = [
  { id: 'warga.tembang', name: 'Mbah Tembang', julukan: 'pengemis yang selalu bernyanyi', region: 'pasarsenja', tempat: 'tangga timur Pasar Senja', ciri: 'Kaki kirinya pincang. Menyanyikan lagu yang tak pernah didengar orang lain, dan berhenti setiap kali lonceng ketujuh berbunyi.', born: 1911, died: 1984, tetap: ['Tidak pernah mau menerima uang kertas, hanya koin.', 'Tak seorang pun tahu nama aslinya.'] },
  { id: 'warga.rasid', name: 'Pak Rasid', julukan: 'penjaga suar', region: 'nusapelita', tempat: 'mercusuar Nusa Pelita', ciri: 'Mencatat setiap kapal yang lewat di buku besar bersampul hijau. Turun ke kota sebulan sekali untuk membeli minyak dan tembakau.', born: 1902, died: 1970, tetap: ['Buku besarnya tidak pernah boleh dibaca orang lain.'] },
  { id: 'warga.lebai', name: 'Wak Lebai', julukan: 'tukang perahu tambang', region: 'lorongsumbu', tempat: 'tambatan perahu di ujung Gg. Sampan', ciri: 'Menyeberangkan orang di Kali Sirah dengan perahu kayu bercat biru. Hafal kedalaman kali di setiap musim.', born: 1920, died: 1996, tetap: ['Tarifnya selalu sebutir telur, atau doa bila penumpangnya tak punya.'] },
  { id: 'warga.hanafi', name: 'dr. Hanafi', julukan: 'dokter Lorong Sumbu', region: 'lorongsumbu', tempat: 'rumah praktik di Gg. Kemiri', ciri: 'Datang dengan sepeda dan tas kulit cokelat. Menulis resep dengan tinta hijau.', born: 1925, died: 2008, tetap: ['Tidak pernah menagih pasien yang datang malam hari.'] },
  { id: 'warga.malian', name: 'Ma Lian', julukan: 'penarik lonceng ketujuh', region: 'tujuhlonceng', tempat: 'menara lonceng ketujuh', ciri: 'Perempuan bertubuh kecil dengan lengan sekuat pelaut. Menghitung waktu dengan tali, bukan jam.', born: 1930, died: 2015, tetap: ['Hanya ia yang boleh membunyikan lonceng ketujuh selama ia hidup.'] },
  { id: 'warga.jamil', name: 'Bang Jamil', julukan: 'tukang pos bersepeda merah', region: 'lorongsumbu', tempat: 'di mana saja, terutama gang-gang sempit', ciri: 'Sepedanya merah, bel sepedanya dua kali pendek satu kali panjang. Selalu tahu kabar sebelum suratnya sampai.', born: 1948, tetap: ['Hafal semua alamat di kota tanpa melihat sampul surat.'] },
  { id: 'warga.soebandi', name: 'Pak Soebandi', julukan: 'masinis kereta pertama', region: 'kampungpeluit', tempat: 'lokomotif dan stasiun Kampung Peluit', ciri: 'Topi masinisnya selalu miring ke kiri. Menyimpan sapu tangan istrinya di saku dada.', born: 1885, died: 1962, tetap: ['Membunyikan peluit tiga kali setiap melewati makam istrinya.'] },
  { id: 'warga.nyaisumbu', name: 'Nyai Sumbu', julukan: 'penjual sumbu tertua', region: 'lorongsumbu', tempat: 'beranda rumah di mulut Lorong Tepian', ciri: 'Memintal sumbu dari kapas sambil bercerita. Semua anak di Lorong Sumbu pernah dimarahi dan diberi permen olehnya.', born: 1899, died: 1979, tetap: ['Sumbu buatannya tidak pernah padam lebih dulu dari pemiliknya.'] },
  { id: 'warga.ahong', name: 'Koh Ahong', julukan: 'kepala Pasar Senja', region: 'pasarsenja', tempat: 'lapak timbangan di tengah pasar', ciri: 'Memegang timbangan tembaga yang dipercaya semua pedagang. Bicara pelan, tak pernah menawar.', born: 1932, died: 2011, tetap: ['Timbangannya dianggap paling jujur di kota; tidak ada yang berani menggugatnya.'] },
  { id: 'warga.mbokinem', name: 'Mbok Inem', julukan: 'penjual jamu gendong', region: 'tujuhlonceng', tempat: 'berkeliling gang kota tua sejak subuh', ciri: 'Menggendong bakul berisi botol-botol jamu berwarna. Tahu siapa yang sedang hamil sebelum yang bersangkutan tahu.', born: 1918, died: 1993, tetap: ['Jamu beras kencurnya resep dari ibunya, tak pernah ia beri tahu siapa pun.'] },
  { id: 'warga.kapten', name: 'Kapten Halim', julukan: 'syahbandar pelabuhan lama', region: 'bentenglimasudut', tempat: 'kantor syahbandar di bawah benteng', ciri: 'Bekas pelaut bermata satu. Mencatat semua kapal dengan huruf sambung yang hanya bisa dibaca dirinya.', born: 1871, died: 1949, tetap: ['Mata kirinya hilang di laut, dan ia tak pernah bercerita bagaimana.'] },
  { id: 'warga.guruarum', name: 'Bu Guru Arum', julukan: 'guru sekolah rakyat', region: 'tujuhlonceng', tempat: 'sekolah rakyat bekas gudang garam', ciri: 'Mengajar membaca dengan potongan koran bekas. Selalu membawa payung hitam, hujan atau terang.', born: 1896, died: 1977, tetap: ['Ia guru pertama sekolah rakyat kota.'] },
  { id: 'warga.mangudin', name: 'Mang Udin', julukan: 'tukang cukur di bawah beringin', region: 'padanggubernur', tempat: 'kursi cukur di bawah beringin Padang Gubernur', ciri: 'Cerminnya retak di pojok kanan. Memotong rambut sambil membaca berita radio keras-keras.', born: 1929, died: 2001, tetap: ['Kursi cukurnya selalu di bawah beringin yang sama.'] },
  { id: 'warga.babahliong', name: 'Babah Liong', julukan: 'tukang obat klenteng', region: 'pasarsenja', tempat: 'toko obat di samping klenteng Pasar Senja', ciri: 'Laci-laci kayunya berisi ratusan akar kering. Menimbang obat dengan timbangan seukuran telapak tangan.', born: 1890, died: 1968, tetap: ['Tidak pernah menjual obat tanpa bertanya apa yang dimimpikan pembelinya.'] },
  { id: 'warga.mbahkarto', name: 'Mbah Karto', julukan: 'penjaga pintu air', region: 'sawah', tempat: 'pintu air bendungan Sawah Seribu Petak', ciri: 'Mengukur air dengan tongkat bertakik. Tidur di gubuk di atas bendungan saat musim hujan.', born: 1905, died: 1988, tetap: ['Hanya ia yang memegang kunci pintu air selama empat puluh tahun.'] },
  { id: 'warga.ratna', name: 'Ratna', julukan: 'penyiar radio kota', region: 'padanggubernur', tempat: 'studio radio di lantai dua balai kota', ciri: 'Suaranya dikenal seluruh kota, wajahnya hampir tidak. Membacakan kabar kapal dan salam-salam dari pendengar.', born: 1935, died: 2012, tetap: ['Setiap siaran ditutupnya dengan kalimat: "selamat malam, Sangkala yang terjaga".'] },
  { id: 'warga.pakdolah', name: 'Pak Dolah', julukan: 'penjaga palang kereta', region: 'kampungpeluit', tempat: 'pos palang di perlintasan Kampung Peluit', ciri: 'Mengibarkan bendera merah dengan tangan kiri karena tangan kanannya kaku. Hafal jadwal kereta tanpa melihat jam.', born: 1912, died: 1990, tetap: ['Tak pernah satu kali pun palangnya terlambat ditutup.'] },
  { id: 'warga.nenekselasih', name: 'Nenek Selasih', julukan: 'peramu obat Hutan Pamali', region: 'hutanpamali', tempat: 'pondok di batas tali ijuk Hutan Pamali', ciri: 'Satu-satunya yang masuk hutan sendirian. Membawa pulang daun yang namanya hanya ia yang tahu.', born: 1880, died: 1971, tetap: ['Ia selalu kembali dari hutan sebelum magrib.'] },
  { id: 'warga.wakomar', name: 'Wak Omar', julukan: 'pembuat perahu Tanjung Jala', region: 'tanjungjala', tempat: 'galangan pasir di ujung tanjung', ciri: 'Membuat perahu tanpa gambar, hanya dengan tali pengukur. Menamai setiap perahu dengan nama anak yang lahir di tahun itu.', born: 1921, died: 2004, tetap: ['Perahu terakhirnya selesai sehari sebelum gelombang pasang 2004.'] },
  { id: 'warga.cikmei', name: 'Cik Mei', julukan: 'penjahit kebaya', region: 'tujuhlonceng', tempat: 'kios jahit di bawah menara lonceng keempat', ciri: 'Mesin jahitnya berbunyi seperti hujan kecil. Menyimpan potongan kain setiap pengantin yang pernah ia jahitkan.', born: 1938, died: 2019, tetap: ['Kebaya pengantin kota selama setengah abad lewat tangannya.'] },
  { id: 'warga.joni', name: 'Joni Gitar', julukan: 'pengamen jembatan', region: 'lorongsumbu', tempat: 'jembatan kayu Kali Sirah', ciri: 'Gitarnya kurang satu senar. Menyanyikan lagu permintaan dengan imbalan rokok atau cerita.', born: 1961, tetap: ['Tak pernah menyanyikan lagu yang sama dua kali dalam sehari.'] },
  { id: 'warga.mamakroslina', name: 'Mamak Roslina', julukan: 'pemilik lapau kopi', region: 'dermagabesi', tempat: 'lapau kopi di gerbang Dermaga Besi', ciri: 'Kopinya kental dan pahit, gula disediakan terpisah. Hafal utang semua buruh pelabuhan tanpa mencatat.', born: 1950, tetap: ['Lapau kopinya buka sebelum kapal pertama datang.'] },
  { id: 'warga.mandormarto', name: 'Mandor Marto', julukan: 'mandor derek pelabuhan', region: 'dermagabesi', tempat: 'kabin derek nomor satu', ciri: 'Peluitnya terdengar sampai Tiang Seribu. Bicara keras di dermaga, berbisik di rumah.', born: 1944, died: 2010, tetap: ['Ia yang menyalakan derek pertama Dermaga Besi.'] },
  { id: 'warga.dayu', name: 'Dayu', julukan: 'anak penjaga undak', region: 'bukitseribuundak', tempat: 'undak teratas Bukit Seribu Undak', ciri: 'Menghitung undak setiap pagi dan selalu mendapat angka berbeda. Menunjukkan jalan kepada siapa pun yang tersesat di bukit.', born: 1987, tetap: ['Hanya ia yang tahu undak mana yang sengaja dibiarkan tak rata.'] },
  { id: 'warga.pakmantri', name: 'Pak Mantri Suryo', julukan: 'mantri cacar', region: 'kampungpeluit', tempat: 'berkeliling kampung dengan kotak kayu', ciri: 'Membawa kotak kayu berisi jarum dan kapas. Anak-anak bersembunyi di kolong rumah setiap kali mendengar sepatunya.', born: 1893, died: 1959, tetap: ['Ia menyelamatkan Kampung Peluit dari musim cacar.'] },
  { id: 'warga.asih', name: 'Asih', julukan: 'penjual bunga makam', region: 'rawakelana', tempat: 'jalan setapak menuju makam tua di tepi rawa', ciri: 'Merangkai kembang setaman sambil bersenandung. Tahu letak setiap makam tanpa nisan.', born: 1945, died: 2022, tetap: ['Ia tak pernah menerima uang dari keluarga yang sedang berduka hari itu.'] },
  { id: 'warga.mbahsalim', name: 'Mbah Salim', julukan: 'penabuh bedug', region: 'tujuhlonceng', tempat: 'langgar tua di belakang menara lonceng', ciri: 'Menabuh bedug dengan irama yang menyesuaikan bunyi lonceng ketujuh. Bersahabat dengan Ma Lian sejak kecil.', born: 1927, died: 2014, tetap: ['Bedug dan lonceng tidak pernah berbunyi bersamaan selama ia hidup.'] },
  { id: 'warga.sinyo', name: 'Sinyo Pieter', julukan: 'fotografer keliling', region: 'padanggubernur', tempat: 'studio foto kecil di sisi Padang Gubernur', ciri: 'Kameranya berkaki tiga dan berkerudung kain hitam. Menyimpan klise setiap orang yang pernah ia potret.', born: 1902, died: 1975, tetap: ['Arsip klisenya adalah satu-satunya foto banyak keluarga kota.'] },
  { id: 'warga.mbakyuni', name: 'Mbak Yuni', julukan: 'penjual gorengan stasiun', region: 'kampungpeluit', tempat: 'peron stasiun Kampung Peluit', ciri: 'Menggoreng di atas tungku kecil di ujung peron. Tahu kereta mana yang terlambat dari bau asapnya.', born: 1968, tetap: ['Pisang gorengnya dibungkus kertas jadwal kereta bekas.'] },
  { id: 'warga.oomrudi', name: 'Oom Rudi', julukan: 'tukang reparasi radio', region: 'pasarsenja', tempat: 'kios reparasi di lorong elektronik Pasar Senja', ciri: 'Kacamatanya tebal dan selalu di ujung hidung. Menghidupkan radio mati dengan solder dan cerita.', born: 1940, died: 2005, tetap: ['Radio pertama kota diperbaiki di kiosnya.'] },
  { id: 'warga.dalang', name: 'Ki Darsa', julukan: 'dalang wayang kulit', region: 'sawah', tempat: 'pendapa balai desa di pinggir sawah', ciri: 'Suaranya berganti seratus kali dalam semalam. Menyimpan satu wayang tanpa nama yang tak pernah dimainkan.', born: 1916, died: 1994, tetap: ['Wayang tanpa nama itu tidak pernah keluar dari kotaknya.'] },
  { id: 'warga.teteh', name: 'Teh Euis', julukan: 'pengelola penginapan Lereng Kabut', region: 'lerengkabut', tempat: 'losmen kayu di tikungan Lereng Kabut', ciri: 'Menyalakan lampu badai di depan losmen setiap kali kabut turun. Tamu yang tersesat selalu diberi teh jahe gratis.', born: 1958, tetap: ['Lampu badai di depan losmennya tak pernah padam saat kabut.'] },
  { id: 'warga.lukas', name: 'Lukas', julukan: 'penjaga suar terakhir', region: 'nusapelita', tempat: 'mercusuar Nusa Pelita, lalu rumah kecil di dermaga pulau', ciri: 'Cucu angkat Pak Rasid. Menyimpan buku besar bersampul hijau setelah lampu suar diganti otomatis.', born: 1952, tetap: ['Buku besar bersampul hijau kini ada padanya.'] },
  { id: 'warga.sarinah', name: 'Bu Sarinah', julukan: 'bidan Tiang Seribu', region: 'tiangseribu', tempat: 'rumah panggung paling ujung di Titian Pari', ciri: 'Mendayung sendiri ke rumah-rumah panggung, siang atau malam. Tangannya selalu berbau minyak kayu putih.', born: 1940, died: 2020, tetap: ['Menuliskan nama setiap bayi yang ditolongnya di dinding rumahnya.'] },
];

/** Perubahan besar figuran yang sudah disepakati, diterapkan berurutan di atas lembar awalnya. */
export interface KotaUbah {
  kind: 'fakta' | 'wafat' | 'pindah';
  text: string;
  year?: number;
  region?: string;
}
export function kotaFigurKini(f: KotaFigur, ubah: KotaUbah[]): KotaFigur {
  let x = { ...f, tetap: [...f.tetap] };
  for (const u of ubah) {
    if (u.kind === 'wafat' && u.year) x = { ...x, died: u.year };
    else if (u.kind === 'pindah' && u.region) x = { ...x, region: u.region, tempat: u.text || x.tempat };
    else if (u.kind === 'fakta') x = { ...x, tetap: [...x.tetap, u.text] };
  }
  return x;
}

// ── Penjaga konsistensi ─────────────────────────────────────────────────────

/** Satu nama di kota: tokoh rumah (warga/figuran rumah) atau figuran kota. */
export interface KotaNama {
  name: string;
  kind: 'warga' | 'figuran' | 'figur';
  claimId?: string;
  /** Semua rumah tempat orang ini tinggal (asli dan pindahan). */
  rumah?: string[];
  household?: string;
  tokohId?: string;
  figurId?: string;
  sapa?: 'tertutup' | 'disapa';
  born?: number;
  died?: number;
  julukan?: string;
}

export interface KotaCekNama {
  kind: 'rumah-lain' | 'figur-waktu' | 'figur-jumpa';
  term: string;
  at: number;
  end: number;
  ref: KotaNama;
}

/**
 * Periksa teks adegan sebuah rumah terhadap nama-nama kota:
 *  - tokoh rumah lain yang tidak tertaut dan tidak "boleh disapa" → ketuk dulu atau desas-desus,
 *  - figuran kota di luar masa hidupnya → peringatan waktu,
 *  - figuran kota yang disebut tapi belum dicatat sebagai perjumpaan → saran mencatat.
 */
export function kotaCekTeks(text: string, nama: KotaNama[], o: { claimId: string; linked: string[]; desas: string[]; jumpa: string[]; year: number | null }): KotaCekNama[] {
  const out: KotaCekNama[] = [];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const find = (term: string) => {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(term)})(?=(?:nya|ku|mu|lah|kah|pun)?(?:$|[^\\p{L}\\p{N}]))`, 'giu');
    return [...text.matchAll(re)].map((m) => ({ at: (m.index ?? 0) + m[1]!.length, end: (m.index ?? 0) + m[1]!.length + m[2]!.length }));
  };
  for (const n of nama) {
    if (n.name.trim().length < 3) continue;
    if (n.kind !== 'figur') {
      if (n.claimId === o.claimId || n.rumah?.includes(o.claimId) || n.sapa === 'disapa' || (n.tokohId && o.linked.includes(n.tokohId)) || o.desas.some((d) => d.toLowerCase() === n.name.toLowerCase())) continue;
      for (const r of find(n.name)) out.push({ kind: 'rumah-lain', term: n.name, ...r, ref: n });
      continue;
    }
    const hits = [...find(n.name), ...(n.julukan ? find(n.julukan) : [])];
    if (!hits.length) continue;
    const r = hits[0]!;
    if (o.year && ((n.born && o.year < n.born) || (n.died && o.year > n.died))) out.push({ kind: 'figur-waktu', term: n.name, ...r, ref: n });
    else if (!o.jumpa.includes(n.figurId!)) out.push({ kind: 'figur-jumpa', term: n.name, ...r, ref: n });
  }
  return out.sort((a, b) => a.at - b.at);
}

// ── Pos Sangkala: surat antar-rumah diantar Bang Jamil ──────────────────────

/** Kantor pos kota (dekat Pasar Senja), asal surat dari warga yang belum punya rumah. */
export const KOTA_KANTOR_POS = { x: 1180, y: 330 };
/**
 * Lama pengantaran surat (menit) menurut jarak di peta (ruang 2000×1125, kira-kira
 * 3 meter per satuan). Bang Jamil bersepeda: 15 menit menyiapkan, lalu setengah menit
 * per satuan; ke pulau naik perahu. Paling lama 16 jam.
 */
export function kotaAntar(a: { x: number; y: number }, b: { x: number; y: number }, pulau = false): number {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return Math.min(16 * 60, Math.round(15 + d * 0.5 + (pulau ? 180 : 0)));
}
