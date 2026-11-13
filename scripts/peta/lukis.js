/* Pelukis peta Sangkala (berjalan di Chromium). Membaca window.FITUR dari generator:
 * relief bukit dari peta ketinggian, bangunan bersudut miring (dinding selatan terlihat,
 * jendela, atap menjorok terangkat setinggi dinding), bayangan memanjang ke tenggara,
 * dan pohon bertajuk terangkat. Cahaya dari barat laut. Tapak bangunan (titik persil)
 * tetap di tanah, jadi tata letak dan id persil tidak berubah. */
(function () {
  const F = window.FITUR;
  const W = 2000;
  const H = 1125;
  const S = 2;

  // Derau yang sama dengan generator (tanpa acak global).
  const hash2 = (x, y, s) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const sm = (t) => t * t * (3 - 2 * t);
  const noise = (x, y, s) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = sm(x - xi);
    const yf = sm(y - yi);
    const a = hash2(xi, yi, s);
    const b = hash2(xi + 1, yi, s);
    const c = hash2(xi, yi + 1, s);
    const d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  const fbm = (x, y, s) => noise(x, y, s) * 0.55 + noise(x * 2.1, y * 2.1, s + 9) * 0.3 + noise(x * 4.3, y * 4.3, s + 21) * 0.15;

  // ── Relief ─────────────────────────────────────────────────────────────
  function height(x, y) {
    const north = Math.max(0, (360 - y) / 360);
    let h = Math.pow(north, 1.5) * (0.5 + 0.5 * fbm(x * 0.006, y * 0.006, 3)) * 1.1;
    const g = Math.max(0, 1 - Math.hypot((x - 1000) / 1.5, (y - 70) / 0.8) / 245);
    h += (Math.floor(g * 22) / 22) * 0.75 + g * 0.08;
    h += fbm(x * 0.012, y * 0.012, 8) * 0.07;
    h += Math.max(0, 1 - Math.hypot(x - 1630, y - 762) / 100) * 0.3;
    h += Math.max(0, 1 - Math.hypot(x - 1250, y - 230) / 220) * 0.12;
    return h;
  }
  const relief = document.getElementById('relief');
  relief.width = W;
  relief.height = H;
  {
    const ctx = relief.getContext('2d');
    const img = ctx.createImageData(W, H);
    const hs = new Float32Array((W + 2) * (H + 2));
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) hs[(y + 1) * (W + 2) + (x + 1)] = height(x, y);
    const L = [-0.62, -0.62, 0.48];
    const k = 110;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y + 1) * (W + 2) + (x + 1);
        const dx = (hs[i + 1] - hs[i - 1]) * k;
        const dy = (hs[i + W + 2] - hs[i - W - 2]) * k;
        const n = Math.hypot(dx, dy, 1);
        const sh = (-dx * L[0] - dy * L[1] + L[2]) / n;
        const v = Math.max(0, Math.min(255, 128 + (sh - 0.48) * 420));
        const o = (y * W + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    // Hanya di daratan.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fill(new Path2D(F.land));
    ctx.fill(new Path2D(F.island));
  }

  // ── Bangunan dan pohon ─────────────────────────────────────────────────
  const cv = document.getElementById('benda');
  cv.width = W * S;
  cv.height = H * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);
  const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const tone = (hex, t) => {
    const [r, g, b] = rgb(hex);
    const f = (c) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };
  const LP = [-Math.SQRT1_2, -Math.SQRT1_2];
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const poly = (ps) => {
    ctx.beginPath();
    ps.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  };

  function roofFaces(w, d, hip) {
    const sw = w < d;
    const W2 = (sw ? d : w) / 2;
    const D2 = (sw ? w : d) / 2;
    let faces;
    if (hip) {
      const r = Math.max(0, W2 - D2);
      faces = [
        [[[-W2, -D2], [W2, -D2], [r, 0], [-r, 0]], [0, -1]],
        [[[-W2, D2], [W2, D2], [r, 0], [-r, 0]], [0, 1]],
        [[[-W2, -D2], [-r, 0], [-W2, D2]], [-1, 0]],
        [[[W2, -D2], [r, 0], [W2, D2]], [1, 0]],
      ];
    } else
      faces = [
        [[[-W2, -D2], [W2, -D2], [W2, 0], [-W2, 0]], [0, -1]],
        [[[-W2, D2], [W2, D2], [W2, 0], [-W2, 0]], [0, 1]],
      ];
    if (sw) faces = faces.map(([ps, n]) => [ps.map(([x, y]) => [y, x]), [n[1], n[0]]]);
    return faces;
  }

  const houses = F.houses.map(([x, y, w, d, a, roof, kind]) => ({ x, y, w, d, a: (a * Math.PI) / 180, roof, kind }));
  const trees = F.trees.map(([x, y, r, g]) => ({ x, y, r, g }));

  // ── Sudut miring: setiap bangunan punya tinggi; dinding yang menghadap selatan
  // terlihat, atap terangkat setinggi dinding. Tapak (titik persil) tetap di tanah.
  const TINGGI = { rumah: 2.5, lapak: 1.5, gudang: 3.8, putih: 4.4 };
  const DINDING = { rumah: '#efe2c8', lapak: '#d9d2c3', gudang: '#cdc7bb', putih: '#f5f1e7' };
  for (const h of houses) {
    const k = Math.max(0.8, Math.min(1.4, (h.w + h.d) / 12));
    h.H = (TINGGI[h.kind] ?? 2.5) * k * (0.9 + 0.2 * hash2(Math.round(h.x * 3), Math.round(h.y * 3), 17));
    h.C = [[-h.w / 2, -h.d / 2], [h.w / 2, -h.d / 2], [h.w / 2, h.d / 2], [-h.w / 2, h.d / 2]].map((p) => rot(p, h.a)).map(([px, py]) => [h.x + px, h.y + py]);
    h.base = Math.max(...h.C.map((c) => c[1]));
  }

  // Bayangan: dilukis di kanvas terpisah lalu diburamkan sekali. Bangunan tinggi
  // menjatuhkan bayangan lebih panjang (sapuan tapak ke arah tenggara).
  {
    const sc = document.createElement('canvas');
    sc.width = W * S;
    sc.height = H * S;
    const sx = sc.getContext('2d');
    sx.scale(S, S);
    sx.fillStyle = 'rgb(38,30,22)';
    for (const h of houses) {
      const L = h.H * 1.05;
      for (const f of [0, 0.34, 0.67, 1]) {
        sx.beginPath();
        h.C.forEach(([px, py], i) => (i ? sx.lineTo(px + L * 0.85 * f, py + L * 0.6 * f) : sx.moveTo(px + L * 0.85 * f, py + L * 0.6 * f)));
        sx.closePath();
        sx.fill();
      }
    }
    sx.fillStyle = 'rgb(28,40,20)';
    for (const t of trees) {
      sx.beginPath();
      sx.ellipse(t.x + t.r * 0.9, t.y + t.r * 0.45, t.r * 1.1, t.r * 0.8, 0.5, 0, Math.PI * 2);
      sx.fill();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.3;
    ctx.filter = 'blur(2.6px)';
    ctx.drawImage(sc, 0, 0);
    ctx.restore();
  }

  const NORMAL = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const quad = (a, b, c, d) => poly([a, b, c, d]);
  const up = ([x, y], dy) => [x, y - dy];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function rumah(h) {
    const Hh = h.H;
    const flat = h.kind === 'lapak';
    // Dinding yang terlihat (normal menghadap ke bawah layar), dari yang paling belakang.
    const walls = NORMAL.map((n, i) => ({ i, n: rot(n, h.a) })).filter((x) => x.n[1] > 0.02).sort((a, b) => a.n[1] - b.n[1]);
    for (const { i, n } of walls) {
      const A = h.C[i];
      const B = h.C[(i + 1) % 4];
      const b = n[0] * LP[0] + n[1] * LP[1];
      ctx.fillStyle = tone(DINDING[h.kind] ?? DINDING.rumah, b * 0.32 - 0.04);
      quad(A, B, up(B, Hh), up(A, Hh));
      ctx.fill();
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      // Jendela dan pintu: guratan gelap kecil di dinding yang cukup lebar.
      if (!flat && len > 2.6 && Hh > 1.8) {
        ctx.fillStyle = h.kind === 'putih' ? 'rgba(70,80,95,0.5)' : 'rgba(62,44,32,0.55)';
        const nwin = Math.max(1, Math.floor(len / 2.4));
        for (let j = 0; j < nwin; j++) {
          const t0 = (j + 0.3) / nwin;
          const t1 = (j + 0.62) / nwin;
          const p0 = lerp(A, B, t0);
          const p1 = lerp(A, B, t1);
          const door = h.kind === 'rumah' && j === Math.floor(nwin / 2) && n[1] > 0.6;
          const lo = door ? 0 : Hh * 0.32;
          const hi = Hh * (door ? 0.68 : 0.66);
          quad(up(p0, lo), up(p1, lo), up(p1, hi), up(p0, hi));
          ctx.fill();
        }
      }
      // Bayang tritisan di bawah atap.
      ctx.strokeStyle = 'rgba(40,26,16,0.35)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(...up(A, Hh - 0.25));
      ctx.lineTo(...up(B, Hh - 0.25));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(64,40,28,0.35)';
      ctx.lineWidth = 0.3;
      quad(A, B, up(B, Hh), up(A, Hh));
      ctx.stroke();
    }
    // Atap, sedikit menjorok (tritisan), terangkat setinggi dinding.
    const hip = h.kind === 'putih' || (h.kind === 'rumah' && hash2(Math.round(h.x * 3), Math.round(h.y * 3), 5) < 0.38);
    const ow = h.w * (flat ? 1.0 : 1.1);
    const od = h.d * (flat ? 1.0 : 1.12);
    const faces = flat ? [[[[-ow / 2, -od / 2], [ow / 2, -od / 2], [ow / 2, od / 2], [-ow / 2, od / 2]], [0, 0]]] : roofFaces(ow, od, hip);
    const kk = h.kind === 'gudang' ? 0.1 : h.kind === 'putih' ? 0.12 : 0.28;
    const jitter = (hash2(Math.round(h.x * 7), Math.round(h.y * 7), 11) - 0.5) * 0.16;
    const rx = h.x;
    const ry = h.y - Hh;
    for (const [ps, n] of faces) {
      const wn = rot(n, h.a);
      // Sisi atap yang menghadap pemirsa sedikit lebih terang (sudut miring).
      const b = flat ? 0.04 : wn[0] * LP[0] + wn[1] * LP[1] + wn[1] * 0.25;
      ctx.fillStyle = tone(h.roof, b * kk + jitter);
      poly(ps.map((p) => rot(p, h.a)).map(([px, py]) => [rx + px, ry + py]));
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(64,40,28,0.55)';
    ctx.lineWidth = 0.35;
    poly([[-ow / 2, -od / 2], [ow / 2, -od / 2], [ow / 2, od / 2], [-ow / 2, od / 2]].map((p) => rot(p, h.a)).map(([px, py]) => [rx + px, ry + py]));
    ctx.stroke();
    if (h.kind === 'gudang') {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.3;
      const long = ow >= od;
      for (let t2 = -0.45; t2 <= 0.45; t2 += 0.06) {
        const a2 = rot(long ? [t2 * ow, -od / 2] : [-ow / 2, t2 * od], h.a);
        const b2 = rot(long ? [t2 * ow, od / 2] : [ow / 2, t2 * od], h.a);
        ctx.beginPath();
        ctx.moveTo(rx + a2[0], ry + a2[1]);
        ctx.lineTo(rx + b2[0], ry + b2[1]);
        ctx.stroke();
      }
    }
  }

  function pohon(t) {
    // Batang pendek, tajuk terangkat; tajuk bergradasi dengan benjolan.
    const cy = t.y - t.r * 0.62;
    ctx.strokeStyle = 'rgba(86,60,38,0.9)';
    ctx.lineWidth = Math.max(0.4, t.r * 0.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x, cy + t.r * 0.3);
    ctx.stroke();
    const g = ctx.createRadialGradient(t.x - t.r * 0.38, cy - t.r * 0.45, t.r * 0.08, t.x, cy, t.r * 1.08);
    g.addColorStop(0, tone(t.g, 0.34));
    g.addColorStop(0.55, t.g);
    g.addColorStop(1, tone(t.g, -0.4));
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = t.r * (0.92 + 0.12 * hash2(Math.round(t.x * 5) + i, Math.round(t.y * 5), 3));
      const px = t.x + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.92;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,50,20,0.35)';
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }

  // Lukis dari belakang ke depan supaya yang dekat menutupi yang jauh.
  ctx.lineJoin = 'round';
  const semua = [...houses.map((h) => ({ y: h.base, f: () => rumah(h) })), ...trees.map((t) => ({ y: t.y + t.r * 0.2, f: () => pohon(t) }))];
  semua.sort((a, b) => a.y - b.y);
  for (const x of semua) x.f();
  window.SELESAI = true;
})();
