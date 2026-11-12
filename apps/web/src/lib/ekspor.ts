/**
 * Ekspor naskah di perangkat, tanpa server: Markdown, EPUB 3, dan DOCX.
 * Arsip ZIP ditulis sendiri (mode simpan, tanpa kompresi) supaya tidak perlu
 * pustaka tambahan.
 */
export interface Naskah {
  title: string;
  subtitle?: string;
  credit: string;
  chapters: { heading: string; sub?: string; text: string }[];
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

export function zip(files: { name: string; data: string }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nama UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    const head = new Uint8Array(local.buffer);
    parts.push(head, name, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += head.length + name.length + data.length;
  }
  const size = central.reduce((n, x) => n + x.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[]);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (s: string) => s.split(/\n+/).map((x) => x.trim()).filter(Boolean);

export function toMarkdown(n: Naskah): string {
  const out = [`# ${n.title}`, n.subtitle ? `_${n.subtitle}_` : '', n.credit, ''];
  for (const c of n.chapters) out.push(`## ${c.heading}`, c.sub ? `_${c.sub}_\n` : '', c.text.trim(), '');
  return out.filter((x, i) => x !== '' || out[i - 1] !== '').join('\n');
}

export function toEpub(n: Naskah, id: string): Blob {
  const xhtml = (title: string, body: string) =>
    `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="id" lang="id"><head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" href="gaya.css"/></head><body>${body}</body></html>`;
  const ch = n.chapters.map((c, i) => ({ file: `bab${i + 1}.xhtml`, c }));
  const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:sehari:${esc(id)}</dc:identifier><dc:title>${esc(n.title)}</dc:title><dc:language>id</dc:language><dc:creator>${esc(n.credit)}</dc:creator><meta property="dcterms:modified">${modified}</meta>
</metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="judul" href="judul.xhtml" media-type="application/xhtml+xml"/><item id="gaya" href="gaya.css" media-type="text/css"/>${ch.map((x, i) => `<item id="b${i + 1}" href="${x.file}" media-type="application/xhtml+xml"/>`).join('')}</manifest>
<spine><itemref idref="judul"/>${ch.map((_, i) => `<itemref idref="b${i + 1}"/>`).join('')}</spine>
</package>`;
  const nav = xhtml('Daftar isi', `<nav epub:type="toc"><h1>Daftar isi</h1><ol>${ch.map((x) => `<li><a href="${x.file}">${esc(x.c.heading)}</a></li>`).join('')}</ol></nav>`);
  return zip([
    { name: 'mimetype', data: 'application/epub+zip' },
    { name: 'META-INF/container.xml', data: '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>' },
    { name: 'OEBPS/content.opf', data: opf },
    { name: 'OEBPS/nav.xhtml', data: nav },
    { name: 'OEBPS/gaya.css', data: 'body{font-family:serif;line-height:1.6;margin:1em}h1,h2{font-weight:normal}.sub{font-style:italic;color:#555}.judul{text-align:center;margin-top:30%}p{margin:0 0 .8em;text-indent:0}' },
    { name: 'OEBPS/judul.xhtml', data: xhtml(n.title, `<section class="judul"><h1>${esc(n.title)}</h1>${n.subtitle ? `<p class="sub">${esc(n.subtitle)}</p>` : ''}<p>${esc(n.credit)}</p></section>`) },
    ...ch.map((x) => ({ name: `OEBPS/${x.file}`, data: xhtml(x.c.heading, `<h2>${esc(x.c.heading)}</h2>${x.c.sub ? `<p class="sub">${esc(x.c.sub)}</p>` : ''}${paras(x.c.text).map((p) => `<p>${esc(p)}</p>`).join('')}`) })),
  ]);
}

export function toDocx(n: Naskah): Blob {
  const run = (t: string, o: { b?: boolean; i?: boolean; sz?: number } = {}) =>
    `<w:r><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.sz ? `<w:sz w:val="${o.sz}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
  const p = (inner: string, o: { center?: boolean; after?: number; pageBreak?: boolean } = {}) =>
    `<w:p><w:pPr>${o.pageBreak ? '<w:pageBreakBefore/>' : ''}${o.center ? '<w:jc w:val="center"/>' : ''}<w:spacing w:after="${o.after ?? 160}" w:line="360" w:lineRule="auto"/></w:pPr>${inner}</w:p>`;
  const body = [
    p(run(n.title, { sz: 48 }), { center: true, after: 240 }),
    n.subtitle ? p(run(n.subtitle, { i: true }), { center: true }) : '',
    p(run(n.credit), { center: true, after: 480 }),
    ...n.chapters.flatMap((c) => [p(run(c.heading, { b: true, sz: 30 }), { pageBreak: true, after: 120 }), c.sub ? p(run(c.sub, { i: true })) : '', ...paras(c.text).map((x) => p(run(x, { sz: 24 })))]),
  ].join('');
  return zip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>` },
  ]);
}

export function unduh(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const namaBerkas = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'naskah';
