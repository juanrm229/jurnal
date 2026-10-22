/**
 * Lagu hanya sebagai info & tautan (bukan file audio) — aman soal lisensi.
 * Metadata diambil dari oEmbed publik langsung dari perangkat.
 */
import type { SongRef } from '@sehari/core';

export function parseSongUrl(raw: string): Pick<SongRef, 'url' | 'provider'> | null {
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  if (/open\.spotify\.com\/(intl-[a-z]+\/)?(track|album|episode)\//i.test(url)) return { url: url.split('?')[0]!, provider: 'spotify' };
  if (/music\.youtube\.com\//i.test(url)) return { url, provider: 'youtube_music' };
  if (/(youtube\.com\/watch|youtu\.be\/)/i.test(url)) return { url, provider: 'youtube' };
  if (/music\.apple\.com\//i.test(url)) return { url, provider: 'apple_music' };
  return { url, provider: 'lainnya' };
}

export async function fetchSongMeta(ref: Pick<SongRef, 'url' | 'provider'>): Promise<{ title: string; artist: string; artworkUrl?: string } | null> {
  let endpoint: string | null = null;
  if (ref.provider === 'spotify') endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(ref.url)}`;
  if (ref.provider === 'youtube' || ref.provider === 'youtube_music') {
    endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(ref.url.replace('music.youtube.com', 'www.youtube.com'))}`;
  }
  if (!endpoint) return null;
  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const j = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  const title = j.title ?? '';
  // YouTube: "Penyanyi - Judul"; Spotify: judul saja.
  const m = /^(.+?)\s+[-–]\s+(.+)$/.exec(title);
  if (m && ref.provider !== 'spotify') return { artist: m[1]!.trim(), title: m[2]!.replace(/\s*\(.*?\)\s*$/, '').trim(), artworkUrl: j.thumbnail_url };
  return { title: title || 'Lagu', artist: j.author_name?.replace(/ - Topic$/, '') ?? '', artworkUrl: j.thumbnail_url };
}
