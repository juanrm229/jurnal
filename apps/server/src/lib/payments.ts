import type { Config } from './config';
import { safeEqual } from './ids';

export interface CreatePaymentInput {
  orderId: string;
  amountIdr: number;
  description: string;
  email: string;
  method: 'qris' | 'ewallet' | 'va' | 'card';
  successUrl: string;
  failureUrl: string;
}

export interface PaymentEvent {
  orderId: string;
  status: 'paid' | 'expired' | 'failed';
  providerRef?: string;
}

/**
 * Pembayaran lewat web (QRIS, e-wallet, VA) supaya margin tidak terpotong
 * komisi toko aplikasi.
 */
export interface PaymentProvider {
  name: string;
  create(input: CreatePaymentInput): Promise<{ paymentUrl: string; providerRef: string }>;
  /** Verifikasi & terjemahkan webhook. Mengembalikan null bila tidak valid. */
  parseWebhook(headers: Headers, body: unknown): PaymentEvent | null;
}

/** Untuk pengembangan: halaman bayar tiruan di server sendiri. */
export class DevPayments implements PaymentProvider {
  name = 'dev';
  constructor(private publicUrl: string, private secret: string) {}
  async create(input: CreatePaymentInput) {
    return {
      paymentUrl: `${this.publicUrl}/dev/pay/${input.orderId}`,
      providerRef: `dev_${input.orderId}`,
    };
  }
  parseWebhook(headers: Headers, body: unknown): PaymentEvent | null {
    if (!safeEqual(headers.get('x-dev-signature') ?? '', this.secret)) return null;
    const b = body as { orderId?: string; status?: string };
    if (!b.orderId || (b.status !== 'paid' && b.status !== 'expired' && b.status !== 'failed')) return null;
    return { orderId: b.orderId, status: b.status };
  }
}

/** Xendit Invoice API — mendukung QRIS, OVO, DANA, ShopeePay, GoPay (via QRIS), VA. */
export class XenditPayments implements PaymentProvider {
  name = 'xendit';
  constructor(private secretKey: string, private callbackToken: string) {}
  async create(input: CreatePaymentInput) {
    const methods: Record<CreatePaymentInput['method'], string[]> = {
      qris: ['QRIS'],
      ewallet: ['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'],
      va: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'BSI'],
      card: ['CREDIT_CARD'],
    };
    const res = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        authorization: 'Basic ' + Buffer.from(`${this.secretKey}:`).toString('base64'),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        external_id: input.orderId,
        amount: input.amountIdr,
        description: input.description,
        payer_email: input.email,
        currency: 'IDR',
        payment_methods: methods[input.method],
        success_redirect_url: input.successUrl,
        failure_redirect_url: input.failureUrl,
        invoice_duration: 60 * 60 * 24,
      }),
    });
    if (!res.ok) throw new Error(`Xendit menolak: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id: string; invoice_url: string };
    return { paymentUrl: data.invoice_url, providerRef: data.id };
  }
  parseWebhook(headers: Headers, body: unknown): PaymentEvent | null {
    if (!safeEqual(headers.get('x-callback-token') ?? '', this.callbackToken)) return null;
    const b = body as { external_id?: string; status?: string; id?: string };
    if (!b.external_id) return null;
    const status = b.status === 'PAID' || b.status === 'SETTLED' ? 'paid' : b.status === 'EXPIRED' ? 'expired' : null;
    if (!status) return null;
    return { orderId: b.external_id, status, providerRef: b.id };
  }
}

export function createPayments(cfg: Config): PaymentProvider {
  if (cfg.payments.provider === 'xendit' && cfg.payments.xenditSecretKey && cfg.payments.xenditCallbackToken) {
    return new XenditPayments(cfg.payments.xenditSecretKey, cfg.payments.xenditCallbackToken);
  }
  return new DevPayments(cfg.publicUrl, cfg.secret);
}
