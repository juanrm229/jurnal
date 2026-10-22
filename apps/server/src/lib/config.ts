export interface Config {
  port: number;
  publicUrl: string;
  /** URL aplikasi web (Expo web) untuk tautan undangan & pembayaran. */
  appUrl: string;
  databaseUrl?: string;
  dataDir: string;
  uploadsDir: string;
  /** Rahasia server untuk HMAC (kode, dedupe Kapsul Indonesia). */
  secret: string;
  adminToken?: string;
  email: { provider: 'console' | 'resend' | 'smtp'; resendApiKey?: string; from: string };
  payments: { provider: 'dev' | 'xendit'; xenditSecretKey?: string; xenditCallbackToken?: string };
  storage: { provider: 'local' | 's3' | 'db'; s3?: { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; region: string } };
  push: { expoAccessToken?: string; enabled: boolean };
  anthropic: { apiKey?: string; model: string };
  devAuth: boolean;
  /** Semua fitur Plus terbuka untuk semua orang (pemakaian pribadi). */
  freeAll: boolean;
  smtp?: { host: string; port: number; user: string; pass: string };
  /** Folder build web app (apps/web/dist) yang disajikan di "/". */
  webDist?: string;
  vapid?: { publicKey: string; privateKey: string; subject: string };
  /** Token untuk pemicu cron dari luar (mis. cron-job.org) — juga menjaga server tetap bangun. */
  cronToken?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 8787);
  return {
    port,
    publicUrl: env.PUBLIC_URL ?? `http://localhost:${port}`,
    appUrl: env.APP_URL ?? 'http://localhost:8081',
    databaseUrl: env.DATABASE_URL || undefined,
    dataDir: env.DATA_DIR ?? './data/pglite',
    uploadsDir: env.UPLOADS_DIR ?? './uploads',
    secret: env.SERVER_SECRET ?? 'dev-secret-ganti-di-produksi',
    adminToken: env.ADMIN_TOKEN || undefined,
    email: {
      provider: env.SMTP_HOST ? 'smtp' : env.RESEND_API_KEY ? 'resend' : 'console',
      resendApiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM ?? 'Sehari <halo@sehari.app>',
    },
    payments: {
      provider: env.XENDIT_SECRET_KEY ? 'xendit' : 'dev',
      xenditSecretKey: env.XENDIT_SECRET_KEY,
      xenditCallbackToken: env.XENDIT_CALLBACK_TOKEN,
    },
    storage: env.BLOB_STORE === 'db'
      ? { provider: 'db' }
      : env.S3_BUCKET
      ? {
          provider: 's3',
          s3: {
            endpoint: env.S3_ENDPOINT ?? 'https://s3.amazonaws.com',
            bucket: env.S3_BUCKET,
            accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
            region: env.S3_REGION ?? 'ap-southeast-3',
          },
        }
      : { provider: 'local' },
    push: { expoAccessToken: env.EXPO_ACCESS_TOKEN, enabled: env.PUSH_DISABLED !== '1' },
    anthropic: { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL ?? 'claude-opus-5-5' },
    devAuth: env.NODE_ENV !== 'production' && env.DEV_AUTH !== '0',
    freeAll: env.FREE_ALL === '1',
    smtp: env.SMTP_HOST ? { host: env.SMTP_HOST, port: Number(env.SMTP_PORT ?? 465), user: env.SMTP_USER ?? '', pass: env.SMTP_PASS ?? '' } : undefined,
    webDist: env.WEB_DIST || undefined,
    vapid: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT ?? 'mailto:halo@sehari.app' } : undefined,
    cronToken: env.CRON_TOKEN || undefined,
  };
}
