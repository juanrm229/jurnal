/**
 * Pembayaran lewat web (QRIS, e-wallet, VA). Tiga sumber uang yang tidak
 * merusak kepercayaan: langganan, benda fisik dari kenangan, dan acara.
 */
import { catalog, checkoutBody, type CheckoutResult, findProduct, type OrderWire, redeemBody } from '@sehari/core';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { getUser, membership, requireMember } from '../lib/domain';
import { ApiError, bad, conflict, forbidden, notFound } from '../lib/errors';
import { giftCode, newId } from '../lib/ids';

const { orders, entitlements, giftCodes, bookOrders, users, circles } = schema;

export async function ordersFor(s: Services, userId: string): Promise<OrderWire[]> {
  const rows = await s.db.select().from(orders).where(eq(orders.userId, userId));
  const gifts = await s.db.select().from(giftCodes).where(eq(giftCodes.purchaserId, userId));
  const books = await s.db.select().from(bookOrders);
  return rows
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((o) => ({
      id: o.id,
      product: o.product,
      amountIdr: o.amountIdr,
      status: o.status as OrderWire['status'],
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      giftCode: gifts.find((g) => g.orderId === o.id)?.code ?? null,
      bookStatus: (books.find((b) => b.orderId === o.id)?.status as OrderWire['bookStatus']) ?? null,
    }));
}

async function extendPlan(s: Services, userId: string, plan: string, days: number) {
  const user = await getUser(s, userId);
  const now = s.now();
  const base = user.planUntil && user.planUntil > now && user.plan === plan ? user.planUntil : now;
  await s.db
    .update(users)
    .set({ plan, planUntil: new Date(base.getTime() + days * 86_400_000) })
    .where(eq(users.id, userId));
}

/** Idempoten: webhook bisa datang lebih dari sekali. */
export async function fulfillOrder(s: Services, orderId: string, providerRef?: string): Promise<void> {
  const [order] = await s.db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.status === 'paid') return;
  const [claimed] = await s.db
    .update(orders)
    .set({ status: 'paid', paidAt: s.now(), providerRef: providerRef ?? order.providerRef })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')))
    .returning();
  if (!claimed) return;
  const product = findProduct(order.product);
  if (!product) return;
  const meta = order.meta as { circleId?: string; year?: number; partnerUserId?: string; shipping?: unknown; tier?: string };
  switch (product.kind) {
    case 'subscription':
      await extendPlan(s, order.userId, product.plan!, product.days!);
      if (product.plan === 'plus_duo' && meta.partnerUserId) await extendPlan(s, meta.partnerUserId, 'plus_duo', product.days!);
      break;
    case 'gift':
      await s.db.insert(giftCodes).values({ code: giftCode(), product: product.code, purchaserId: order.userId, orderId: order.id });
      break;
    case 'book':
      await s.db
        .insert(bookOrders)
        .values({ orderId: order.id, circleId: meta.circleId!, year: meta.year!, shipping: meta.shipping ?? {} })
        .onConflictDoNothing();
      break;
    case 'moment':
      if (meta.circleId) await s.db.update(circles).set({ momentTier: product.code.replace('moment_', '') }).where(eq(circles.id, meta.circleId));
      break;
    case 'deck':
      await s.db.insert(entitlements).values({ userId: order.userId, code: product.code, orderId: order.id }).onConflictDoNothing();
      break;
  }
}

export function billingRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/products', (c) => c.json(catalog()));
  r.get('/orders', async (c) => c.json(await ordersFor(s, c.get('user').id)));

  r.post('/checkout', async (c) => {
    const input = await body(c, checkoutBody);
    const user = c.get('user');
    const product = findProduct(input.product);
    if (!product) throw notFound('Produk tidak ditemukan.');
    const meta: Record<string, unknown> = {};
    if (product.kind === 'book') {
      if (!input.circleId || !input.year || !input.shipping) throw bad('book_details', 'Buku butuh lingkaran, tahun, dan alamat.');
      await requireMember(s, input.circleId, user.id);
      Object.assign(meta, { circleId: input.circleId, year: input.year, shipping: input.shipping });
    }
    if (product.kind === 'moment') {
      if (!input.circleId) throw bad('moment_circle', 'Pilih Kapsul Momen yang akan ditingkatkan.');
      const { circle } = await requireMember(s, input.circleId, user.id);
      if (circle.kind !== 'moment') throw bad('not_moment', 'Ini bukan Kapsul Momen.');
      meta.circleId = circle.id;
    }
    if (product.kind === 'deck') {
      const [owned] = await s.db.select().from(entitlements).where(and(eq(entitlements.userId, user.id), eq(entitlements.code, product.code)));
      if (owned) throw conflict('owned', 'Dek ini sudah kamu miliki.');
    }
    if (product.plan === 'plus_duo' && product.kind === 'subscription' && input.partnerUserId) {
      // Pasangan harus berada di Duo yang sama.
      const duo = await s.db
        .select({ c: circles })
        .from(schema.circleMembers)
        .innerJoin(circles, eq(circles.id, schema.circleMembers.circleId))
        .where(and(eq(schema.circleMembers.userId, user.id), eq(schema.circleMembers.state, 'active'), eq(circles.kind, 'duo')));
      let ok = false;
      for (const { c: circle } of duo) if ((await membership(s, circle.id, input.partnerUserId))?.state === 'active') ok = true;
      if (!ok) throw forbidden('Plus Duo untuk dua orang di Duo yang sama.');
      meta.partnerUserId = input.partnerUserId;
    }
    const id = newId();
    const pay = await s.payments.create({
      orderId: id,
      amountIdr: product.priceIdr,
      description: product.name,
      email: user.email,
      method: input.method,
      successUrl: `${s.cfg.appUrl}/aku/pesanan?status=berhasil&order=${id}`,
      failureUrl: `${s.cfg.appUrl}/aku/pesanan?status=gagal&order=${id}`,
    });
    await s.db.insert(orders).values({
      id,
      userId: user.id,
      product: product.code,
      amountIdr: product.priceIdr,
      provider: s.payments.name,
      providerRef: pay.providerRef,
      paymentUrl: pay.paymentUrl,
      meta,
    });
    const out: CheckoutResult = { orderId: id, paymentUrl: pay.paymentUrl, status: 'pending' };
    return c.json(out, 201);
  });

  r.post('/redeem', async (c) => {
    const input = await body(c, redeemBody);
    const user = c.get('user');
    const code = input.code.trim().toUpperCase();
    const [g] = await s.db.select().from(giftCodes).where(eq(giftCodes.code, code));
    if (!g) throw notFound('Kode hadiah tidak ditemukan.');
    if (g.redeemedBy) throw new ApiError(410, 'redeemed', 'Kode ini sudah dipakai.');
    const product = findProduct(g.product);
    if (!product?.plan || !product.days) throw bad('gift', 'Kode tidak valid.');
    await s.db.update(giftCodes).set({ redeemedBy: user.id, redeemedAt: s.now() }).where(eq(giftCodes.code, code));
    await extendPlan(s, user.id, product.plan, product.days);
    return c.json({ ok: true, plan: product.plan });
  });

  /**
   * Berkas cetak buku dibuat di perangkat (isi didekripsi di sana) lalu dikirim
   * ke percetakan dengan persetujuan eksplisit — bagian ini memang tidak E2EE.
   */
  r.post('/orders/:id/book-file', async (c) => {
    const user = c.get('user');
    if (c.req.query('consent') !== '1') throw bad('consent', 'Butuh persetujuan bahwa isi buku akan dibaca percetakan.');
    const [o] = await s.db.select().from(orders).where(and(eq(orders.id, c.req.param('id')), eq(orders.userId, user.id)));
    if (!o || o.status !== 'paid') throw notFound('Pesanan belum dibayar.');
    const [b] = await s.db.select().from(bookOrders).where(eq(bookOrders.orderId, o.id));
    if (!b) throw notFound();
    const buf = new Uint8Array(await c.req.arrayBuffer());
    if (buf.length < 100 || buf.length > 200 * 1024 * 1024) throw bad('file', 'Berkas PDF tidak valid.');
    const key = `print/${o.id}.pdf`;
    await s.blobs.put(key, buf, 'application/pdf');
    await s.db.update(bookOrders).set({ fileKey: key, status: 'printing', consentAt: s.now() }).where(eq(bookOrders.orderId, o.id));
    return c.json({ ok: true });
  });

  return r;
}

/** Webhook tanpa auth sesi — diverifikasi oleh penyedia pembayaran. */
export function webhookRoutes(s: Services) {
  const r = new Hono();
  r.post('/:provider', async (c) => {
    const ev = s.payments.parseWebhook(c.req.raw.headers, await c.req.json().catch(() => null));
    if (!ev) return c.json({ ok: false }, 401);
    if (ev.status === 'paid') await fulfillOrder(s, ev.orderId, ev.providerRef);
    else await s.db.update(orders).set({ status: ev.status }).where(and(eq(orders.id, ev.orderId), eq(orders.status, 'pending')));
    return c.json({ ok: true });
  });
  return r;
}
