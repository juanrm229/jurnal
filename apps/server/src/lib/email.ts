import type { Config } from './config';

export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  sent: { to: string; subject: string; text: string }[] = [];
  async send(to: string, subject: string, text: string) {
    this.sent.push({ to, subject, text });
    if (process.env.NODE_ENV !== 'test') console.log(`\n✉️  ke ${to}: ${subject}\n${text}\n`);
  }
}

export class ResendMailer implements Mailer {
  constructor(private apiKey: string, private from: string) {}
  async send(to: string, subject: string, text: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: this.from, to, subject, text }),
    });
    if (!res.ok) throw new Error(`Gagal mengirim email: ${res.status}`);
  }
}

/** Brevo (HTTP API): gratis 300 email/hari, cukup verifikasi satu alamat pengirim — tanpa domain sendiri. */
export class BrevoMailer implements Mailer {
  private sender: { name: string; email: string };
  constructor(private apiKey: string, from: string) {
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
    this.sender = m ? { name: m[1] || 'Sehari', email: m[2]! } : { name: 'Sehari', email: from.trim() };
  }
  async send(to: string, subject: string, text: string) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': this.apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: this.sender, to: [{ email: to }], subject, textContent: text }),
    });
    if (!res.ok) throw new Error(`Gagal mengirim email: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

/** SMTP biasa — mis. Gmail dengan App Password (gratis, ±500 email/hari). */
export class SmtpMailer implements Mailer {
  private transport: Promise<import('nodemailer').Transporter>;
  constructor(smtp: NonNullable<Config['smtp']>, private from: string) {
    this.transport = import('nodemailer').then((m) =>
      m.default.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } }),
    );
  }
  async send(to: string, subject: string, text: string) {
    await (await this.transport).sendMail({ from: this.from, to, subject, text });
  }
}

export function createMailer(cfg: Config): Mailer {
  if (cfg.email.provider === 'brevo' && cfg.email.brevoApiKey) return new BrevoMailer(cfg.email.brevoApiKey, cfg.email.from);
  if (cfg.email.provider === 'smtp' && cfg.smtp) return new SmtpMailer(cfg.smtp, cfg.email.from);
  return cfg.email.provider === 'resend' && cfg.email.resendApiKey
    ? new ResendMailer(cfg.email.resendApiKey, cfg.email.from)
    : new ConsoleMailer();
}
