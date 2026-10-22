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
  email: { provider: 'console' | 'resend'; resendApiKey?: string; from: string };
  payments: { provider: 'dev' | 'xendit'; xenditSecretKey?: string; xenditCallbackToken?: string };
  storage: { provider: 'local' | 's3'; s3?: { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; region: string } };
  push: { expoAccessToken?: string; enabled: boolean };
  anthropic: { apiKey?: string; model: string };
  devAuth: boolean;
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
      provider: env.RESEND_API_KEY ? 'resend' : 'console',
      resendApiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM ?? 'Sehari <halo@sehari.app>',
    },
    payments: {
      provider: env.XENDIT_SECRET_KEY ? 'xendit' : 'dev',
      xenditSecretKey: env.XENDIT_SECRET_KEY,
      xenditCallbackToken: env.XENDIT_CALLBACK_TOKEN,
    },
    storage: env.S3_BUCKET
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
  };
}
