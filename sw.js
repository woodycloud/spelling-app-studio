const CACHE_NAME = 'spellquest-v2';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './data/unit1_lesson1.csv',
  './data/school_unit1.csv'
];

// 安装时缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 强制新 Service Worker 立即进入 active 状态
  );
});

// 激活时清理旧缓存并立即夺取控制权
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即控制所有页面
  );
});

// 拦截请求，针对 index.html 采用 Network-First（网络优先）策略，确保更新能立即生效
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match(event.request);
        })
    );
  } else {
    // 其它静态资源（如 CSV、图标等）采用 Cache-First 策略，并在获取后动态进行缓存
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // 仅对 GET 请求的同源静态资源或 CSV 词库进行动态缓存优化
            if (event.request.method === 'GET' && (url.origin === self.location.origin || url.pathname.endsWith('.csv'))) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }).catch(() => {
            // 吞掉网络异常，避免崩溃
          });
        })
    );
  }
});