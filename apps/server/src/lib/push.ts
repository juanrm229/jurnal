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

export function createPusher(cfg: Config): Pusher {
  return cfg.push.enabled ? new ExpoPusher(cfg.push.expoAccessToken) : new MemoryPusher();
}
