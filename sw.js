// Service worker: เปิดแอปได้เร็ว (ใช้เน็ตก่อน ถ้าออฟไลน์ใช้ไฟล์ที่เก็บไว้)
const CACHE = 'checkin-v22';
const SHELL = ['./', 'index.html', 'style.css', 'config.js', 'transport.js', 'guard.js', 'app.js', 'icon.svg', 'icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // ไม่แคช API / รูป / หน้าผู้ดูแล และคำขอไปโดเมนอื่น (เช่น Google Apps Script)
  if (e.request.method !== 'GET' || url.origin !== location.origin || /\/(api|uploads)\//.test(url.pathname) || /admin/.test(url.pathname)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))), // ไฟล์มี ?v=… ต่อท้าย
  );
});
