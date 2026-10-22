/** Router mungil berbasis History API — cukup untuk aplikasi ini, tanpa dependensi. */
import { type AnchorHTMLAttributes, createContext, type ReactNode, useContext, useEffect, useState } from 'react';

type Listener = () => void;
const listeners = new Set<Listener>();

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search + location.hash) return;
  if (opts.replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.scrollTo({ top: 0 });
  listeners.forEach((l) => l());
}

export function back(fallback = '/hari') {
  if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
  else if (history.state !== null || history.length > 2) history.back();
  else navigate(fallback, { replace: true });
}

export function usePath(): { path: string; search: URLSearchParams } {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    window.addEventListener('popstate', l);
    return () => {
      listeners.delete(l);
      window.removeEventListener('popstate', l);
    };
  }, []);
  return { path: location.pathname, search: new URLSearchParams(location.search) };
}

/** Cocokkan pola '/l/:id/hari/:day'. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(':')) out[p[i]!.slice(1)] = decodeURIComponent(s[i]!);
    else if (p[i] !== s[i]) return null;
  }
  return out;
}

const ParamsCtx = createContext<Record<string, string>>({});
export const ParamsProvider = ParamsCtx.Provider;
export const useParams = <T extends Record<string, string>>() => useContext(ParamsCtx) as T;

export function Link({ to, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children: ReactNode }) {
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}>
      {children}
    </a>
  );
}
