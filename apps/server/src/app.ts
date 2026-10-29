import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import type { AppEnv, Services } from './context';
import { ApiError } from './lib/errors';
import { adminRoutes } from './routes/admin';
import { aiRoutes } from './routes/ai';
import { authRoutes, requireAuth } from './routes/auth';
import { billingRoutes, webhookRoutes } from './routes/billing';
import { circleRoutes, inviteRoutes } from './routes/circles';
import { communityRoutes } from './routes/community';
import { dayRoutes } from './routes/days';
import { letterRoutes } from './routes/letters';
import { loreRoutes } from './routes/lore';
import { meRoutes, userRoutes } from './routes/me';
import { workRoutes } from './routes/works';
import { meetRoutes } from './routes/meets';
import { boardRoutes } from './routes/board';
import { boothRoutes } from './routes/booths';
import { sidikRoutes } from './routes/sidik';
import { satuRoutes } from './routes/satu';
import { suratRoutes } from './routes/surat';
import { dreamRoutes } from './routes/dreams';
import { webRoutes } from './web/pages';

export function createApp(s: Services) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(s);

  app.use('/v1/*', cors({ origin: (o) => o ?? '*', allowHeaders: ['authorization', 'content-type', 'x-sidik-guest'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message } }, err.status);
    if (err instanceof ZodError) return c.json({ error: { code: 'invalid_body', message: err.message } }, 400);
    console.error(err);
    return c.json({ error: { code: 'internal', message: 'Ada yang salah di sisi kami. Coba lagi sebentar lagi.' } }, 500);
  });

  const v1 = new Hono<AppEnv>();
  v1.get('/config', (c) => c.json({ freeAll: s.cfg.freeAll, devAuth: s.cfg.devAuth, vapidPublicKey: s.cfg.vapid?.publicKey ?? null }));
  v1.route('/auth', authRoutes(s));
  v1.get('/avatars/:id', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-z0-9]{6,32}$/i.test(id)) return c.notFound();
    const data = await s.blobs.get(`avatar/${id}`);
    if (!data) return c.notFound();
    const sig = data.subarray(0, 4);
    const type = sig[0] === 0x89 ? 'image/png' : sig[0] === 0x52 ? 'image/webp' : 'image/jpeg';
    return c.body(data as never, 200, { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable' });
  });
  v1.route('/invites', inviteRoutes(s, auth));
  v1.route('/billing/webhook', webhookRoutes(s) as never);
  // SIDIK boleh dimainkan tamu tanpa akun, jadi tidak di belakang auth.
  v1.route('/sidik', sidikRoutes(s));
  v1.route('/titip', suratRoutes(s));
  v1.route('/satu', satuRoutes(s));

  const authed = new Hono<AppEnv>();
  authed.use('*', auth);
  authed.route('/me', meRoutes(s));
  authed.route('/users', userRoutes(s));
  authed.route('/circles', circleRoutes(s));
  authed.route('/circles', loreRoutes(s));
  authed.route('/circles', aiRoutes(s));
  authed.route('/letters', letterRoutes(s));
  authed.route('/billing', billingRoutes(s));
  authed.route('/', dayRoutes(s));
  authed.route('/', communityRoutes(s));
  authed.route('/', workRoutes(s));
  authed.route('/', meetRoutes(s));
  authed.route('/', dreamRoutes(s));
  authed.route('/', boardRoutes(s));
  authed.route('/', boothRoutes(s));
  v1.route('/', authed);

  app.route('/v1', v1);
  app.route('/admin', adminRoutes(s) as never);
  app.route('/', webRoutes(s) as never);

  // Web app (PWA) disajikan dari server yang sama: satu alamat, tanpa CORS.
  if (s.cfg.webDist) {
    const root = s.cfg.webDist;
    app.use('/*', serveStatic({ root, onFound: (path, c) => {
      c.header('cache-control', /\/assets\//.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
    } }));
    app.get('*', async (c, next) => {
      if (c.req.path.startsWith('/v1/') || c.req.path.startsWith('/admin')) return next();
      const html = await readFile(path.join(root, 'index.html'), 'utf8').catch(() => null);
      return html ? c.html(html) : next();
    });
  }
  return app;
}
