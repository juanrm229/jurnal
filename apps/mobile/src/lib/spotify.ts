/**
 * Ekspor OST Lingkaran ke Spotify sebagai playlist (Plus). OAuth PKCE berjalan
 * di perangkat; token tidak pernah melewati server Sehari. Lagu dicari dengan
 * judul + penyanyi — bukan dijadikan soundtrack video (lisensi musik).
 *
 * Butuh EXPO_PUBLIC_SPOTIFY_CLIENT_ID dan redirect `sehari://spotify` (atau
 * URL web) terdaftar di dasbor Spotify.
 */
import type { SongRef } from '@sehari/core';
import { AuthRequest, exchangeCodeAsync, makeRedirectUri, ResponseType } from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
export const spotifyAvailable = () => SPOTIFY_CLIENT_ID.length > 0;

async function authorize(): Promise<string> {
  const redirectUri = makeRedirectUri({ scheme: 'sehari', path: 'spotify' });
  const req = new AuthRequest({
    clientId: SPOTIFY_CLIENT_ID,
    scopes: ['playlist-modify-private'],
    redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
  });
  const res = await req.promptAsync(discovery);
  if (res.type !== 'success' || !res.params.code) throw new Error('Spotify tidak diizinkan.');
  const token = await exchangeCodeAsync(
    { clientId: SPOTIFY_CLIENT_ID, code: res.params.code, redirectUri, extraParams: { code_verifier: req.codeVerifier ?? '' } },
    discovery,
  );
  return token.accessToken;
}

async function sp<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Spotify menolak (${r.status}).`);
  return (await r.json()) as T;
}

function trackIdFromUrl(url: string): string | null {
  return /open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]+)/.exec(url)?.[1] ?? null;
}

export async function exportPlaylist(name: string, description: string, songs: SongRef[]): Promise<{ url: string; added: number; missing: number }> {
  if (!spotifyAvailable()) throw new Error('Ekspor Spotify belum dikonfigurasi di aplikasi ini.');
  const token = await authorize();
  const uris: string[] = [];
  let missing = 0;
  for (const s of songs) {
    const direct = trackIdFromUrl(s.url);
    if (direct) {
      uris.push(`spotify:track:${direct}`);
      continue;
    }
    const q = encodeURIComponent(`track:${s.title} artist:${s.artist}`.slice(0, 200));
    const found = await sp<{ tracks: { items: { uri: string }[] } }>(token, `/search?type=track&limit=1&q=${q}`).catch(() => null);
    const uri = found?.tracks.items[0]?.uri;
    if (uri) uris.push(uri);
    else missing++;
  }
  const me = await sp<{ id: string }>(token, '/me');
  const playlist = await sp<{ id: string; external_urls: { spotify: string } }>(token, `/users/${encodeURIComponent(me.id)}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  });
  for (let i = 0; i < uris.length; i += 100) {
    await sp(token, `/playlists/${playlist.id}/tracks`, { method: 'POST', body: JSON.stringify({ uris: uris.slice(i, i + 100) }) });
  }
  return { url: playlist.external_urls.spotify, added: uris.length, missing };
}
