// Pest Training — service worker: lưu sẵn trang và slide để mở được khi mất mạng
var CACHE = 'pest-training-v1';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/favicon.ico',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'slides/deck.css',
  'slides/deck.js',
  'slides/01-nhan-thuc-ipm.html',
  'slides/02-sinh-hoc-dich-hai.html',
  'slides/03-giam-sat.html',
  'slides/04-phong-ngua-nha-may.html',
  'slides/05-phong-ngua-kho-phan-phoi.html',
  'slides/06-kiem-soat-tieu-diet.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Có mạng: lấy bản mới rồi cập nhật cache. Mất mạng: dùng bản đã lưu (bỏ qua ?theme=...)
function networkFirst(req, url) {
  return fetch(req).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(url.origin + url.pathname, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
    });
  });
}

// Phông chữ Google ít đổi: ưu tiên bản đã lưu
function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok || res.type === 'opaque') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  });
}

// Thuyết minh Google TTS không đi qua đây: luôn cần Internet
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin === location.origin) e.respondWith(networkFirst(e.request, url));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(e.request));
});
