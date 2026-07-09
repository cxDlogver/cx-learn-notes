# 资源优化实战

## 资源压缩与请求优化

js 压缩、css 压缩、图片压缩

- js 压缩 terser
- css 压缩 cssnano、postcss 插件

## 资源缓存

让用户第二次访问更快

- 强缓存
- 协商缓存
- 策略缓存

### 强缓存

响应头有关

- expires，通过在客户端给定一个失效时间，失效缓存
- cache-control，根据服务端给的失效时长

### 协商缓存

- 必须建立在强缓存基础上
- 请求响应头控制
  - Last-Modified【响应头】、If-Modified-Since【请求头】
  - Etag、If-None-Match
- 协商成功 304 状态码


### 策略缓存 PWA

progressive web application【渐进式 web 应用】
- 可以离线访问

service worker