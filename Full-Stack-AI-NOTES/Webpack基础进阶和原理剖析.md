# Webpack基础进阶和原理剖析

## Webpack核心和基础使用

- Webpack的概述是什么？
- Webpack的核心概念有哪些？
- 常用的loaders有哪些？
- 常用的plugins有哪些？
- Webpack5的构建过程？

### Webpack是什么

参考资料：[概念 | webpack 中文文档 | webpack中文文档 | webpack中文网](https://www.webpackjs.com/concepts/)

Webpack 是一个**以模块为核心**的前端构建工具，也是目前前端工程化中最常用、最强大的构建工具之一，其本质是：从一个或多个入口文件出发，递归分析整个应用的依赖关系，构建出完整的依赖图（Dependency Graph），并将所有模块打包为若干个可直接部署到服务器、供浏览器加载的静态资源（如JS、CSS、图片等）。

补充扩展：Webpack 诞生的核心目的是解决前端模块化问题，将分散的各类资源（无论是否是JS）整合为可高效加载的静态资源，同时支持模块化开发、代码优化、环境适配等工程化需求，兼容多种模块规范（ES Module、CommonJS、AMD等）。

#### Webpack核心思想

- 一切皆模块：JS、CSS、图片、字体、JSON、甚至HTML片段等所有前端资源，都可以被当作模块处理，打破了资源类型的壁垒。
- 模块依赖：模块之间通过`import`（ES Module规范）或`require`（CommonJS规范）建立明确的依赖关系，Webpack会根据这些关系梳理出依赖链路。
- 依赖图构建：Webpack 会从入口文件开始，递归解析每个模块的依赖，最终形成一个完整的依赖图（有向图，节点为模块，边为依赖关系），确保所有被依赖的模块都能被正确打包。

对应问题：1. Webpack 的本质和核心作用是什么？2. Webpack 的核心思想包含哪三点，分别是什么含义？3. Webpack 支持哪些模块规范？

### Webpack核心概念

由于Webpack-cli脚手架自动帮我们完成了Webpack的业务逻辑，在开发过程中，我们需要做的就是配置Webpakc的配置项。

#### Entry（入口）

入口（Entry）决定了Webpack**依赖分析的起点**，Webpack 会以入口文件为根节点，开始递归解析所有依赖的模块，进而构建整个应用的依赖图。入口的选择直接影响依赖图的构建范围，未被入口及依赖链包含的模块，不会被打包。

基础配置示例：

```javascript
module.exports = {
  entry: './src/index.js' // 单入口配置
}
```

入口类型及适用场景：

- 单入口：格式为字符串（如上述示例），适用于单页面应用（SPA），整个应用只有一个入口，所有代码最终打包为一个或多个关联的静态资源。
- 多入口：格式为对象，适用于多页面应用（MPA），每个页面对应一个入口，打包后会生成多个独立的资源包，避免单页面资源体积过大。示例：

```JavaScript
 module.exports = {
  entry: {
    page1: './src/page1.js', // 页面1入口
    page2: './src/page2.js'  // 页面2入口
  }
}
```

补充扩展：入口还可以配置为数组格式（如`entry: ['./src/index1.js', './src/index2.js']`），表示多个入口文件合并为一个依赖图，最终打包为一个资源包，适用于多个文件共同作为应用入口的场景。

对应问题：1. Webpack 中 Entry（入口）的作用是什么？2. 入口分为哪几种类型，分别适用于什么场景？3. 数组格式的入口配置有什么作用？

#### Output（输出）

输出（Output）定义了Webpack**打包结果的结构与位置**，用于指定打包后静态资源的输出目录、文件名规则、资源路径等，是控制打包产物形态的核心配置。

基础配置示例：

```javascript
output: {
  path: path.resolve(__dirname, 'dist'), // 输出目录（绝对路径）
  filename: 'bundle.js'                  // 输出文件名
}
```

常见关注点及扩展说明：

- 输出目录：通过`path`配置，必须使用`path.resolve(__dirname, '目录名')`转换为绝对路径（__dirname 表示当前配置文件所在目录），默认输出目录为`dist`。
- 文件名规则：可通过占位符配置，灵活控制文件名，常用占位符：        
  - `[name]`：对应入口名称（单入口默认`main`，多入口对应对象的key）；
  - `[hash]`：整个项目的构建哈希值，每次构建若有任何文件变化，哈希值会改变；
  - `[chunkhash]`：每个代码块（Chunk）的哈希值，只有当前代码块的文件变化，哈希值才会改变；
  - `[contenthash]`：基于文件内容生成的哈希值，只有文件内容变化，哈希值才会改变，最适合用于缓存优化。
- hash / chunkhash / contenthash 区别：三者核心用于浏览器缓存优化，避免用户加载旧资源。`hash`全局统一，`chunkhash`按代码块区分，`contenthash`按文件内容区分，推荐生产环境使用`contenthash`，确保只有内容变化的文件才会更新哈希，最大化利用缓存。
- 其他配置：`assetModuleFilename`用于配置内置资源模块（如图片、字体）的输出路径和文件名；`clean: true`（Webpack5新增）用于构建前自动清理输出目录，替代`CleanWebpackPlugin`。

对应问题：1. Webpack 中 Output（输出）的作用是什么？2. 常用的文件名占位符有哪些，各自的区别是什么？3. `hash`、`chunkhash`、`contenthash` 分别适用于什么场景？4. Webpack5 中如何自动清理输出目录？

#### Loader（加载器）

Loader 的本质是：**将非 JS 资源转换为 Webpack 能理解的模块**。Webpack 本身只能处理 JS 和 JSON 两种模块，无法直接解析 CSS、图片、TypeScript 等资源，Loader 作为“翻译官”，可将这些非 JS 资源转换为合法的 JS 模块，从而纳入依赖图中进行打包。

补充扩展：Loader 是 Webpack 扩展资源处理能力的核心，遵循“单一职责”原则，每个 Loader 只负责一种类型的资源转换，复杂资源处理需多个 Loader 组合使用。

##### 常见Loader分类及详细说明

- 语法转换类：用于将高级语法或非标准 JS 转换为浏览器可识别的 ES5 语法，核心作用是解决兼容性问题。        
  - `babel-loader`：配合 Babel 工具，将 ES6+、JSX 等语法转换为 ES5 语法，是前端项目必备 Loader；
  - `ts-loader`：将 TypeScript 代码转换为 JavaScript 代码，支持 TypeScript 模块化开发。
- 样式处理类：用于解析和处理 CSS、SCSS/SASS、LESS 等样式资源，并将其整合到打包产物中。        
  - `css-loader`：解析 CSS 文件中的`@import`和`url()`语法，将 CSS 转换为 JS 模块；
  - `style-loader`：将`css-loader`处理后的 CSS 代码，通过`style`标签插入到 HTML 的`head`中，适用于开发环境；
  - `sass-loader`：配合`node-sass`或`dart-sass`，将 SCSS/SASS 语法转换为 CSS 语法，需与`css-loader`配合使用；
  - `mini-css-extract-plugin-loader`：将 CSS 提取为独立的 CSS 文件（替代`style-loader`），适用于生产环境，减少 JS 文件体积。
- 资源处理类：用于处理图片、字体、媒体文件等静态资源，控制其打包方式（如转为 base64、输出独立文件）。        
  - `file-loader`：将文件资源复制到输出目录，并返回文件的访问路径，适用于较大的图片、字体文件；
  - `url-loader`：与`file-loader`功能类似，可配置小文件转为 base64 编码（嵌入 JS 中），减少 HTTP 请求，大文件自动转为`file-loader`处理；
  - `asset module`（Webpack5 内置）：替代`file-loader`和`url-loader`，通过`type: 'asset'`自动判断资源大小，小文件转为 base64，大文件输出独立文件，配置更简洁。

##### Loader执行特点

- 执行顺序：从右到左（或从下到上），即配置在数组后面的 Loader 先执行，前面的后执行。例如`use: ['style-loader', 'css-loader']`，先执行`css-loader`解析 CSS，再执行`style-loader`将 CSS 插入 DOM。
- 纯函数特性：<span style="color:#409eff">Loader 本质是纯函数，输入固定的资源内容，输出固定的转换结果，无副作用（不修改外部环境），确保构建过程的可复现性</span>。
- 单一职责：每个 Loader 只负责一种转换任务，例如`css-loader`只解析 CSS，`sass-loader`只转换 SCSS，通过多个 Loader 组合，实现复杂资源的处理。

对应问题：1. Loader 的本质是什么？Webpack 为什么需要 Loader？2. 常见的 Loader 分为哪几类，每类有哪些常用 Loader，各自作用是什么？3. Loader 的执行顺序是什么？4. Webpack5 中如何处理静态资源，与 Webpack4 有什么区别？

#### Plugin（插件）

Plugin 解决的是：**Loader 无法处理的构建阶段问题**。Loader 专注于“资源转换”，只能处理特定类型的资源，而 Plugin 可介入 Webpack 整个构建生命周期（从依赖图构建、模块转换到最终输出），实现构建流程控制、资源优化、功能扩展等复杂需求，是 Webpack 生态的核心组成部分，Plugin是对象。

补充扩展：Plugin 基于 Webpack 的钩子机制实现，可监听构建过程中的各个阶段（如入口解析、模块编译、产物输出等），在对应阶段执行自定义逻辑，实现灵活的功能扩展。

##### Plugin的能力范围

- 构建流程控制：<span style="color:#409eff">监听构建的各个钩子，执行自定义逻辑</span>，例如在构建开始前清理输出目录、构建结束后生成报告。
- 资源优化：对打包后的 JS、CSS、图片等资源进行压缩、拆分，提升页面加载速度，例如压缩 JS 代码、提取公共 CSS 模块。
- 注入环境变量：向代码中注入全局环境变量（如`process.env.NODE_ENV`），实现开发环境与生产环境的差异化配置。
- 生成HTML：自动生成包含打包后资源（JS、CSS）的 HTML 文件，无需手动引入，避免资源路径错误。
- 其他扩展：复制静态资源、分析构建性能、注入全局变量、处理模块化异常等。

##### 常见插件及详细作用

- `HtmlWebpackPlugin`：最常用的插件之一，自动生成 HTML 文件，可指定模板 HTML，自动引入打包后的 JS、CSS 资源，支持配置标题、 favicon 等。
- `DefinePlugin`：Webpack 内置插件，用于向代码中注入全局常量，常用於注入环境变量（如`process.env.NODE_ENV = 'production'`），实现环境差异化逻辑。
- `MiniCssExtractPlugin`：将 CSS 资源提取为独立的 CSS 文件，替代`style-loader`，适用于生产环境，减少 JS 文件体积，同时支持 CSS 缓存优化。
- `CleanWebpackPlugin`：构建前清理输出目录，避免旧资源残留，Webpack5 可通过`output.clean: true`替代，无需额外安装。
- `CopyWebpackPlugin`：将指定的静态资源（如 public 目录下的文件）复制到输出目录，无需通过`import`引入即可直接访问。
- `TerserPlugin`：Webpack5 内置插件，用于压缩 JS 代码，移除无用代码、混淆变量名，优化 JS 体积（生产环境默认启用）。
- `CssMinimizerPlugin`：用于压缩 CSS 代码，移除空格、注释，优化 CSS 体积，需配合`MiniCssExtractPlugin`使用。

##### Loader 与 Plugin 的核心区别

- 作用范围不同：Loader 只处理特定类型的资源转换，专注于“资源处理”；Plugin 介入整个构建生命周期，专注于“流程控制和功能扩展”。
- 使用方式不同：Loader 配置在`module.rules`中，通过`test`匹配资源类型，`use`指定 Loader；Plugin 配置在`plugins`数组中，需实例化（`new 插件名()`）。
- 依赖关系不同：Plugin 可独立使用，Loader 通常需要配合其他 Loader 或 Plugin 实现完整功能（如`sass-loader`需配合`css-loader`）。

对应问题：1. Plugin 的作用是什么？与 Loader 有什么核心区别？2. 常见的 Plugin 有哪些，各自的作用是什么？3. Webpack5 中哪些插件是内置的，无需额外安装？4. 如何通过 Plugin 实现环境变量注入？

### Webpack基本配置

Webpack 配置核心是`webpack.config.js`文件（默认配置文件名），通过导出一个配置对象，定义构建的各项规则。以下是完整的基础配置，包含开发环境与生产环境差异化配置，同时补充配置项的详细说明。

#### 配套依赖（最小集合）

安装开发依赖，满足基础构建、JS 转译、样式处理、HTML 生成、本地开发等核心需求，命令如下：

```bash
npm install -D \
webpack webpack-cli webpack-dev-server \
html-webpack-plugin \
babel-loader @babel/core @babel/preset-env \
css-loader style-loader \
mini-css-extract-plugin
```

依赖说明：

- `webpack`：Webpack 核心包；
- `webpack-cli`：Webpack 命令行工具，用于执行构建命令；
- `webpack-dev-server`：本地开发服务器，支持热更新、自动刷新，提升开发体验；
- `html-webpack-plugin`：自动生成 HTML 文件；
- `babel-loader`、`@babel/core`、`@babel/preset-env`：JS 语法转译，将 ES6+ 转为 ES5；
- `css-loader`、`style-loader`：处理 CSS 资源，开发环境将 CSS 插入 DOM；
- `mini-css-extract-plugin`：生产环境提取 CSS 为独立文件。

#### babel配置（babel.config.js）

配合`babel-loader`使用，定义 JS 转译规则，核心是指定预设（preset），`@babel/preset-env`用于自动适配目标浏览器，转换 ES6+ 语法：

```javascript
module.exports = {
  presets: ['@babel/preset-env']
}
```

#### 推荐项目结构

规范的项目结构可提升开发效率，避免配置混乱，推荐结构如下（适用于大多数前端项目）：

```plain
project
├─ public                # 静态资源目录（无需打包，直接复制）
│  └─ index.html         # HTML模板文件
├─ src                   # 源码目录
│  ├─ index.js           # 入口文件
│  ├─ index.css          # 全局样式文件
│  └─ assets             # 源码内静态资源（图片、字体等，需打包）
├─ dist                  # 打包输出目录（自动生成）
├─ babel.config.js       # babel配置文件
└─ webpack.config.js     # Webpack配置文件
```

#### 完整基本配置项（webpack.config.js）

以下配置兼容开发环境与生产环境，包含核心配置项及详细注释，可直接用于基础项目：

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

// 区分开发环境与生产环境（通过环境变量判断）
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  // 构建模式：development（开发环境）/ production（生产环境）
  mode: isProd ? 'production' : 'development',

  // 入口文件：单入口配置
  entry: './src/index.js',

  // 输出配置
  output: {
    path: path.resolve(__dirname, 'dist'), // 输出目录（绝对路径）
    filename: isProd
      ? 'js/[name].[contenthash:8].js'    // 生产环境：带contenthash的JS文件名，用于缓存
      : 'js/[name].js',                   // 开发环境：简单文件名，便于调试
    assetModuleFilename: 'assets/[hash][ext][query]', // 内置资源模块输出规则
    clean: true // 构建前清理输出目录（Webpack5新增，替代CleanWebpackPlugin）
  },

  // 模块解析规则：配置Loader处理非JS资源
  module: {
    rules: [
      // 1. 处理JS / ES6+：使用babel-loader转译
      {
        test: /\.js$/, // 匹配所有.js文件
        exclude: /node_modules/, // 排除node_modules目录（无需转译第三方依赖）
        use: 'babel-loader' // 使用babel-loader处理
      },

      // 2. 处理CSS：开发环境插入DOM，生产环境提取为独立文件
      {
        test: /\.css$/, // 匹配所有.css文件
        use: [
          // 生产环境使用MiniCssExtractPlugin.loader提取CSS，开发环境使用style-loader
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader' // 解析CSS文件中的import和url()
        ]
      },

      // 3. 处理图片 / 字体 / 媒体资源（Webpack5内置asset module）
      {
        test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf)$/i, // 匹配图片、字体文件
        type: 'asset', // 自动判断：小文件转为base64，大文件输出独立文件
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8KB以下的文件转为base64
          }
        }
      }
    ]
  },

  // 插件配置：扩展Webpack功能
  plugins: [
    // 自动生成HTML文件，使用public/index.html作为模板
    new HtmlWebpackPlugin({
      template: './public/index.html', // HTML模板路径
      inject: 'body' // 将JS资源注入到body标签末尾
    }),

    // 生产环境才启用：提取CSS为独立文件
    isProd &&
      new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash:8].css' // 提取后的CSS文件名规则
      })
  ].filter(Boolean), // 过滤掉false值（开发环境不启用MiniCssExtractPlugin）

  // 模块解析配置：优化模块查找
  resolve: {
    extensions: ['.js', '.json'], // 自动解析的文件后缀，引入时可省略后缀
    alias: {
      '@': path.resolve(__dirname, 'src') // 配置别名，@指向src目录，简化引入路径
    }
  },

  // Source Map：用于调试，映射打包后的代码到源码
  devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
  // 生产环境：source-map（完整源码映射，便于调试但体积大）
  // 开发环境：eval-cheap-module-source-map（快速构建，保留源码映射）

  // 开发服务器配置（仅开发环境生效）
  devServer: {
    port: 3000, // 开发服务器端口
    open: true, // 启动服务器后自动打开浏览器
    hot: true, // 启用热模块替换（HMR），修改代码无需刷新页面
    historyApiFallback: true // 解决SPA路由刷新404问题
  },

  // 性能与拆包优化（基础配置）
  optimization: {
    splitChunks: {
      chunks: 'all' // 拆分所有代码块，提取公共依赖（如第三方依赖）
    },
    runtimeChunk: 'single' // 将运行时代码提取为独立chunk，优化缓存
  }
}
```

##### 核心配置项详细说明

- `mode`：控制构建优化策略，开发环境（development）不压缩代码、快速构建、启用热更新；生产环境（production）自动压缩代码、启用Tree Shaking、优化缓存。
- `resolve.extensions`：自动解析指定后缀的文件，例如引入`./src/utils`时，可省略`.js`后缀，提升开发效率。
- `resolve.alias`：配置模块别名，例如`@`指向`src`目录，引入`src/components/Button`时，可写为`@/components/Button`，简化路径书写。
- `devtool`：配置源码映射，开发环境优先考虑构建速度，生产环境优先考虑调试效果与体积。
- `devServer`：本地开发服务器配置，`hot: true`启用热更新（HMR），是提升开发体验的关键配置。
- `optimization`：拆包与缓存优化，`splitChunks: { chunks: 'all' }`可提取公共依赖（如`vue`、`react`等第三方库）为独立chunk，避免重复打包，提升缓存利用率；`runtimeChunk: 'single'`提取运行时代码，避免因入口文件变化导致公共chunk哈希值改变。

对应问题：1. Webpack 配置中`mode`的作用是什么？开发环境与生产环境有什么区别？2. `resolve.alias`的作用是什么？如何配置？3. `devServer`的核心配置有哪些，各自作用是什么？4. 如何通过`optimization`配置实现拆包优化？5. Webpack5 中如何处理静态资源，与 Webpack4 有什么不同？

### Webpack基本指令

Webpack 指令通过`npx webpack`或`npm scripts`执行，核心指令分为构建指令、开发服务器指令、参数配置指令，以下是常用指令及详细说明：

#### 核心构建指令

- `npx webpack`：执行一次构建，默认读取项目根目录的`webpack.config.js`配置文件，构建模式由配置中的`mode`决定。
- `npx webpack build`：与`npx webpack`等价，显式表示“执行构建”，语义更清晰，推荐使用。
- `npx webpack --mode development`：指定构建模式为开发环境，忽略配置文件中的`mode`设置，不压缩代码、快速构建。
- `npx webpack --mode production`：指定构建模式为生产环境，忽略配置文件中的`mode`设置，自动压缩代码、启用优化。

#### 配置文件相关指令

- `npx webpack --config webpack.config.js`：指定使用的配置文件，适用于配置文件名称不是默认的情况。
- `npx webpack --config webpack.prod.js`：使用生产环境专属配置文件（如`webpack.prod.js`）进行构建，适用于开发环境与生产环境配置差异较大的场景。

#### 开发服务器指令

- `npx webpack serve`：启动本地开发服务器，默认读取`webpack.config.js`中的`devServer`配置，支持热更新。
- `npx webpack serve --port 3000`：指定开发服务器端口为3000，覆盖配置文件中的`port`设置。
- `npx webpack serve --open`：启动服务器后自动打开浏览器，覆盖配置文件中的`open`设置。
- `npx webpack serve --hot`：启用热模块替换（HMR），覆盖配置文件中的`hot`设置。
- `npx webpack serve --static public`：指定静态资源目录为`public`，覆盖配置文件中的相关设置。
- `npx webpack serve --mode development --open`：本地开发常用指令，指定开发模式、启动服务器并自动打开浏览器。

#### 其他常用指令

- `npx webpack --output-path dist`：指定输出目录为`dist`，覆盖配置文件中的`output.path`设置。
- `npx webpack --output-filename bundle.js`：指定输出文件名为`bundle.js`，覆盖配置文件中的`output.filename`设置。
- `npx webpack --progress`：显示构建进度条，便于查看构建进度。
- `npx webpack --watch`：监听文件变化，文件修改后自动重新构建，适用于开发环境（替代`webpack-dev-server`的简单场景）。
- `npx webpack --stats detailed`：输出详细的构建信息，便于排查构建问题。
- `npx webpack --profile`：显示构建性能数据，便于分析构建瓶颈（如哪个Loader、Plugin耗时最长）。
- `npx webpack --mode production`：生产环境打包常用指令，自动启用所有优化配置。

补充扩展：可在`package.json`中配置`scripts`简化指令，例如：

```json
{
  "scripts": {
    "dev": "webpack serve --mode development --open",
    "build": "webpack build --mode production",
    "build:prod": "webpack --config webpack.prod.js"
  }
}
```

配置后，可通过`npm run dev`启动开发服务器，`npm run build`执行生产环境打包，更简洁高效。

对应问题：1. 如何启动Webpack本地开发服务器？常用的开发服务器参数有哪些？2. 如何指定Webpack的配置文件？3. 开发环境与生产环境的构建指令有什么区别？4. 如何通过`package.json`的`scripts`简化Webpack指令？

### Webpack打包流程

Webpack 打包流程是一个按顺序执行的完整生命周期，从读取入口文件到生成最终静态资源，共分为6个核心步骤，每个步骤紧密关联，以下是详细拆解：

#### 第一步：读取入口（Entry）

打包流程从配置中指定的一个或多个**入口文件**开始。入口的核心意义不是“第一个执行的文件”，而是**依赖分析的起点**。

例如，入口为`src/index.js`，Webpack 会将该文件视为应用的根节点，认为所有需要打包的代码，都必须通过该文件或其依赖链“可达”（即能被入口文件直接或间接引用）；未被入口及依赖链包含的模块，会被视为无用模块，不会被打包。

#### 第二步：构建依赖关系图（Dependency Graph）

这是整个打包过程**最核心的一步**，也是 Webpack 实现模块化打包的关键。

Webpack 会执行以下操作：

- 解析入口文件中的`import`或`require`语句，找到当前模块依赖的所有子模块；
- 对每个子模块递归执行同样的解析操作，找到子模块的依赖模块；
- 将所有模块及其依赖关系整理为一个完整的依赖图（本质是一个有向图，节点为模块，边为依赖关系）。

补充扩展：依赖图的构建确保了所有被依赖的模块都能被正确打包，同时也为后续的模块转换、拆分提供了依据。

#### 第三步：模块编译内容转换（Transpilation）

在依赖图构建过程中，Webpack 会对每个模块进行“加工”，即内容转换，核心目的是将源码转换为浏览器可识别的格式。

为什么需要转换？因为源码通常包含浏览器不支持的内容：

- 浏览器不支持的 JS 语法（如 ES6+、TypeScript、JSX）；
- 非 JS 资源（如 CSS、图片、字体）；
- 工程阶段的写法（如 SCSS、LESS 嵌套语法）。

转换内容主要包括：

- TypeScript → JavaScript（通过`ts-loader`）；
- JSX → JavaScript（通过`babel-loader`配合`@babel/preset-react`）；
- SCSS/SASS/LESS → CSS（通过`sass-loader`、`less-loader`）；
- ES6+ → ES5（通过`babel-loader`配合`@babel/preset-env`）；
- 图片、字体 → 可被 JS 引用的模块（通过`asset module`或`url-loader`）。

这一步的最终结果是：**所有模块在逻辑层面都变成“可执行的 JS 模块”**，便于后续的合并、优化。

#### 第四步：模块合并与拆分，生成代码块（Chunk）

此时，Webpack 已经获取了所有模块、模块的依赖关系以及转换后的模块内容，接下来需要解决的核心问题是：**这些模块应该如何组织成最终的文件？**

这是一个性能优化决策阶段，常见的组织策略包括：

- 合并成一个文件：适用于小型项目，所有模块合并为一个 JS 文件，减少 HTTP 请求，但体积较大。
- 拆成多个 Chunk（代码块）：适用于中大型项目，按路由、按功能拆分模块，例如将首页模块、详情页模块拆分为两个独立的 Chunk，实现按需加载（懒加载），减少首屏加载时间。
- 抽离公共依赖：将多个模块共同依赖的第三方库（如`vue`、`react`）或公共组件，抽离为独立的 Chunk（如`vendor.js`），实现缓存复用，避免重复打包。

补充扩展：Chunk 是 Webpack 打包过程中的一个中间概念，指一组模块的集合，最终会被打包为一个或多个输出文件（如 JS、CSS 文件）。

#### 第五步：构建阶段优化

在确定输出结构（即 Chunk 划分）后，Webpack 会对所有 Chunk 进行一系列“只在构建阶段存在”的优化操作，这些优化不会改变业务逻辑，只改变代码形态，核心目的是减小资源体积、提升加载速度。

常见的优化操作：

- Tree Shaking：删除代码中未被使用的无用代码（死代码），仅保留被引用的代码，适用于 ES Module 规范（静态导入）。
- Minify（压缩）：压缩 JS、CSS 代码，移除空格、注释、换行，混淆变量名（JS），减小文件体积。
- Scope Hoisting（作用域提升）：将多个模块的代码合并到一个作用域中，减少函数包裹，降低代码体积，提升执行效率。
- 资源压缩：对图片、字体等静态资源进行压缩，减小资源体积（如图片压缩、字体 subset 提取）。

补充扩展：生产环境下，Webpack 会自动启用这些优化，开发环境为了提升构建速度，会关闭部分优化（如压缩、Tree Shaking）。

#### 第六步：生成最终产物（Output）

这是打包流程的最后一步，Webpack 会根据`output`配置，将优化后的 Chunk 输出到指定目录，生成最终的静态资源。

最终输出的静态资源通常包括：

- HTML 文件：由`HtmlWebpackPlugin`自动生成，包含打包后的 JS、CSS 资源引用；
- JS 文件：带哈希值的 JS 代码块（如`js/main.12345678.js`），用于缓存优化；
- CSS 文件：生产环境下由`MiniCssExtractPlugin`提取的独立 CSS 文件（如`css/main.87654321.css`）；
- 静态资源：图片、字体等文件（如`assets/abc123.png`）。

这些最终产物的特点：

- 浏览器可直接加载，无需额外处理；
- 内容稳定，通过哈希值实现缓存优化；
- 与源码结构无直接对应关系，经过了合并、压缩、优化。

对应问题：1. Webpack 的完整打包流程分为哪几步？每一步的核心操作是什么？2. 依赖关系图（Dependency Graph）在打包流程中的作用是什么？3. 模块编译转换的目的是什么？包含哪些常见转换？4. 构建阶段的优化操作有哪些，各自的作用是什么？5. 最终输出的静态资源包含哪些类型，有什么特点？

## Webpack的优化细节

### 本地开发环境优化

本地开发优化的核心是降低构建耗时、提升调试效率、减少重复构建，让开发者获得即时的开发反馈，避免因构建速度慢、调试不便影响开发节奏。Webpack 5 针对本地开发提供了多种原生优化，结合合理配置可进一步提升体验。

#### 开启模块热替换（HMR）

模块热替换（Hot Module Replacement，简称HMR）是本地开发最核心的优化手段之一，其核心作用是：在不刷新整个页面的前提下，只更新修改的模块，保留页面当前状态（如表单输入、组件渲染状态等），彻底解决传统“刷新页面”导致的状态丢失、调试效率低的问题，大幅提升开发效率。

核心配置示例：

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'development', // 本地开发模式
  devServer: {
    hot: true, // 开启HMR（Webpack 5 启用后会自动注入HotModuleReplacementPlugin）
    hotOnly: true, // 可选配置：即使HMR失败，也不刷新整个页面，避免状态丢失
    port: 3000, // 本地开发端口
    open: true // 启动开发服务器后自动打开浏览器
  }
};
```

扩展知识点：

- HMR 原理：Webpack 开发服务器（webpack-dev-server）会实时监控项目文件变化，当某个模块被修改后，Webpack 仅重新编译该模块（而非整个项目），并通过 WebSocket 协议将更新后的模块代码发送给浏览器；浏览器接收后，替换当前页面中对应的模块代码，实现“热更新”，无需刷新页面。
- 适配注意事项：HMR 需框架或库提供适配支持，例如 Vue 项目需配合 `vue-loader`，React 项目需配合 `react-refresh-webpack-plugin` 和 `react-refresh`；纯 JS 模块（无框架依赖）需手动编写 HMR 接受逻辑，示例：       `// 纯JS模块手动适配HMR ``if (module.hot) { ``  module.hot.accept('./utils.js', () => { ``    // 模块更新后执行的逻辑，如重新引入模块、更新页面内容 ``    const utils = require('./utils.js'); ``    console.log('utils模块已更新', utils); ``  }); ``}`
- Webpack 5 优化点：相比 Webpack 4，Webpack 5 无需手动引入 `HotModuleReplacementPlugin`，启用 `devServer.hot: true` 后会自动注入，配置更简洁，且热更新速度更快。

对应问题：1. 模块热替换（HMR）的核心作用是什么？2. HMR 的工作原理是什么？3. 纯 JS 模块如何适配 HMR？4. Webpack 5 中开启 HMR 与 Webpack 4 有什么区别？

#### 合理配置 Source Maps

Source Maps（源码映射）的核心作用是将打包后的压缩/混淆代码，映射回原始源码（如 JS、SCSS 等），方便开发者在浏览器中调试，定位代码错误。本地开发需在“构建速度”和“调试精度”之间找到平衡，选择合适的 `devtool` 配置，避免因配置不当导致构建缓慢或调试不便。

核心配置示例（本地开发推荐）：

```javascript
// webpack.config.js
module.exports = {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map', // 本地开发最优配置
  // 其他配置...
};
```

扩展知识点：

- 常用 devtool 配置（本地开发）：        
  - `eval-cheap-module-source-map`：推荐配置，构建速度快，能映射到原始源码（忽略列映射），满足日常调试需求；
  - `eval`：构建速度极快，但仅能映射到打包后的模块，无法定位原始源码，适合大型项目快速构建、无需精准调试的场景；
  - `inline-source-map`：调试精度极高，能映射到原始源码的行和列，但构建速度较慢，适合需要精准定位错误的场景；
  - `cheap-module-source-map`：构建速度中等，能映射到原始源码（忽略列映射），适配部分复杂项目。
- 注意事项：本地开发不推荐使用 `source-map`（构建速度极慢），该配置更适合生产环境（需要精准调试线上错误）；Webpack 5 对 Source Maps 进行了性能优化，相同配置下，构建速度比 Webpack 4 更快。

对应问题：1. Source Maps 的核心作用是什么？2. 本地开发推荐使用哪种 `devtool` 配置，为什么？3. 不同 `devtool` 配置的核心区别是什么？

#### devServer 进阶优化

除 HMR 和 Source Maps 外，`devServer` 的其他配置可进一步优化本地开发体验，减少开发过程中的冗余操作，提升响应速度。

核心配置示例：

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'development',
  devServer: {
    hot: true,
    hotOnly: true,
    port: 3000,
    open: true,
    static: {
      directory: path.resolve(__dirname, 'public'), // 指定静态资源目录
      watch: true // 监听静态资源变化，自动更新页面（无需手动刷新）
    },
    historyApiFallback: true, // 解决SPA（单页面应用）路由刷新404问题
    compress: true, // 启用gzip压缩，提升静态资源（如HTML、CSS）加载速度
    client: {
      overlay: {
        errors: true, // 代码报错时，在浏览器页面显示全屏错误覆盖层，便于快速发现错误
        warnings: false // 关闭警告覆盖层，避免干扰开发
      }
    },
    proxy: {
      // 配置接口代理，解决本地开发跨域问题
      '/api': {
        target: 'http://localhost:8080', // 后端接口地址
        changeOrigin: true, // 允许跨域
        pathRewrite: { '^/api': '' } // 重写路径，去掉/api前缀
      }
    }
  }
};
```

扩展知识点：

- 静态资源监听：`static.watch: true` 可监听 public 目录下的静态资源（如图片、HTML）变化，无需重启开发服务器，自动更新页面；
- SPA 路由适配：`historyApiFallback: true` 可解决 SPA 应用中，通过路由跳转后刷新页面出现 404 的问题，将所有路由请求转发到 index.html；
- 接口代理：本地开发中，前端项目与后端接口存在跨域时，通过 `proxy` 配置可实现接口转发，避免跨域限制，无需后端配置 CORS；
- gzip 压缩：`compress: true` 启用后，开发服务器会对静态资源进行 gzip 压缩，减小资源体积，提升加载速度，模拟线上环境的资源加载效果。

对应问题：1. `devServer` 中 `historyApiFallback` 的作用是什么？2. 如何通过 `devServer` 配置解决本地开发跨域问题？3. `static.watch: true` 的核心作用是什么？

### 生产环境优化

生产环境优化的核心是优化产物质量，核心目标是：缩小产物体积、提升页面加载速度、优化缓存策略、保证代码运行稳定性。Webpack 5 内置了多种生产环境优化能力，结合插件和配置调优，可显著提升线上项目的运行性能。

#### 产物压缩优化（JS + CSS）

生产环境中，需对 JS 和 CSS 产物进行压缩，移除冗余代码（如注释、空格）、混淆变量名，减小资源体积，提升页面加载速度。Webpack 5 内置了 JS 压缩工具（TerserPlugin），CSS 压缩需配合 `CssMinimizerPlugin` 实现。

核心配置示例（结合用户提供代码片段优化）：

```javascript
// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production', // 生产环境模式（自动启用部分优化）
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js', // 配合缓存策略
    assetModuleFilename: 'assets/[hash][ext][query]',
    clean: true // 自动清理dist目录，避免旧产物残留
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'] // 提取CSS为独立文件
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css', // 提取后的CSS文件名，配合缓存
    }),
  ],
  optimization: {
    minimize: true, // 开启产物压缩（生产环境默认开启）
    minimizer: [
      new TerserPlugin({
        // JS压缩配置（可选，默认已优化）
        terserOptions: {
          compress: {
            drop_console: true, // 移除console.log，减小体积（可选）
            drop_debugger: true // 移除debugger，提升安全性
          }
        }
      }),
      new CssMinimizerPlugin() // CSS压缩插件
    ]
  }
};
```

扩展知识点：

- JS 压缩：Webpack 5 生产环境默认启用 `TerserPlugin`，无需额外安装，可通过 `terserOptions` 配置个性化压缩规则（如移除 console、debugger）；
- CSS 压缩：`CssMinimizerPlugin` 需单独安装（`npm install css-minimizer-webpack-plugin -D`），配合 `MiniCssExtractPlugin` 使用，将 CSS 提取为独立文件后进行压缩；
- 优化细节：压缩时会自动移除冗余代码（如重复样式、无用变量）、简化选择器、压缩属性值，进一步减小 CSS 体积；
- 注意事项：开发环境不建议开启压缩，会增加构建耗时，影响开发效率。

对应问题：1. 生产环境中如何实现 JS 和 CSS 产物的压缩？2. `TerserPlugin` 和 `CssMinimizerPlugin` 的核心作用是什么？3. 为什么开发环境不建议开启产物压缩？

#### 代码分割（Split Chunks）优化

代码分割（Code Splitting）是生产环境的核心优化手段之一，其核心作用是：将打包后的代码拆分为多个小的代码块（Chunk），避免单文件体积过大，实现“按需加载”，提升首屏加载速度；同时抽离公共依赖，实现缓存复用，减少重复加载。

核心配置示例（结合用户提供代码片段优化）：

```javascript
// webpack.config.js
module.exports = {
  // 其他配置...
  optimization: {
    splitChunks: {
      chunks: 'all', // 对所有类型的代码块（initial、async、vendor）进行分割
      minSize: 20000, // 代码块最小体积（20KB），小于该值不分割
      minRemainingSize: 0, // 分割后剩余体积不小于0（确保分割有效）
      minChunks: 1, // 代码块被引用至少1次才会分割
      maxAsyncRequests: 30, // 异步加载的代码块最多30个
      maxInitialRequests: 30, // 初始加载的代码块最多30个
      cacheGroups: {
        // 抽离第三方依赖（如vue、react、axios等）
        vendors: {
          test: /[\\/]node_modules[\\/]/, // 匹配node_modules目录下的模块
          priority: -10, // 优先级（数值越高，越先分割）
          reuseExistingChunk: true, // 复用已存在的代码块，避免重复打包
          name: 'vendors' // 分割后的代码块名称（vendors.js）
        },
        // 抽离公共业务代码（被多个组件/页面引用的代码）
        common: {
          name: 'common', // 分割后的代码块名称（common.js）
          minChunks: 2, // 被引用至少2次才会分割
          priority: -20, // 优先级低于vendors
          reuseExistingChunk: true // 复用已存在的代码块
        }
      }
    }
  }
};
```

扩展知识点：

- `chunks: 'all'` 详解：该配置表示对所有类型的代码块进行分割，包括初始代码块（initial，入口文件直接引用的代码）、异步代码块（async，通过 `import()` 动态引入的代码）、第三方依赖代码块（vendor）；
- 缓存组（cacheGroups）：用于自定义分割规则，`vendors` 缓存组专门抽离第三方依赖，`common` 缓存组抽离公共业务代码，两者分离可实现“第三方依赖缓存复用”（第三方依赖更新频率低，用户首次加载后可缓存，后续无需重新加载）；
- 按需加载：通过 `import()` 动态引入模块，Webpack 会自动将该模块分割为独立的代码块，只有当用户触发对应操作（如点击路由）时，才会加载该代码块，减少首屏加载压力；示例：        `// 动态引入组件，实现按需加载 ``const Home = () => import('./pages/Home.vue'); ``const About = () => import('./pages/About.vue');`
- Webpack 5 优化点：相比 Webpack 4，`splitChunks` 配置更简洁，默认分割规则更合理，且分割效率更高，能自动识别重复依赖并复用。

对应问题：1. 代码分割（Split Chunks）的核心作用是什么？2. `splitChunks.chunks: 'all'` 表示什么含义？3. 缓存组（cacheGroups）的作用是什么，常用的缓存组有哪些？4. 如何实现代码的按需加载？

#### Tree Shaking 优化（移除无用代码）

Tree Shaking（摇树优化）的核心作用是：移除代码中未被使用的无用代码（死代码），减小产物体积。Webpack 5 内置 Tree Shaking 能力，无需额外安装插件，只需开启相关配置即可生效。

核心配置示例（结合用户提供代码片段）：

```javascript
// webpack.config.js
module.exports = {
  mode: 'production', // 生产环境默认开启Tree Shaking
  optimization: {
    usedExports: true, // 标记未被使用的代码，配合minimize删除无用代码
    // 其他优化配置...
  }
};
```

扩展知识点：

- Tree Shaking 生效条件：        
  - 构建模式为 `production`（开发环境默认关闭，避免影响开发体验）；
  - 模块规范为 ES Module（`import`/`export`），CommonJS 规范（`require`/`module.exports`）无法生效（因为 CommonJS 是动态引入，Webpack 无法确定哪些代码未被使用）；
  - 开启 `usedExports: true`（标记未被使用的代码），配合 `minimize: true`（删除标记的无用代码）。
- 注意事项：如果项目中存在副作用代码（如全局变量修改、DOM 操作），需在 `package.json` 中配置 `sideEffects`，避免 Tree Shaking 误删有用代码；示例：        `// package.json ``{ ``  "sideEffects": [ ``    "*.css", // CSS文件有副作用，不进行Tree Shaking ``    "./src/utils/global.js" // 全局副作用文件，不进行Tree Shaking ``  ] ``}`
- 扩展：Tree Shaking 不仅适用于 JS 代码，也适用于 CSS 代码（配合 `mini-css-extract-plugin` 和 `css-minimizer-webpack-plugin`，可移除未被使用的 CSS 样式）。

对应问题：1. Tree Shaking 的核心作用是什么？2. Tree Shaking 生效的条件有哪些？3. 如何避免 Tree Shaking 误删有副作用的代码？

#### 缓存优化（提升二次加载速度）

缓存优化的核心目标是：让用户首次加载后，后续访问时无需重新加载未变化的资源，提升二次加载速度。Webpack 5 提供了两种缓存优化方式：构建缓存（提升构建速度）和产物缓存（提升用户访问速度）。

核心配置示例（结合用户提供代码片段优化）：

```javascript
// webpack.config.js
module.exports = {
  // 1. 构建缓存（提升生产环境构建速度，避免重复构建）
  cache: {
    type: 'filesystem', // 采用文件系统缓存
    buildDependencies: {
      config: [__filename] // 当Webpack配置文件变化时，重新构建缓存
    },
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'), // 缓存目录
  },
  // 2. 产物缓存（提升用户二次加载速度）
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js', // contenthash：基于文件内容生成哈希值
    assetModuleFilename: 'assets/[hash][ext][query]',
    clean: true
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css', // CSS文件也使用contenthash
    }),
  ]
};
```

扩展知识点：

- 构建缓存（filesystem 缓存）：Webpack 5 替代了旧版本的 `hard-source-webpack-plugin`，内置文件系统缓存，将每次构建的结果（如编译后的模块、依赖图）缓存到本地目录，下次构建时，若文件未变化，直接复用缓存，大幅提升构建速度（大型项目可节省 50% 以上构建时间）；
- 产物缓存（contenthash）：`contenthash` 是基于文件内容生成的哈希值，只有当文件内容发生变化时，哈希值才会改变；用户首次加载后，浏览器会缓存带有哈希值的资源，后续访问时，若哈希值未变，浏览器直接使用缓存，无需重新加载；
- 哈希值区别：`contenthash`（基于文件内容）优于 `hash`（基于整个项目构建）和 `chunkhash`（基于代码块），因为 `contenthash` 能精准反映文件变化，避免因其他文件变化导致缓存失效；
- 注意事项：`clean: true` 需开启，避免旧的缓存产物残留，导致用户加载旧资源。

对应问题：1. Webpack 5 的缓存优化分为哪两种，各自的作用是什么？2. `contenthash` 的核心作用是什么，与 `hash`、`chunkhash` 有什么区别？3. 构建缓存（filesystem）的核心优势是什么？

#### HTML 优化

生产环境中，HTML 作为入口文件，其优化核心是：压缩 HTML 代码、自动引入打包后的 JS/CSS 资源、避免资源路径错误，提升 HTML 加载速度。通过 `HtmlWebpackPlugin` 可实现所有 HTML 优化需求。

核心配置示例（结合用户提供代码片段优化）：

```javascript
// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // 其他配置...
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // HTML模板路径
      inject: 'body', // 将JS资源注入到body标签末尾，避免阻塞HTML解析
      minify: {
        collapseWhitespace: true, // 移除HTML中的空格和换行
        removeComments: true, // 移除HTML注释
        removeRedundantAttributes: true, // 移除冗余属性（如input的type="text"）
        removeScriptTypeAttributes: true, // 移除script标签的type属性（默认type="text/javascript"）
        removeStyleLinkTypeAttributes: true, // 移除link标签的type属性（默认type="text/css"）
        useShortDoctype: true, // 使用短文档类型（<!DOCTYPE html>）
      },
      favicon: './src/assets/favicon.ico', // 配置网站图标（可选）
      title: 'Webpack 优化示例' // 配置HTML标题（可选）
    }),
  ]
};
```

扩展知识点：

- HTML 压缩：`minify` 配置可移除 HTML 中的冗余内容（空格、注释、冗余属性），减小 HTML 文件体积，提升加载速度；
- 资源自动注入：`HtmlWebpackPlugin` 会自动将打包后的 JS、CSS 资源引入 HTML，无需手动编写 `script` 和 `link` 标签，避免路径错误；
- inject 配置：`inject: 'body'` 表示将 JS 资源注入到 body 标签末尾，避免 JS 加载阻塞 HTML 解析（若注入到 head 标签，JS 加载会阻塞 HTML 渲染）；
- 多页面配置：若项目为多页面应用，可配置多个 `HtmlWebpackPlugin` 实例，每个页面对应一个配置，实现多页面 HTML 优化。

对应问题：1. 生产环境中 HTML 优化的核心目标是什么？2. `HtmlWebpackPlugin` 的核心作用是什么？3. `minify` 配置中各属性的作用是什么？

#### 构建分析与优化（定位性能瓶颈）

生产环境构建时，若遇到构建速度慢、产物体积过大的问题，可通过 `BundleAnalyzerPlugin` 分析打包产物的结构，定位性能瓶颈（如体积过大的模块、重复打包的依赖），针对性进行优化。

核心配置示例（结合用户提供代码片段）：

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // 其他配置...
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static', // 生成静态HTML报告（默认是server，启动服务器展示）
      reportFilename: 'bundle-analyzer.html', // 报告文件名
      openAnalyzer: false // 构建完成后不自动打开报告（避免干扰构建）
    }),
  ]
};
```

扩展知识点：

- 插件作用：`BundleAnalyzerPlugin` 会生成一个静态 HTML 报告，展示打包后每个模块的体积占比、依赖关系，可清晰看到哪些模块体积过大（如第三方依赖、未按需加载的组件）；
- 常见优化场景：        
  - 若某个第三方依赖体积过大（如 lodash），可替换为体积更小的替代库（如 lodash-es），或按需引入（如 `import { debounce } from 'lodash-es'`）；
  - 若发现重复打包的依赖，可通过 `splitChunks` 配置抽离公共依赖，避免重复打包；
  - 若业务代码体积过大，可拆分代码块，实现按需加载。
- 注意事项：该插件仅用于开发和优化阶段，生产环境构建时可注释或删除，避免生成多余的报告文件。

对应问题：1. `BundleAnalyzerPlugin` 的核心作用是什么？2. 如何通过构建分析定位打包性能瓶颈？3. 针对体积过大的模块，有哪些优化方案？

### 优化配置总结

Webpack 5 优化的核心是“分环境优化”：本地开发侧重提升开发效率（HMR、Source Maps、devServer 优化），生产环境侧重优化产物质量（压缩、代码分割、Tree Shaking、缓存优化）。结合上述所有优化配置，可实现“开发高效、线上流畅”的目标，以下是完整的生产环境优化配置整合（参考用户提供代码片段，补充完善）：

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    assetModuleFilename: 'assets/[hash][ext][query]',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024
          }
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
      inject: 'body',
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-analyzer.html',
      openAnalyzer: false
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
          name: 'vendors'
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    },
    usedExports: true,
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
};
```

对应问题：1. 整合 Webpack 5 生产环境的核心优化配置，说明各配置的作用？2. 如何平衡 Webpack 构建速度和产物质量？
