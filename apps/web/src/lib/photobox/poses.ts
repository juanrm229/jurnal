/**
 * Kartu pose di antara jepretan. Pose berdua dirancang untuk strip yang
 * berdampingan: yang di kiri condong ke kanan, yang di kanan condong ke kiri,
 * jadi di strip kalian seolah benar-benar bersentuhan lintas kota.
 */
export interface Pose {
  text: string;
  /** Instruksi untuk yang di kiri / kanan strip (pose berdua). */
  left?: string;
  right?: string;
  emoji: string;
}

export const SOLO_POSES: Pose[] = [
  { emoji: '😲', text: 'pura-pura kaget lihat harga' },
  { emoji: '🪪', text: 'pose foto KTP, serius sekali' },
  { emoji: '😎', text: 'pose 2010: dagu turun, kamera dari atas' },
  { emoji: '🤫', text: 'bisikkan rahasia ke kamera' },
  { emoji: '🥹', text: 'wajah habis dapat kabar baik' },
  { emoji: '🐱', text: 'jadi kucing yang minta makan' },
  { emoji: '🫣', text: 'intip dari balik tangan' },
  { emoji: '🤔', text: 'mikir keras: makan apa hari ini?' },
  { emoji: '😤', text: 'wajah kalah main game' },
  { emoji: '🌬️', text: 'tiup poni dramatis' },
  { emoji: '🧑‍🎤', text: 'sampul album pertamamu' },
  { emoji: '😴', text: 'ketiduran di kelas pagi' },
  { emoji: '🫶', text: 'bentuk hati dengan tangan' },
  { emoji: '🕺', text: 'gerakan joget yang paling memalukan' },
  { emoji: '🤳', text: 'selfie seolah kamera ini HP-mu' },
  { emoji: '👵', text: 'jadi dirimu umur 80 tahun' },
  { emoji: '🦖', text: 'dinosaurus yang marah' },
  { emoji: '🍜', text: 'pura-pura nyeruput mie panas' },
  { emoji: '📸', text: 'senyum terbaik, sekali ini saja' },
  { emoji: '🫠', text: 'meleleh kepanasan' },
  { emoji: '🧐', text: 'detektif yang menemukan petunjuk' },
  { emoji: '🙈', text: 'tutup mata, cengengesan' },
  { emoji: '💪', text: 'pamer otot imajiner' },
  { emoji: '🌧️', text: 'galau lihat hujan di jendela' },
];

export const DUO_POSES: Pose[] = [
  { emoji: '🙌', text: 'tos lintas kota', left: 'tempel telapak tangan ke sisi KANAN layar', right: 'tempel telapak tangan ke sisi KIRI layar' },
  { emoji: '🫶', text: 'setengah hati, jadi satu', left: 'buat setengah hati di sisi KANAN', right: 'buat setengah hati di sisi KIRI' },
  { emoji: '🥂', text: 'bersulang!', left: 'angkat gelas ke arah KANAN', right: 'angkat gelas ke arah KIRI' },
  { emoji: '😘', text: 'cium pipi jarak jauh', left: 'condongkan pipi ke KANAN', right: 'monyongkan bibir ke KIRI' },
  { emoji: '👉', text: 'saling tunjuk: "kamu!"', left: 'tunjuk ke KANAN', right: 'tunjuk ke KIRI' },
  { emoji: '🍟', text: 'suapin dia', left: 'sodorkan makanan ke KANAN', right: 'buka mulut lebar, hadap KIRI' },
  { emoji: '🫂', text: 'peluk dari jauh', left: 'rentangkan tangan ke KANAN', right: 'rentangkan tangan ke KIRI' },
  { emoji: '🤜', text: 'adu tinju', left: 'kepalan tangan ke KANAN', right: 'kepalan tangan ke KIRI' },
  { emoji: '🎤', text: 'duet karaoke', left: 'nyanyi dengan mik, hadap KANAN', right: 'ikut nyanyi, hadap KIRI' },
  { emoji: '🤫', text: 'bisik-bisik rahasia', left: 'berbisik ke KANAN', right: 'dengarkan dengan kaget, telinga ke KIRI' },
  { emoji: '😠', text: 'pura-pura marahan', left: 'buang muka ke KIRI', right: 'buang muka ke KANAN' },
  { emoji: '🎈', text: 'oper balon', left: 'lempar sesuatu ke KANAN', right: 'tangkap dari KIRI' },
  { emoji: '🪞', text: 'jadi cermin', left: 'pose bebas, dia meniru', right: 'tiru pose dia sebisanya' },
  { emoji: '😳', text: 'kepergok', left: 'lirik curiga ke KANAN', right: 'pura-pura tidak tahu apa-apa' },
  { emoji: '🫰', text: 'jari saranghae bersama', left: 'saranghae dengan tangan kanan', right: 'saranghae dengan tangan kiri' },
  { emoji: '🧋', text: 'berbagi boba', left: 'pegang gelas di sisi KANAN', right: 'sedot dari sisi KIRI' },
  { emoji: '🐟', text: 'ikan cium', left: 'bibir ikan ke KANAN', right: 'bibir ikan ke KIRI' },
  { emoji: '🌙', text: 'selamat tidur', left: 'pura-pura tidur bersandar ke KANAN', right: 'bersandar ke KIRI, mata terpejam' },
];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 4294967296;
}

/** Kartu pose untuk satu sesi: sama persis di kedua HP karena dari seed yang sama. */
export function posesFor(seed: number, shots: number, duo: boolean): Pose[] {
  const pool = [...(duo ? DUO_POSES : SOLO_POSES)];
  const r = rng(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, shots);
}
