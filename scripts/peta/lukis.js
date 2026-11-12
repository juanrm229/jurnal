/* Pelukis peta Sangkala (berjalan di Chromium). Membaca window.FITUR dari generator:
 * relief bukit dari peta ketinggian, atap tiga dimensi dengan sisi terang/gelap,
 * bayangan jatuh ke tenggara, dan tajuk pohon bergradasi. Cahaya dari barat laut. */
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

  // Bayangan: rumah dan pohon dilukis di kanvas terpisah, lalu diburamkan sekali.
  {
    const sc = document.createElement('canvas');
    sc.width = W * S;
    sc.height = H * S;
    const sx = sc.getContext('2d');
    sx.scale(S, S);
    sx.fillStyle = 'rgb(38,30,22)';
    for (const h of houses) {
      const s = h.kind === 'gudang' ? 3.2 : h.kind === 'putih' ? 4 : h.kind === 'lapak' ? 1 : 2.4;
      const c = [[-h.w / 2, -h.d / 2], [h.w / 2, -h.d / 2], [h.w / 2, h.d / 2], [-h.w / 2, h.d / 2]].map((p) => rot(p, h.a)).map(([px, py]) => [h.x + px + s * 0.9, h.y + py + s]);
      sx.beginPath();
      c.forEach((p, i) => (i ? sx.lineTo(p[0], p[1]) : sx.moveTo(p[0], p[1])));
      sx.closePath();
      sx.fill();
    }
    sx.fillStyle = 'rgb(28,40,20)';
    for (const t of trees) {
      sx.beginPath();
      sx.ellipse(t.x + t.r * 0.55, t.y + t.r * 0.7, t.r * 1.02, t.r * 0.92, 0, 0, Math.PI * 2);
      sx.fill();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.3;
    ctx.filter = 'blur(2.4px)';
    ctx.drawImage(sc, 0, 0);
    ctx.restore();
  }

  // Atap.
  ctx.lineJoin = 'round';
  for (const h of houses) {
    const hip = h.kind === 'putih' || (h.kind === 'rumah' && hash2(Math.round(h.x * 3), Math.round(h.y * 3), 5) < 0.38);
    const flat = h.kind === 'lapak';
    const faces = flat ? [[[[-h.w / 2, -h.d / 2], [h.w / 2, -h.d / 2], [h.w / 2, h.d / 2], [-h.w / 2, h.d / 2]], [0, 0]]] : roofFaces(h.w, h.d, hip);
    const k = h.kind === 'gudang' ? 0.1 : h.kind === 'putih' ? 0.12 : 0.26;
    const jitter = (hash2(Math.round(h.x * 7), Math.round(h.y * 7), 11) - 0.5) * 0.16;
    for (const [ps, n] of faces) {
      const wn = rot(n, h.a);
      const b = flat ? 0 : wn[0] * LP[0] + wn[1] * LP[1];
      ctx.fillStyle = tone(h.roof, b * k + jitter);
      poly(ps.map((p) => rot(p, h.a)).map(([px, py]) => [h.x + px, h.y + py]));
      ctx.fill();
    }
    // Garis bubungan dan tepi.
    ctx.strokeStyle = 'rgba(64,40,28,0.55)';
    ctx.lineWidth = 0.35;
    poly([[-h.w / 2, -h.d / 2], [h.w / 2, -h.d / 2], [h.w / 2, h.d / 2], [-h.w / 2, h.d / 2]].map((p) => rot(p, h.a)).map(([px, py]) => [h.x + px, h.y + py]));
    ctx.stroke();
    if (h.kind === 'gudang') {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.3;
      const long = h.w >= h.d;
      for (let t = -0.45; t <= 0.45; t += 0.06) {
        const a = long ? [t * h.w, -h.d / 2] : [-h.w / 2, t * h.d];
        const b2 = long ? [t * h.w, h.d / 2] : [h.w / 2, t * h.d];
        ctx.beginPath();
        const A = rot(a, h.a);
        const B = rot(b2, h.a);
        ctx.moveTo(h.x + A[0], h.y + A[1]);
        ctx.lineTo(h.x + B[0], h.y + B[1]);
        ctx.stroke();
      }
    }
  }

  // Pohon: tajuk bergradasi, sedikit benjolan supaya tidak seperti bola.
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) {
    const g = ctx.createRadialGradient(t.x - t.r * 0.38, t.y - t.r * 0.42, t.r * 0.08, t.x, t.y, t.r * 1.08);
    g.addColorStop(0, tone(t.g, 0.32));
    g.addColorStop(0.55, t.g);
    g.addColorStop(1, tone(t.g, -0.38));
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = t.r * (0.92 + 0.12 * hash2(Math.round(t.x * 5) + i, Math.round(t.y * 5), 3));
      const px = t.x + Math.cos(a) * rr;
      const py = t.y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,50,20,0.35)';
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }
  window.SELESAI = true;
})();
