#!/usr/bin/env python3
"""
Pasang gambar peta Sangkala ke aplikasi (apps/web/public/kota/sangkala-{kecil,2k,4k}.webp).

  python3 scripts/peta/pasang.py                      # hasil render: scripts/peta/out/sangkala.png
  python3 scripts/peta/pasang.py ilustrasiku.png      # ilustrasi buatanmu sendiri

Ilustrasi harus mengikuti lembar panduan (node scripts/peta/panduan.mjs): kanvas
16:9, idealnya 4000x2250, dengan setiap rumah tergambar di atas tapaknya. Titik persil
di aplikasi diletakkan dari koordinat yang sama, jadi gambar yang bergeser membuat
rumah yang diketuk tidak cocok dengan gambarnya. Skrip ini juga membuat
out/cek-pasang.png: ilustrasi dengan titik-titik persil di atasnya, untuk diperiksa mata.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PUBLIC = ROOT / 'apps/web/public/kota'
W, H = 4000, 2250
UKURAN = {'4k': (4000, 2250, 72), '2k': (2000, 1125, 78), 'kecil': (640, 360, 80)}


def muat(path: Path) -> Image.Image:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    if abs(w / h - W / H) > 0.01:
        # Potong ke 16:9 dari tengah; peringatkan karena tata letak bisa bergeser.
        print(f'peringatan: rasio {w}x{h} bukan 16:9, dipotong dari tengah. Periksa out/cek-pasang.png.')
        if w / h > W / H:
            nw = round(h * W / H)
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = round(w * H / W)
            im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    return im


def persil():
    ts = (ROOT / 'packages/core/src/kotaData.ts').read_text()
    m = re.search(r'SANGKALA_PERSIL[^=]*=\s*(\[.*?\]);', ts, re.S)
    return json.loads(m.group(1))


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'out/sangkala.png'
    im = muat(src)
    for nama, (w, h, q) in UKURAN.items():
        out = PUBLIC / f'sangkala-{nama}.webp'
        (im if (w, h) == (W, H) else im.resize((w, h), Image.LANCZOS)).save(out, 'WEBP', quality=q, method=6)
        print(f'{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB')
    # Lembar periksa: titik persil (koordinat peta 2000x1125, digandakan ke 4000x2250).
    cek = im.copy()
    d = ImageDraw.Draw(cek)
    for pid, _region, x, y, _alamat in persil():
        X, Y = x * 2, y * 2
        d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=(220, 30, 40), width=2)
    (HERE / 'out').mkdir(exist_ok=True)
    cek.save(HERE / 'out/cek-pasang.png')
    print('lembar periksa: scripts/peta/out/cek-pasang.png')


if __name__ == '__main__':
    main()
