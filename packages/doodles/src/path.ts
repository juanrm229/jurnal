/**
 * Utilitas string path SVG untuk path buatan `Pen`.
 *
 * Semua path di pustaka ini hanya memakai perintah absolut M, L, C, Q dan Z
 * (lihat pen.ts), jadi transformasi afin cukup diterapkan ke setiap pasangan (x, y).
 */

/** Matriks afin [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Affine = readonly [number, number, number, number, number, number];

const TOKEN = /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? '0' : String(r);
}

/** Terapkan matriks afin ke path M/L/C/Q/Z absolut. Perintah lain → Error. */
export function transformPath(d: string, m: Affine): string {
  const toks = d.match(TOKEN) ?? [];
  let out = '';
  let i = 0;
  while (i < toks.length) {
    const t = toks[i]!;
    if (/^[A-Za-z]$/.test(t)) {
      if (!/^[MLCQZ]$/.test(t)) throw new Error(`transformPath: perintah '${t}' tidak didukung`);
      out += t;
      i++;
      continue;
    }
    const x = Number(t);
    const y = Number(toks[i + 1]);
    if (Number.isNaN(y)) throw new Error('transformPath: koordinat ganjil');
    const last = out[out.length - 1];
    if (last !== undefined && !/[MLCQZ]/.test(last)) out += ' ';
    out += fmt(m[0] * x + m[2] * y + m[4]) + ' ' + fmt(m[1] * x + m[3] * y + m[5]);
    i += 2;
  }
  return out;
}

/** Matriks: skala `k` + putar `rot` derajat di sekitar (cx, cy) asal, lalu pindah ke (x, y). */
export function placeMatrix(
  cx: number,
  cy: number,
  x: number,
  y: number,
  k: number,
  rot = 0,
  flip = false,
): Affine {
  const r = (rot * Math.PI) / 180;
  const c = Math.cos(r) * k;
  const s = Math.sin(r) * k;
  const fx = flip ? -1 : 1;
  // p' = R·S·F·(p - c0) + (x, y)
  const a = c * fx;
  const b = s * fx;
  const cc = -s;
  const dd = c;
  return [a, b, cc, dd, x - a * cx - cc * cy, y - b * cx - dd * cy];
}

/** Kotak pembatas perkiraan [x0, y0, x1, y1] dengan menyampel kurva. */
export function pathBBox(paths: readonly string[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number): void => {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  };
  for (const d of paths) {
    const toks = d.match(TOKEN) ?? [];
    let i = 0;
    let px = 0;
    let py = 0;
    let cmd = '';
    const num = (): number => Number(toks[i++]);
    while (i < toks.length) {
      const t = toks[i]!;
      if (/^[A-Za-z]$/.test(t)) {
        cmd = t;
        i++;
        continue;
      }
      if (cmd === 'C') {
        const a = [num(), num(), num(), num(), num(), num()] as const;
        for (let s = 1; s <= 8; s++) {
          const u = s / 8;
          const v = 1 - u;
          add(
            v * v * v * px + 3 * v * v * u * a[0] + 3 * v * u * u * a[2] + u * u * u * a[4],
            v * v * v * py + 3 * v * v * u * a[1] + 3 * v * u * u * a[3] + u * u * u * a[5],
          );
        }
        px = a[4];
        py = a[5];
      } else if (cmd === 'Q') {
        const a = [num(), num(), num(), num()] as const;
        for (let s = 1; s <= 8; s++) {
          const u = s / 8;
          const v = 1 - u;
          add(v * v * px + 2 * v * u * a[0] + u * u * a[2], v * v * py + 2 * v * u * a[1] + u * u * a[3]);
        }
        px = a[2];
        py = a[3];
      } else {
        px = num();
        py = num();
        add(px, py);
      }
    }
  }
  return [x0, y0, x1, y1];
}
