// Sinkron ke lagu: memetakan waktu video (detik, ikut lagu) ke waktu animasi.
// Animasi di index.html ditulis dalam "waktu animasi"; titik-titik jangkar di
// bawah menaruh momen pentingnya tepat di beat lagu (≈117,5 BPM).
// Dipakai oleh index.html (window.TIMING) dan audio.cjs (require).
(function (root) {
  // beat hasil deteksi (librosa) pada lagu, detik
  const BEATS = [0.209, 0.72, 1.231, 1.718, 2.229, 2.763, 3.274, 3.785, 4.319, 4.83, 5.317, 5.782, 6.223, 6.687, 7.198, 7.686, 8.22, 8.731, 9.242, 9.752, 10.263, 10.774, 11.285, 11.796, 12.307, 12.817, 13.328, 13.839, 14.35, 14.861, 15.372, 15.882, 16.417, 16.927, 17.531, 18.088, 18.599, 19.133, 19.644, 20.155, 20.666, 21.177, 21.687, 22.198, 22.709, 23.243, 23.754, 24.265, 24.776, 25.287, 25.774, 26.285, 26.796, 27.307, 27.818, 28.491, 29.002, 29.513, 30.023, 30.534];

  // [waktu animasi, waktu video]
  const ANCHORS = [
    [0, 0],
    [0.6, 0.72], // titik tinta mendarat, logo mulai digambar
    [1.5, 1.718], // logo memantul
    [2.55, 2.763], // logo keluar
    [3.8, 3.785], // coretan "jarak"
    [4.4, 4.319], // baris lama keluar
    [5.65, 5.782], // pil "bersama." muncul
    [5.85, 5.97], // lingkaran kertas terbuka (hentakan di lagu)
    [6.1, 6.223], // HP naik
    [7.1, 7.198], // label fitur pertama
    [8.33, 8.731], // polaroid mendarat
    [9.67, 9.91], // tombol lak ditekan (hentakan di lagu)
    [10.0, 10.263], // masuk ke upacara segel
    [12.45, 13.328], // lak dihantamkan
    [13.45, 14.35], // whip ke "dua sisi"
    [15.2, 16.417], // gembok terbuka
    [16.55, 18.088], // panel angka naik (hentakan di lagu)
    [19.55, 21.687], // whip ke "hari jadi halaman"
    [19.85, 22.198], // halaman.
    [21.29, 23.754], // jilid.
    [21.65, 25.3],
    [21.7, 25.45], // penutup dibuka tepat di jeda lagu
    [27.2, 30.95], // akhir (drop di 28,45 = penutup l≈3.0)
  ];
  const VIDEO_DURATION = 30.95;

  function map(x, from, to) {
    const A = ANCHORS;
    if (x <= A[0][from]) return A[0][to];
    for (let i = 1; i < A.length; i++) {
      if (x <= A[i][from]) {
        const [a, b] = [A[i - 1], A[i]];
        const p = (x - a[from]) / (b[from] - a[from]);
        return a[to] + (b[to] - a[to]) * p;
      }
    }
    const a = A[A.length - 1];
    return a[to] + (x - a[from]);
  }
  const animAt = (v) => map(v, 1, 0);
  const videoAt = (t) => map(t, 0, 1);
  // 0..1 seberapa dekat dengan beat terakhir (1 tepat di beat, meluruh cepat)
  function beatPulse(v, decay = 9) {
    let last = -1;
    for (const b of BEATS) { if (b <= v) last = b; else break; }
    return last < 0 ? 0 : Math.exp(-decay * (v - last));
  }
  const T = { BEATS, ANCHORS, VIDEO_DURATION, animAt, videoAt, beatPulse };
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.TIMING = T;
})(typeof window !== 'undefined' ? window : globalThis);
