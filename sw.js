/* SoundWave service worker: lets the app open with no internet.
   Online  -> loads the newest page from the server and keeps a copy.
   Offline -> opens the saved copy (it then shows "No internet connection" + Refresh).
   Only page loads are handled. Songs, images and Supabase requests are never touched. */
const V = 'soundwave-shell-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(['/offline.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.mode !== 'navigate') return;
  e.respondWith((async () => {
    try {
      const res = await Promise.race([
        fetch(r),
        new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 4000))   /* Wi-Fi with no internet hangs, so give up after 4s */
      ]);
      if (res && res.ok) { const c = await caches.open(V); c.put(r, res.clone()); }
      return res;
    } catch (err) {
      const c = await caches.open(V);
      return (await c.match(r, { ignoreSearch: true })) || (await c.match('/offline.html')) || Response.error();
    }
  })());
});
