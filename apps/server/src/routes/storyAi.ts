/**
 * AI cloud untuk Hidup Orang Lain: opt-in, dengan aturan yang sama seperti AI
 * lingkaran. Hanya bagian yang dikirim pengguna saat itu yang diproses; untuk
 * potongan itu janji "server tidak bisa membaca" tidak berlaku, dan aplikasi
 * mengatakannya sebelum tombol ditekan. AI hanya menawarkan; penulis memilih.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { storyAiSummaryBody, storyAiTraceBody, type StoryAiContinuity, type StoryAiSummary, type StoryAiTrace } from '@sehari/core';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { ApiError, forbidden, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rate';

const SummarySchema = z.object({
  kejadian: z.array(z.object({ peristiwa: z.string(), jenis: z.enum(['terjadi', 'diyakini']), tokoh: z.string(), adegan: z.number().int() })),
  sampul: z.string(),
  satuHalaman: z.string(),
});
const TraceSchema = z.object({ usulan: z.array(z.object({ potongan: z.string(), tahu: z.array(z.string()), pertanyaan: z.string() })) });
const ContinuitySchema = z.object({ temuan: z.array(z.object({ masalah: z.string(), adegan: z.array(z.number().int()) })) });

const BASE = `Kamu membantu sekelompok kecil teman menulis satu cerita bersama dalam Bahasa Indonesia. Tiap adegan ditulis orang berbeda dari sudut pandang tokoh berbeda; tiap tokoh hanya tahu sebagian.
Hormati tulisan mereka: jangan menulis ulang prosa, jangan menilai kualitas, jangan menambah kejadian yang tidak ada di teks. Tulis ringkas dan hangat, tanpa emoji.`;

const scenesText = (scenes: { tokoh: string; waktu: string; text: string }[]) => scenes.map((x, i) => `[${i + 1}] ${x.tokoh} · ${x.waktu}\n${x.text.trim()}`).join('\n\n');

export function storyAiRoutes(s: Services) {
  const r = new Hono<AppEnv>();
  const client = s.cfg.anthropic.apiKey ? new Anthropic({ apiKey: s.cfg.anthropic.apiKey }) : null;

  const guard = async (storyId: string, userId: string) => {
    const [st] = await s.db.select().from(schema.stories).where(eq(schema.stories.id, storyId));
    if (!st || !st.members.includes(userId)) throw notFound('Cerita tidak ditemukan.');
    if (st.circleId) {
      const ms = await s.db
        .select({ ok: schema.circleMembers.aiConsent })
        .from(schema.circleMembers)
        .where(and(eq(schema.circleMembers.circleId, st.circleId), eq(schema.circleMembers.state, 'active')));
      if (!ms.length || !ms.every((m) => m.ok)) throw forbidden('AI cloud baru aktif bila semua anggota lingkaran setuju di pengaturan lingkaran.');
    }
    if (!client) throw new ApiError(503, 'ai_unavailable', 'AI cloud belum dikonfigurasi di server ini.');
    await rateLimit(s, `ai:story:${st.id}`, 40, 24 * 3600);
    return st;
  };

  const ask = async <T,>(schemaOut: z.ZodType<T>, system: string, user: string, maxTokens = 3000): Promise<T | null> => {
    try {
      const res = await client!.beta.messages.parse({
        model: s.cfg.anthropic.model,
        max_tokens: maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: betaZodOutputFormat(schemaOut as never) },
        system,
        messages: [{ role: 'user', content: user }],
      });
      if (res.stop_reason === 'refusal' || !res.parsed_output) return null;
      return res.parsed_output as T;
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new ApiError(429, 'ai_busy', 'AI sedang sibuk. Coba lagi sebentar lagi.');
      if (e instanceof Anthropic.APIError) throw new ApiError(503, 'ai_error', 'AI sedang tidak bisa dihubungi.');
      throw e;
    }
  };

  /** Rangkuman kejadian (terjadi vs diyakini) dan dua sinopsis. */
  r.post('/stories/:id/ai/rangkuman', async (c) => {
    await guard(c.req.param('id'), c.get('user').id);
    const input = await body(c, storyAiSummaryBody);
    const out = await ask(
      SummarySchema,
      `${BASE}
Susun rangkuman kejadian berurutan menurut waktu cerita. Pisahkan apa yang benar-benar terjadi (jenis "terjadi") dari apa yang hanya diyakini atau diduga seorang tokoh (jenis "diyakini", isi tokoh dengan nama yang meyakininya). Setiap kejadian merujuk nomor adegan sumbernya. Jangan mengubah dugaan menjadi kepastian; fakta yang disepakati kelompok boleh dianggap terjadi.
Lalu tulis sinopsis sampul tanpa spoiler (maksimal 60 kata) dan sinopsis satu halaman untuk editor (maksimal 220 kata) yang menyebut perbedaan tafsir antartokoh.`,
      `Fakta yang disepakati kelompok:\n${input.facts.map((f) => `- ${f}`).join('\n') || '(belum ada)'}\n\nAdegan:\n${scenesText(input.scenes)}`,
    );
    const res: StoryAiSummary = out ? { kejadian: out.kejadian.slice(0, 40), sampul: out.sampul.slice(0, 600), satuHalaman: out.satuHalaman.slice(0, 2400) } : { kejadian: [], sampul: '', satuHalaman: '' };
    return c.json(res);
  });

  /** Usulan jejak dari naskah yang sedang ditulis: potongan teks persis, siapa yang bisa tahu, dan pertanyaannya. */
  r.post('/stories/:id/ai/jejak', async (c) => {
    await guard(c.req.param('id'), c.get('user').id);
    const input = await body(c, storyAiTraceBody);
    const out = await ask(
      TraceSchema,
      `${BASE}
Dari adegan yang sedang ditulis, usulkan sampai tiga "jejak": satu benda, keputusan, atau kalimat yang bisa diwariskan ke tokoh lain. "potongan" HARUS kutipan persis dari teks (salin kata per kata, 3–15 kata). "tahu" berisi tokoh dari daftar yang secara masuk akal bisa mengetahui jejak itu (bukan tokoh penulis adegan). "pertanyaan" adalah satu pertanyaan konkret untuk penulis tokoh penerima, tanpa menjawabnya.`,
      `Tokoh adegan ini: ${input.tokoh}\nTokoh lain di cerita: ${input.tokohs.join(', ') || '(belum ada)'}\n\nAdegan:\n${input.text}`,
      1500,
    );
    const usulan = (out?.usulan ?? []).filter((u) => input.text.includes(u.potongan)).slice(0, 3).map((u) => ({ potongan: u.potongan, tahu: u.tahu.filter((t) => input.tokohs.includes(t)), pertanyaan: u.pertanyaan.slice(0, 200) }));
    const res: StoryAiTrace = { usulan };
    return c.json(res);
  });

  /** Cek kesinambungan semantik: tokoh tahu terlalu awal, benda di dua tempat, waktu yang bertabrakan. */
  r.post('/stories/:id/ai/kesinambungan', async (c) => {
    await guard(c.req.param('id'), c.get('user').id);
    const input = await body(c, storyAiSummaryBody);
    const out = await ask(
      ContinuitySchema,
      `${BASE}
Periksa kesinambungan antaradegan. Laporkan hanya masalah nyata yang bisa ditunjuk di teks: tokoh mengetahui sesuatu sebelum ia mungkin mengetahuinya, benda yang sama berada di dua tempat pada waktu yang sama, urutan waktu yang bertabrakan, atau adegan yang bertentangan dengan fakta yang disepakati. Untuk tiap masalah, tulis satu kalimat netral dan nomor adegan yang terlibat. Kalau tidak ada masalah, kembalikan daftar kosong. Perbedaan tafsir antartokoh BUKAN masalah.`,
      `Fakta yang disepakati kelompok:\n${input.facts.map((f) => `- ${f}`).join('\n') || '(belum ada)'}\n\nAdegan:\n${scenesText(input.scenes)}`,
    );
    const res: StoryAiContinuity = { temuan: (out?.temuan ?? []).slice(0, 10) };
    return c.json(res);
  });

  return r;
}
