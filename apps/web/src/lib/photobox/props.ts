/**
 * Aksesori photobox: stiker emoji (kacamata, mahkota, kumis…) yang kamu taruh
 * sendiri di layar kamera, lalu ikut tercetak di setiap jepretan.
 * Posisi dalam satuan relatif (0–1) terhadap bingkai foto yang terlihat.
 */
export interface Prop {
  id: string;
  e: string;
  x: number;
  y: number;
  /** Ukuran relatif terhadap lebar bingkai. */
  s: number;
  rot: number;
}

export const PROP_SET = ['🕶️', '👑', '🎀', '🧢', '🥸', '🎩', '🌸', '💖', '⭐', '✨', '🦋', '🐱', '🍓', '🔥', '🌈', '💋', '🎧', '🫧'];

export function drawProps(ctx: CanvasRenderingContext2D, w: number, h: number, props: Prop[] | undefined) {
  if (!props?.length) return;
  for (const p of props) {
    const px = p.s * w;
    ctx.save();
    ctx.translate(p.x * w, p.y * h);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.font = `${Math.round(px)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = px * 0.08;
    ctx.fillText(p.e, 0, 0);
    ctx.restore();
  }
}
