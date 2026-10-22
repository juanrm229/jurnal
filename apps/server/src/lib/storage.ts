import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';
import { eq } from 'drizzle-orm';
import { type Db, schema } from '../db';
import type { Config } from './config';

/** Penyimpanan blob. Isi selalu ciphertext — server tidak bisa melihat foto/suara. */
export interface BlobStore {
  put(key: string, data: Uint8Array, contentType?: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export class LocalBlobStore implements BlobStore {
  constructor(private dir: string) {}
  private file(key: string) {
    if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) throw new Error('kunci blob tidak valid');
    return path.join(this.dir, key);
  }
  async put(key: string, data: Uint8Array) {
    const f = this.file(key);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, data);
  }
  async get(key: string) {
    try {
      return new Uint8Array(await readFile(this.file(key)));
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await rm(this.file(key), { force: true });
  }
}

export class MemoryBlobStore implements BlobStore {
  map = new Map<string, Uint8Array>();
  async put(key: string, data: Uint8Array) {
    this.map.set(key, data);
  }
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

export class S3BlobStore implements BlobStore {
  private client: AwsClient;
  constructor(private cfg: NonNullable<Config['storage']['s3']>) {
    this.client = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, region: cfg.region, service: 's3' });
  }
  private url(key: string) {
    return `${this.cfg.endpoint.replace(/\/$/, '')}/${this.cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  }
  async put(key: string, data: Uint8Array, contentType = 'application/octet-stream') {
    const res = await this.client.fetch(this.url(key), { method: 'PUT', body: data as unknown as BodyInit, headers: { 'content-type': contentType } });
    if (!res.ok) throw new Error(`S3 put gagal: ${res.status}`);
  }
  async get(key: string) {
    const res = await this.client.fetch(this.url(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`S3 get gagal: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  async delete(key: string) {
    await this.client.fetch(this.url(key), { method: 'DELETE' });
  }
}

export class DbBlobStore implements BlobStore {
  constructor(private db: Db) {}
  async put(key: string, data: Uint8Array) {
    await this.db.insert(schema.blobs).values({ key, data }).onConflictDoUpdate({ target: schema.blobs.key, set: { data } });
  }
  async get(key: string) {
    const [row] = await this.db.select().from(schema.blobs).where(eq(schema.blobs.key, key));
    return row?.data ?? null;
  }
  async delete(key: string) {
    await this.db.delete(schema.blobs).where(eq(schema.blobs.key, key));
  }
}

export function createBlobStore(cfg: Config, db?: Db): BlobStore {
  if (cfg.storage.provider === 'db' && db) return new DbBlobStore(db);
  if (cfg.storage.provider === 's3' && cfg.storage.s3) return new S3BlobStore(cfg.storage.s3);
  return new LocalBlobStore(cfg.uploadsDir);
}
