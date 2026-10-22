import type { Services } from './context';
import { openDb } from './db';
import type { Config } from './lib/config';
import { createMailer } from './lib/email';
import { createPayments } from './lib/payments';
import { createPusher } from './lib/push';
import { createBlobStore } from './lib/storage';

export async function createServices(cfg: Config, overrides: Partial<Services> = {}): Promise<Services & { close: () => Promise<void> }> {
  const { db, close } = overrides.db
    ? { db: overrides.db, close: async () => {} }
    : await openDb({ url: cfg.databaseUrl, dataDir: cfg.dataDir === 'memory' ? undefined : cfg.dataDir });
  return {
    db,
    cfg,
    blobs: overrides.blobs ?? createBlobStore(cfg, db),
    mailer: overrides.mailer ?? createMailer(cfg),
    pusher: overrides.pusher ?? createPusher(cfg),
    payments: overrides.payments ?? createPayments(cfg),
    now: overrides.now ?? (() => new Date()),
    close,
  };
}
