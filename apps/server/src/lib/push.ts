import type { Config } from './config';

export interface PushMessage {
  to: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Notifikasi lewat Expo Push. Isinya tidak pernah memuat isi jurnal — hanya
 * kabar ringan seperti "Naya sudah menyegel harinya".
 */
export interface Pusher {
  send(messages: PushMessage[]): Promise<void>;
}

export class ExpoPusher implements Pusher {
  constructor(private accessToken?: string) {}
  async send(messages: PushMessage[]) {
    const valid = messages.filter((m) => m.to.startsWith('ExponentPushToken') || m.to.startsWith('ExpoPushToken'));
    for (let i = 0; i < valid.length; i += 100) {
      const chunk = valid.slice(i, i + 100).map((m) => ({ ...m, sound: 'default' }));
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
          },
          body: JSON.stringify(chunk),
        });
      } catch (e) {
        console.warn('push gagal', e);
      }
    }
  }
}

export class MemoryPusher implements Pusher {
  sent: PushMessage[] = [];
  async send(messages: PushMessage[]) {
    this.sent.push(...messages);
  }
}

/**
 * Web Push (PWA). Langganan browser disimpan sebagai JSON di kolom push_token
 * dengan awalan "webpush:". Isi notifikasi tetap kabar ringan, tanpa isi jurnal.
 */
export class CompositePusher implements Pusher {
  private webpush?: Promise<typeof import('web-push')>;
  constructor(private expo: Pusher, vapid?: NonNullable<Config['vapid']>) {
    if (vapid) {
      this.webpush = import('web-push').then((m) => {
        const wp = (m as unknown as { default?: typeof import('web-push') }).default ?? m;
        wp.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
        return wp;
      });
    }
  }
  async send(messages: PushMessage[]) {
    const web = messages.filter((m) => m.to.startsWith('webpush:'));
    await this.expo.send(messages.filter((m) => !m.to.startsWith('webpush:')));
    if (!this.webpush || !web.length) return;
    const wp = await this.webpush;
    await Promise.all(
      web.map((m) =>
        wp
          .sendNotification(JSON.parse(m.to.slice(8)), JSON.stringify({ title: m.title ?? 'Sehari', body: m.body, data: m.data ?? {} }), { TTL: 60 * 60 * 24 })
          .catch(() => {}),
      ),
    );
  }
}

export function createPusher(cfg: Config): Pusher {
  const expo = cfg.push.enabled ? new ExpoPusher(cfg.push.expoAccessToken) : new MemoryPusher();
  return cfg.vapid ? new CompositePusher(expo, cfg.vapid) : expo;
}
