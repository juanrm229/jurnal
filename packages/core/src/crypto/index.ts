/**
 * Lapisan enkripsi end-to-end Sehari.
 *
 * Prinsip: "cloud mengatur lalu lintas, perangkat memahami isi". Server hanya
 * menyimpan ciphertext, daftar penerima, dan status segel.
 *
 * Primitif (tidak menulis kriptografi sendiri):
 * - X25519 + XSalsa20-Poly1305 (`nacl.box`) untuk mengirim kunci ke satu orang.
 *   Bentuknya mengikuti pola "sealed box": kunci publik efemeral | nonce | box.
 * - XSalsa20-Poly1305 (`nacl.secretbox`) untuk isi Drop, media, dan kunci lingkaran.
 * - scrypt (@noble/hashes) untuk menurunkan kunci cadangan dari kode pemulihan.
 *
 * Model kunci:
 * - Tiap akun punya satu identitas (pasangan kunci box). Kunci rahasianya hanya
 *   ada di perangkat, plus cadangan terenkripsi dengan kode pemulihan.
 * - Tiap lingkaran punya kunci simetris per "epoch". Saat anggota keluar,
 *   anggota yang tersisa memutar epoch baru; Drop baru memakai epoch terbaru.
 * - Tiap Drop dienkripsi dengan kunci acak (DEK). DEK dibungkus untuk tiap
 *   penerima: diri sendiri, satu anggota, atau satu/lebih lingkaran.
 */
import nacl from 'tweetnacl';
import { scrypt } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  concatBytes,
  fromBase64,
  toBase64,
  toBase64Url,
  toHex,
  utf8Decode,
  utf8Encode,
} from './encoding';

export * from './encoding';

export interface Identity {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/** Untuk React Native: arahkan PRNG ke expo-crypto sebelum fungsi lain dipanggil. */
export function setRandomSource(fill: (out: Uint8Array) => void): void {
  nacl.setPRNG((x, n) => {
    const buf = new Uint8Array(n);
    fill(buf);
    for (let i = 0; i < n; i++) x[i] = buf[i]!;
  });
}

export function randomBytes(n: number): Uint8Array {
  return nacl.randomBytes(n);
}

export function generateIdentity(): Identity {
  const kp = nacl.box.keyPair();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function identityFromSecret(secretKey: Uint8Array): Identity {
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function newSymmetricKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

// ── Simetris ────────────────────────────────────────────────────────────────

/** Hasil: nonce(24) | ciphertext. */
export function encryptBytes(key: Uint8Array, plain: Uint8Array): Uint8Array {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  return concatBytes(nonce, nacl.secretbox(plain, nonce, key));
}

export function decryptBytes(key: Uint8Array, data: Uint8Array): Uint8Array {
  const nonce = data.subarray(0, nacl.secretbox.nonceLength);
  const ct = data.subarray(nacl.secretbox.nonceLength);
  const out = nacl.secretbox.open(ct, nonce, key);
  if (!out) throw new DecryptError();
  return out;
}

export function encryptJson(key: Uint8Array, value: unknown): string {
  return toBase64(encryptBytes(key, utf8Encode(JSON.stringify(value))));
}

export function decryptJson<T>(key: Uint8Array, b64: string): T {
  return JSON.parse(utf8Decode(decryptBytes(key, fromBase64(b64)))) as T;
}

export function encryptText(key: Uint8Array, text: string): string {
  return toBase64(encryptBytes(key, utf8Encode(text)));
}

export function decryptText(key: Uint8Array, b64: string): string {
  return utf8Decode(decryptBytes(key, fromBase64(b64)));
}

// ── Ke satu orang (sealed box) ──────────────────────────────────────────────

/** Hasil: ephemeralPk(32) | nonce(24) | box. */
export function sealTo(recipientPublicKey: Uint8Array, plain: Uint8Array): Uint8Array {
  const eph = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const boxed = nacl.box(plain, nonce, recipientPublicKey, eph.secretKey);
  return concatBytes(eph.publicKey, nonce, boxed);
}

export function openSealed(identity: Identity, data: Uint8Array): Uint8Array {
  const ephPk = data.subarray(0, 32);
  const nonce = data.subarray(32, 32 + nacl.box.nonceLength);
  const boxed = data.subarray(32 + nacl.box.nonceLength);
  const out = nacl.box.open(boxed, nonce, ephPk, identity.secretKey);
  if (!out) throw new DecryptError();
  return out;
}

export class DecryptError extends Error {
  constructor() {
    super('Tidak bisa membuka isi ini dengan kunci yang ada.');
    this.name = 'DecryptError';
  }
}

// ── Amplop Drop ─────────────────────────────────────────────────────────────

export type RecipientSpec =
  | { t: 'user'; userId: string; publicKey: Uint8Array }
  | { t: 'circle'; circleId: string; epoch: number; key: Uint8Array };

export type RecipientWire =
  | { t: 'user'; userId: string; wk: string }
  | { t: 'circle'; circleId: string; epoch: number; wk: string };

export interface Keyring {
  userId: string;
  identity: Identity;
  /** Mengembalikan kunci lingkaran untuk epoch tertentu, bila dimiliki. */
  circleKey(circleId: string, epoch: number): Uint8Array | undefined;
}

export interface Envelope {
  ciphertext: string;
  recipients: RecipientWire[];
}

export function wrapKeyFor(spec: RecipientSpec, dek: Uint8Array): RecipientWire {
  if (spec.t === 'user') {
    return { t: 'user', userId: spec.userId, wk: toBase64(sealTo(spec.publicKey, dek)) };
  }
  return { t: 'circle', circleId: spec.circleId, epoch: spec.epoch, wk: toBase64(encryptBytes(spec.key, dek)) };
}

export function sealEnvelope(value: unknown, recipients: RecipientSpec[]): Envelope & { dek: Uint8Array } {
  if (recipients.length === 0) throw new Error('Amplop butuh minimal satu penerima.');
  const dek = newSymmetricKey();
  return {
    dek,
    ciphertext: encryptJson(dek, value),
    recipients: recipients.map((r) => wrapKeyFor(r, dek)),
  };
}

export function unwrapEnvelopeKey(recipients: RecipientWire[], ring: Keyring): Uint8Array {
  for (const r of recipients) {
    try {
      if (r.t === 'user' && r.userId === ring.userId) {
        return openSealed(ring.identity, fromBase64(r.wk));
      }
      if (r.t === 'circle') {
        const key = ring.circleKey(r.circleId, r.epoch);
        if (key) return decryptBytes(key, fromBase64(r.wk));
      }
    } catch {
      // coba penerima berikutnya
    }
  }
  throw new DecryptError();
}

export function openEnvelope<T>(env: Envelope, ring: Keyring): T {
  return decryptJson<T>(unwrapEnvelopeKey(env.recipients, ring), env.ciphertext);
}

/** Tambahkan penerima baru ke amplop yang sudah ada (mis. kapsul waktu dibagikan ulang). */
export function addRecipient(env: Envelope, ring: Keyring, spec: RecipientSpec): RecipientWire {
  return wrapKeyFor(spec, unwrapEnvelopeKey(env.recipients, ring));
}

// ── Kode pemulihan & cadangan identitas ─────────────────────────────────────

// Crockford base32: tanpa I, L, O, U supaya tidak tertukar saat disalin tangan.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 24 karakter (120 bit), ditulis 6 kelompok: ABCD-EFGH-... */
export function generateRecoveryCode(): string {
  const bytes = nacl.randomBytes(15);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32[(value >> bits) & 31];
    }
  }
  return out.match(/.{4}/g)!.join('-');
}

export function normalizeRecoveryCode(code: string): string {
  const cleaned = code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (cleaned.length !== 24 || [...cleaned].some((c) => !B32.includes(c))) {
    throw new Error('Kode pemulihan harus 24 karakter.');
  }
  return cleaned.match(/.{4}/g)!.join('-');
}

export interface KeyBackup {
  v: 1;
  kdf: 'scrypt';
  salt: string;
  N: number;
  r: number;
  p: number;
  blob: string;
}

const SCRYPT = { N: 2 ** 14, r: 8, p: 1 } as const;

function deriveBackupKey(code: string, salt: Uint8Array, params: { N: number; r: number; p: number }): Uint8Array {
  return scrypt(utf8Encode(normalizeRecoveryCode(code)), salt, { ...params, dkLen: 32 });
}

export function backupIdentity(identity: Identity, recoveryCode: string): KeyBackup {
  const salt = nacl.randomBytes(16);
  const key = deriveBackupKey(recoveryCode, salt, SCRYPT);
  return {
    v: 1,
    kdf: 'scrypt',
    salt: toBase64(salt),
    ...SCRYPT,
    blob: toBase64(encryptBytes(key, identity.secretKey)),
  };
}

export function restoreIdentity(backup: KeyBackup, recoveryCode: string): Identity {
  const key = deriveBackupKey(recoveryCode, fromBase64(backup.salt), backup);
  return identityFromSecret(decryptBytes(key, fromBase64(backup.blob)));
}

// ── Sidik jari kunci (kode keamanan) ────────────────────────────────────────

/**
 * Kode keamanan untuk dibandingkan dua orang secara langsung: sama di kedua HP
 * berarti tidak ada pihak ketiga yang menyisipkan kunci palsu.
 */
export function safetyCode(a: Uint8Array, b: Uint8Array): string {
  const [x, y] = toHex(a) < toHex(b) ? [a, b] : [b, a];
  const digest = sha256(concatBytes(x, y));
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) {
    const n = ((digest[i * 2]! << 8) | digest[i * 2 + 1]!) % 100000;
    groups.push(n.toString().padStart(5, '0'));
  }
  return groups.join(' ');
}

export function fingerprint(publicKey: Uint8Array): string {
  return toHex(sha256(publicKey).subarray(0, 8));
}

// ── Undangan lingkaran ──────────────────────────────────────────────────────

export interface InviteBundle {
  circleId: string;
  keys: { epoch: number; key: string }[];
}

/**
 * Rahasia undangan ditaruh di fragmen URL (#...), yang tidak pernah dikirim
 * browser ke server. Server hanya menyimpan bundel kunci yang terenkripsi.
 */
export function createInviteSecret(): { secret: Uint8Array; fragment: string } {
  const secret = nacl.randomBytes(32);
  return { secret, fragment: toBase64Url(secret) };
}

export function sealInviteBundle(secret: Uint8Array, bundle: InviteBundle): string {
  return encryptJson(secret, bundle);
}

export function openInviteBundle(fragment: string, sealed: string): InviteBundle {
  return decryptJson<InviteBundle>(fromBase64(fragment), sealed);
}

/** Hash rahasia undangan untuk memastikan pemegang tautan benar tanpa membuka isi. */
export function inviteProof(fragment: string): string {
  return toHex(sha256(fromBase64(fragment)));
}

// ── Media ───────────────────────────────────────────────────────────────────

export interface MediaKey {
  key: string;
}

export function encryptMedia(bytes: Uint8Array): { data: Uint8Array; key: string } {
  const key = newSymmetricKey();
  return { data: encryptBytes(key, bytes), key: toBase64(key) };
}

export function decryptMedia(data: Uint8Array, key: string): Uint8Array {
  return decryptBytes(fromBase64(key), data);
}

export const b64 = { encode: toBase64, decode: fromBase64 };
