// Service worker Kuźni Legend: gra otwiera się bez internetu, a po aktualizacji serwera ładuje nową wersję.
// - strona (HTML): najpierw sieć, bez sieci — ostatnia zapisana wersja,
// - pliki z /assets/ (nazwy ze skrótem, nigdy się nie zmieniają), ikony i czcionki: z pamięci, a gdy ich nie ma — z sieci,
// - API serwera (/v2, /ws), muzyka (zapytania Range) i version.json: zawsze sieć, bez zapisywania.
const CACHE = 'kuznia-v1';

// Przy instalacji: strona i jej skrypty/style, żeby gra otworzyła się bez internetu już przy następnym razie.
self.addEventListener('install', e => e.waitUntil((async () => {
  try {
    const c = await caches.open(CACHE);
    const res = await fetch('./', { cache: 'no-store' });
    if (res.ok) {
      const html = await res.clone().text();
      await c.put('./', res);
      const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map(m => m[1]);
      await c.addAll([...new Set(assets)]);
      // czcionki z arkusza stylów
      for (const css of assets.filter(a => a.endsWith('.css'))) {
        const txt = await (await c.match(css)).text();
        const fonts = [...txt.matchAll(/url\(["']?([^)"']+\.woff2)["']?\)/g)].map(m => new URL(m[1], new URL(css, self.location.href)).href);
        await c.addAll([...new Set(fonts)]);
      }
    }
  } catch { /* bez sieci — zapiszemy przy następnym otwarciu */ }
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.includes('/v2/') || p.endsWith('/ws') || p.endsWith('version.json') || req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put('./', res.clone());
        return res;
      } catch {
        return (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  if (p.includes('/assets/') || p.includes('/icons/') || p.endsWith('manifest.webmanifest') || (p.includes('/audio/s-'))) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.status === 200) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
