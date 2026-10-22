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
import { webRoutes } from './web/pages';

export function createApp(s: Services) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(s);

  app.use('/v1/*', cors({ origin: (o) => o ?? '*', allowHeaders: ['authorization', 'content-type'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message } }, err.status);
    if (err instanceof ZodError) return c.json({ error: { code: 'invalid_body', message: err.message } }, 400);
    console.error(err);
    return c.json({ error: { code: 'internal', message: 'Ada yang salah di sisi kami. Coba lagi sebentar lagi.' } }, 500);
  });

  const v1 = new Hono<AppEnv>();
  v1.route('/auth', authRoutes(s));
  v1.route('/invites', inviteRoutes(s, auth));
  v1.route('/billing/webhook', webhookRoutes(s) as never);

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
  v1.route('/', authed);

  app.route('/v1', v1);
  app.route('/admin', adminRoutes(s) as never);
  app.route('/', webRoutes(s) as never);
  return app;
}
