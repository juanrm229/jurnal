/* Sehari service worker: cangkang aplikasi luring + notifikasi push. */
const CACHE = 'sehari-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // API & media terenkripsi tidak pernah di-cache di sini.
  if (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/cron')) return;
  if (req.mode === 'navigate') {
    // Jaringan dulu; kalau luring, pakai cangkang terakhir.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || /\.(woff2?|png|svg|webmanifest)$/.test(url.pathname)) {
    // Berkas ber-hash: cache dulu.
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

function routeFor(d) {
  switch (d && d.type) {
    case 'capsules_open':
    case 'partner_sealed':
      return d.circleId && d.day ? `/l/${d.circleId}/hari/${d.day}` : '/hari';
    case 'invite_accepted':
      return d.circleId ? `/l/${d.circleId}` : '/lingkaran';
    case 'letter':
      return d.letterId ? `/surat/${d.letterId}` : '/surat';
    case 'time_capsule':
      return '/kenangan';
    case 'wrap':
    case 'chapter':
      return '/lingkaran';
    default:
      return '/hari';
  }
}

self.addEventListener('push', (e) => {
  let msg = { title: 'Sehari', body: 'Ada kabar kecil untukmu.', data: {} };
  try {
    msg = Object.assign(msg, e.data ? e.data.json() : {});
  } catch {}
  e.waitUntil(
    self.registration.showNotification(msg.title || 'Sehari', {
      body: msg.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: routeFor(msg.data) },
      tag: msg.data && msg.data.type,
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/hari';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
