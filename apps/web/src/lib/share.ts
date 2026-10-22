export async function shareOrCopy(text: string, url?: string): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch {}
  }
  await navigator.clipboard?.writeText(url ? `${text}\n${url}` : text).catch(() => {});
  return 'copied';
}
