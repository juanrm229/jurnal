// Sinkron ke lagu: memetakan waktu video (detik, ikut lagu) ke waktu animasi.
// Animasi di index.html ditulis dalam "waktu animasi". Titik jangkar di bawah
// menaruh tiap potongan adegan tepat di beat lagu. Selama lagunya belum ada,
// pemetaannya lurus (waktu video = waktu animasi).
// Dipakai oleh index.html (window.TIMING) dan audio.cjs (require).
(function (root) {
  // beat lagu (detik). Kosong = belum disinkronkan.
  const BEATS = [];

  // [waktu animasi, waktu video]
  const ANCHORS = [
    [0, 0],
    [67, 67],
  ];
  const VIDEO_DURATION = 67;

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
  const T = { BEATS, ANCHORS, VIDEO_DURATION, animAt, videoAt, beatPulse };
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.TIMING = T;
})(typeof window !== 'undefined' ? window : globalThis);
