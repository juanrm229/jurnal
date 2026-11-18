// Sinkron ke lagu "Prayer for Her": memetakan waktu video ke waktu animasi.
// Lagu dipakai mulai detik 19,0 (awal bait) sampai ±1:30. Waktu video 0 = detik
// 19,0 lagu. Reff masuk di video 31 (lagu 0:50); jeda hening di video 52,8–54,4
// (lagu 1:11,8–1:13,4), lalu reff besar menghantam di video 54,56 (lagu 1:13,56):
// di situ lak "kapsul." dihantamkan.
// Dipakai oleh index.html (window.TIMING), audio.cjs dan render.cjs (require).
(function (root) {
  // beat lagu dalam waktu video (hasil deteksi librosa, ±96 BPM)
  const BEATS = [0.2, 0.83, 1.48, 2.13, 2.76, 3.41, 4.06, 4.68, 5.31, 6.01, 6.63, 7.26, 7.89, 8.52, 9.12, 9.79, 10.4, 11.02, 11.67, 12.32, 12.97, 13.6, 14.23, 14.85, 15.5, 16.16, 16.78, 17.41, 18.08, 18.73, 19.34, 19.99, 20.64, 21.26, 21.89, 22.56, 23.24, 23.86, 24.49, 25.19, 25.79, 26.46, 27.16, 27.81, 28.46, 29.09, 29.74, 30.37, 31.02, 31.64, 32.27, 32.94, 33.55, 34.17, 34.85, 35.47, 36.1, 36.75, 37.38, 38.0, 38.68, 39.31, 39.93, 40.58, 41.23, 41.86, 42.53, 43.14, 43.76, 44.41, 45.06, 45.76, 46.5, 47.11, 47.73, 48.38, 49.01, 49.66, 50.33, 50.98, 51.66, 52.24, 52.8, 53.38, 53.96, 54.56, 55.16, 55.79, 56.42, 57.02, 57.63, 58.23, 58.86, 59.44, 60.09, 60.69, 61.29, 61.9, 62.5, 63.11, 63.76, 64.34, 64.96, 65.61, 66.22, 66.82, 67.42, 68.07, 68.75, 69.4, 70.03, 70.61, 71.23];

  // [waktu animasi, waktu video]
  const ANCHORS = [
    [0, 0],
    [4.28, 5.31], // tetes tinta jatuh → foto gua terbuka di hentakan
    [8.5, 10.4], // kamera menembus telapak tangan
    [10.75, 12.97], // jurnal: foto pertama
    [11.42, 13.6], [12.37, 14.85], [13.32, 16.16], // foto berikutnya, tiap 2 beat
    [15.6, 18.08], // cetak biru, hentakan kuat
    [15.85, 18.73], [16.85, 19.99], [17.85, 21.26], [18.85, 22.56], // alat tulis, tiap 2 beat
    [19.9, 23.86], [20.55, 24.49], // "Alatnya berganti." / "rindunya sama."
    [21.9, 25.79], // BABAK II
    [24.7, 29.09], // montase surat
    [26.44, 31.02], // lak dihantamkan (reff mulai)
    [27.44, 32.27], [28.81, 33.55], [30.18, 34.85], [31.55, 36.1],
    [32.15, 36.75], // cap pos
    [32.9, 37.38], // barisan alat tulis
    [38.7, 41.86], // "— hanya berhenti menyimpannya."
    [42.3, 44.41], // kutipan Pramoedya
    [48.5, 49.66], // tulis, simpan, kirim
    [51.5, 51.66], // 1940 → 8113
    [54.17, 54.56], // lak "kapsul." tepat di hantaman reff
    [55.3, 55.79], // Sehari adalah…
    [60.7, 62.5], // selamat malam, penulis
    [63.4, 65.61], // penutup
    [67, 71.2],
  ];
  const VIDEO_DURATION = 71.2;
  const MUSIC_START = 19.0; // detik di lagu yang menjadi video 0

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
  function beatPulse(v, decay = 9) {
    let last = -1;
    for (const b of BEATS) { if (b <= v) last = b; else break; }
    return last < 0 ? 0 : Math.exp(-decay * (v - last));
  }
  const T = { BEATS, ANCHORS, VIDEO_DURATION, MUSIC_START, animAt, videoAt, beatPulse };
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.TIMING = T;
})(typeof window !== 'undefined' ? window : globalThis);
