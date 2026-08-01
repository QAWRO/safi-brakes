/* محل الصافي — Service Worker
   ارفع الرقم في CACHE عند كل تحديث للتطبيق */
const CACHE = 'safi-v16';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo-header.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // البيانات: الشبكة أولاً (ليصل التحديث) ثم النسخة المحفوظة
  if (url.pathname.endsWith('data.json') || url.pathname.endsWith('bearing.json') || url.pathname.endsWith('iljin.json') || url.pathname.endsWith('wipers.json')) {
    const file = url.pathname.endsWith('bearing.json') ? './bearing.json'
      : url.pathname.endsWith('iljin.json') ? './iljin.json'
      : url.pathname.endsWith('wipers.json') ? './wipers.json' : './data.json';
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(file, cp));
        return r;
      }).catch(() => caches.match(file))
    );
    return;
  }

  // غلاف التطبيق (index.html والمسار الجذري): الشبكة أولاً دائماً حتى تظهر التحديثات فوراً
  if (url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/تطبيق-الصافي/') || req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        return r;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // باقي الملفات الثابتة: المحفوظ أولاً ثم الشبكة، مع تحديث الخلفية
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
