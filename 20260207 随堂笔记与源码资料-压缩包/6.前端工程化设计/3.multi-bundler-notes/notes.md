# 多场景构建工具选型与原理剖析

## 模块化规范

工程化  ->  规范「文件组织规范/模块化规范」

一堆 js 文件
<script src="jquery.js"></script>
<script src="react.js"></script>

变成更标准引入方式，在什么模块用到什么 api 导入对应 api

- commonjs，nodejs 默认支持模块化规范
- esm，es6+ 支持

### 模块化发展时间线

- 2009，Kevin，ServerJS 项目  -> 后面更名 **CommonJS**，Modules/1.0
- 2011，Requirejs1.0发布，**AMD** 规范
- 2013，grunt/gulp，browserify
- 2014，跨平台兼容模块化定义，**UMD** 规范
- 2014，es6 转 es5 工具，6to5，更名为 **babel**
- 2014，Systemjs 工具发布，字节，远程模块加载；module-federation
- 2014，webpack 发布
- 2015，es6（es2015）发布，真正意义上奠定了 js 标准模块化 esm
- 2015，Rich 发布 rollup，基于 es6 模块化标准，tree shaking
- 2017，parcel 踩 webpack 配置复杂
- 2019，snowpack
- 2020，浏览器对 esm、http2 的支持，bundleless 思路。esbuild、snowpack
- 2021，vite 横空出世
- 2023，基于 rust 工具链重构，rspack、rsbuild
- 2026，oxc、rolldown


## rust

### 安装
`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### 包管理
nodejs   npm
rust     cargo
python   uv/conda
java     maven

### 依赖文件

nodejs     package.json
java       pom.xml
rust       Cargo.toml
python     requirements.txt



## 总结

vite、webpack 业务
tsup、rollup  工具