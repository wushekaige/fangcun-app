// 方寸 PWA Service Worker：缓存页面壳，断网也能打开。
// 20260711095442 由 deploy.sh 注入构建时间戳，每次部署触发 SW 更新、旧缓存清理。
'use strict';
const CACHE = 'fangcun-20260711095442';
const SHELL = ['./', 'icon.png', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    // 逐个缓存：单个资源失败不阻塞安装（运行时 fetch 还会回填）
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 同源 GET：网络优先、成功即回填缓存，失败落缓存；导航请求兜底到页面壳。
// Supabase 等跨域请求不拦截，离线时由页面自己处理。
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true })
        .then(r => r || (e.request.mode === 'navigate' ? caches.match('./') : Response.error()))
    )
  );
});
