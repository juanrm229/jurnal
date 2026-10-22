/**
 * AI cloud — tingkat privasi 3, opt-in. Aktif hanya bila SEMUA anggota aktif
 * lingkaran setuju, dan hanya memproses potongan yang dipilih pengguna sendiri.
 * Untuk potongan itu, janji "server tidak bisa melihat" tidak berlaku lagi —
 * aplikasi mengatakannya di layar persetujuan.
 *
 * AI hanya menawarkan (judul bab), tidak pernah menyimpulkan kondisi psikologis.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { aiChapterBody, type AiChapterResult, formatMonth } from '@sehari/core';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { ApiError, forbidden } from '../lib/errors';
import { rateLimit } from '../lib/rate';
import { requireMember } from '../lib/domain';

const TitlesSchema = z.object({ titles: z.array(z.string()) });

const SYSTEM = `Kamu membantu sebuah lingkaran kecil (pasangan, sahabat, atau keluarga pilihan) memberi judul bab untuk satu bulan kenangan bersama mereka.
Tulis 4 usulan judul bab dalam Bahasa Indonesia yang hangat, santai, sedikit puitis, dan spesifik pada potongan cerita yang diberikan — seperti judul bab novel slice of life, misalnya "Bulan Banyak Hujan dan Lagu Galau".
Setiap judul maksimal 60 karakter, tanpa tanda kutip dan tanpa emoji.
Jangan menyimpulkan atau menyebut kondisi kesehatan mental, diagnosis, atau masalah hubungan; jangan menghakimi. Kalau potongannya berat, pilih judul yang lembut dan menemani.`;

export function aiRoutes(s: Services) {
  const r = new Hono<AppEnv>();
  const client = s.cfg.anthropic.apiKey ? new Anthropic({ apiKey: s.cfg.anthropic.apiKey }) : null;

  r.post('/:id/ai/chapter-titles', async (c) => {
    const input = await body(c, aiChapterBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const members = await s.db
      .select()
      .from(schema.circleMembers)
      .where(and(eq(schema.circleMembers.circleId, circle.id), eq(schema.circleMembers.state, 'active')));
    if (!members.every((m) => m.aiConsent)) {
      throw forbidden('AI cloud baru aktif bila semua anggota lingkaran setuju.');
    }
    if (!client) throw new ApiError(503, 'ai_unavailable', 'AI cloud belum dikonfigurasi di server ini.');
    await rateLimit(s, `ai:${circle.id}`, 20, 24 * 3600);

    const snippets = input.snippets.map((t, i) => `${i + 1}. ${t.replace(/\s+/g, ' ').trim()}`).join('\n');
    try {
      const response = await client.beta.messages.parse({
        model: s.cfg.anthropic.model,
        max_tokens: 2000,
        // Bila model menolak, server Anthropic mencoba model cadangan otomatis.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: betaZodOutputFormat(TitlesSchema) },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Bulan: ${formatMonth(input.month)}\nPotongan yang dipilih anggota:\n${snippets}`,
          },
        ],
      });
      if (response.stop_reason === 'refusal' || !response.parsed_output) {
        const out: AiChapterResult = { titles: [] };
        return c.json(out);
      }
      const out: AiChapterResult = {
        titles: response.parsed_output.titles.map((t) => t.trim().slice(0, 60)).filter(Boolean).slice(0, 5),
      };
      return c.json(out);
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new ApiError(429, 'ai_busy', 'AI sedang sibuk. Coba lagi sebentar lagi.');
      if (e instanceof Anthropic.APIError) throw new ApiError(503, 'ai_error', 'AI sedang tidak bisa dihubungi.');
      throw e;
    }
  });

  return r;
}
