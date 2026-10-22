/** Penyimpanan perangkat. Kunci identitas ada di localStorage peramban ini. */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`sehari.${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(`sehari.${key}`, value);
    } catch {}
  },
  del(key: string) {
    try {
      localStorage.removeItem(`sehari.${key}`);
    } catch {}
  },
  json<T>(key: string): T | null {
    const v = store.get(key);
    if (!v) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  },
};
