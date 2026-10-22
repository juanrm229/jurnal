import { mkdirSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { startScheduler } from './jobs/scheduler';
import { loadConfig } from './lib/config';
import { createServices } from './services';
import { setFreeAll } from './lib/domain';

const cfg = loadConfig();
if (!cfg.databaseUrl && cfg.dataDir !== 'memory') mkdirSync(cfg.dataDir, { recursive: true });
setFreeAll(cfg.freeAll);
const services = await createServices(cfg);
const app = createApp(services);
const stop = startScheduler(services);

serve({ fetch: app.fetch, port: cfg.port }, (info) => {
  console.log(`🌱 Sehari server di http://localhost:${info.port}`);
  if (cfg.devAuth) console.log('   mode pengembangan: kode masuk ikut dikembalikan di respons /v1/auth/request-code');
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    stop();
    await services.close();
    process.exit(0);
  });
}
