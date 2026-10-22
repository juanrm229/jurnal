import { DECKS } from './content';
import { PRODUCTS, type Product } from './plans';

/** Produk lengkap: paket, buku, momen, ditambah dek kartu tematik berbayar. */
export function catalog(): Product[] {
  const decks: Product[] = DECKS.filter((d) => d.priceIdr > 0).map((d) => ({
    code: `deck_${d.id}` as const,
    name: d.name,
    description: d.description,
    priceIdr: d.priceIdr,
    kind: 'deck' as const,
  }));
  return [...PRODUCTS, ...decks];
}

export function findProduct(code: string): Product | undefined {
  return catalog().find((p) => p.code === code);
}
