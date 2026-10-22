import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const ALPHA = '0123456789abcdefghijkmnpqrstuvwxyz';

/** id acak 20 karakter, aman untuk URL. */
export function newId(len = 20): string {
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHA[bytes[i]! % ALPHA.length];
  return s;
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function hmacHex(secret: string, s: string): string {
  return createHmac('sha256', secret).update(s).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function giftCode(): string {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += A[b[i]! % A.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export function randomUnit(): number {
  return randomInt(0, 1_000_000) / 1_000_000;
}
