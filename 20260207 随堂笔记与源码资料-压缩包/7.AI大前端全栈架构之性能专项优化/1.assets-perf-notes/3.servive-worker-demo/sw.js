// service worker 的配置
const CACHE_PREFIX = "miaoma-sw-cache";
const CACHE_VERSION = "0.0.20";
const CACHE_NAME = CACHE_PREFIX + "-" + CACHE_VERSION;

const allAssets = ["./js/index.js", "./css/index.css"];

self.addEventListener("install", function (event) {
  self.skipWaiting();

  event.waitUntil(
    // 资源放在了 sw 缓存中
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(allAssets);
    }),
  );
});

// 进一步代理整个请求
self.addEventListener("fetch", function (event) {
  caches.match(event.request).then((res) => {
    console.log(res);

    if (res) {
      return res;
    }
  });

  // 1.0
  // return fetch(event.request);

  // 2.0
  //   缓存优先
  return fetch(event.request).then((networkResponse) => {
    return caches.open(CACHE_NAME).then((cache) => {
      cache.put(event.request, networkResponse.clone()); // 更新缓存
      return networkResponse;
    });
  });
});
