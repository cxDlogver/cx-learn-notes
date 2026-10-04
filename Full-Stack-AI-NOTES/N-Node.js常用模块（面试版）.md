# Node.js常用模块（面试版）

本文整理Node.js面试高频常用模块，分为内置核心模块和第三方模块，涵盖各模块核心作用、常见方法、示例代码及适用场景，配套面试高频问题，便于快速复习和应对面试考查。

本文负责 API 与面试速查；Node Process、Runtime API、Event Loop、异步 I/O、Worker Thread、Child Process 以及这些模块在完整运行链中的位置，统一参考 [Node.js Runtime 完整知识体系](./N-NodeJS核心总结.md)。

## 内置核心模块

内置核心模块是Node.js自带的模块，无需安装即可通过`require`引入，是服务端开发和面试的核心考点，重点掌握各模块的作用、常用方法及适用场景。

### path模块

核心作用：专门处理文件和目录路径，解决不同操作系统路径格式差异问题，提供简洁的路径操作工具（Node官方说明：node:path 提供了处理文件/目录路径的工具）。

常见方法及示例：

```javascript
// 引入path模块
const path = require('node:path');

// 1. 拼接路径（自动处理操作系统路径分隔符）
path.join(__dirname, 'src', 'index.js'); 
// 示例：__dirname为当前文件所在目录，拼接后得到「当前目录/src/index.js」

// 2. 解析绝对路径（从当前工作目录出发，解析为绝对路径）
path.resolve('a', 'b'); 
// 示例：若当前工作目录为/root，解析后得到「/root/a/b」

// 3. 获取路径中的文件名（可指定排除扩展名）
path.basename('/a/b/c.txt'); // 输出：c.txt
path.basename('/a/b/c.txt', '.txt'); // 输出：c

// 4. 获取文件扩展名
path.extname('index.html'); // 输出：.html
path.extname('app.js'); // 输出：.js
```

适用场景：

- 项目中拼接文件/目录路径（如引入模块、读取文件时）

- 解析路径的绝对路径，避免相对路径混乱

- 提取文件名、文件扩展名（如文件上传时判断文件类型）

### fs模块

核心作用：与文件系统交互，提供文件/目录的读写、创建、删除等操作（Node官方说明：node:fs 用于以POSIX风格方式与文件系统交互，同时提供callback、sync和promise风格API）。

常见方法及示例：

```javascript
// 引入fs模块（同步/回调风格）和fs/promises（Promise风格，推荐）
const fs = require('node:fs');
const fsp = require('node:fs/promises');

// 1. 同步读取文件（阻塞式，适用于简单场景）
const content1 = fs.readFileSync('./a.txt', 'utf-8');
console.log(content1); // 输出文件a.txt的内容

// 2. 同步写入文件（覆盖写入，无则创建）
fs.writeFileSync('./b.txt', 'hello node.js');

// 3. Promise风格读取文件（异步非阻塞，推荐用于项目开发）
async function readFile() {
  const content2 = await fsp.readFile('./a.txt', 'utf-8');
  console.log(content2);
}
readFile();
```

适用场景：

- 文件的读写操作（如配置文件读取、日志写入）

- 目录的创建、删除、遍历（如项目初始化创建目录）

- 文件上传下载的底层处理（如接收上传文件、读取下载文件）

- 日志落盘（将服务端日志写入本地文件）

### http/https模块

核心作用：http模块用于创建HTTP服务器、发起服务端HTTP请求；https模块用于创建HTTPS服务器、发起HTTPS请求（Axios在Node端底层就使用原生http模块）。

常见方法及示例（http模块）：

```javascript
// 引入http模块
const http = require('node:http');

// 1. 创建HTTP服务器
const server = http.createServer((req, res) => {
  // 设置响应头（解决跨域基础问题）
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  // 响应内容并结束请求
  res.end('hello node.js');
});

// 监听3000端口，启动服务器
server.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});

// 2. 发起服务端HTTP请求
http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); }); // 输出：hello node.js
});
```

适用场景：

- 原生搭建HTTP/HTTPS服务（理解Web框架底层原理）

- 服务端发起HTTP/HTTPS请求（如调用第三方接口）

- 理解Express、Koa等Web框架的底层实现（依赖http模块）

### os模块

核心作用：获取当前操作系统的相关信息，用于服务端运行环境判断、资源监控等。

常见方法及示例：

```javascript
// 引入os模块
const os = require('node:os');

// 1. 获取操作系统平台（如windows、linux、darwin）
console.log(os.platform());

// 2. 获取CPU信息（核心数、型号等），常用于判断服务器性能
console.log(os.cpus().length); // 输出CPU核心数

// 3. 获取总内存大小（单位：字节）
console.log(os.totalmem());

// 4. 获取空闲内存大小
console.log(os.freemem());

// 5. 获取系统临时目录
console.log(os.tmpdir());
```

适用场景：

- 服务端运行环境判断（如区分Windows和Linux，执行不同操作）

- 服务器资源监控（如CPU核心数、内存使用情况）

- 获取临时目录，用于临时文件存储（如上传文件临时缓存）

### url模块

核心作用：用于URL的解析、拼接和处理，简化URL相关操作。

常见方法及示例：

```javascript
// 引入url模块
const url = require('node:url');

// 1. 解析URL（推荐使用new URL()，更直观）
const myURL = new URL('https://example.com:8080/path?name=tom&age=20');

// 获取URL各部分信息
console.log(myURL.hostname); // 输出：example.com（主机名，不含端口）
console.log(myURL.port); // 输出：8080（端口）
console.log(myURL.pathname); // 输出：/path（路径）
console.log(myURL.searchParams.get('name')); // 输出：tom（获取query参数）
console.log(myURL.searchParams.get('age')); // 输出：20

// 2. 拼接URL
const baseUrl = 'https://example.com';
const path = '/user';
const query = '?id=123';
const fullUrl = new URL(path + query, baseUrl);
console.log(fullUrl.href); // 输出：https://example.com/user?id=123
```

适用场景：

- 解析服务端请求地址（如获取请求路径、query参数）

- 拼接URL（如构造第三方接口请求地址）

- 提取URL中的主机名、端口、路径等信息

### events模块

核心作用：实现事件的发布/订阅模式，是Node.js异步编程的核心机制之一（Node官方明确说明：streams are instances of EventEmitter），很多内置模块（如stream、http）都基于该模块。

常见方法及示例：

```javascript
// 引入events模块，获取EventEmitter类
const EventEmitter = require('node:events');

// 创建事件总线实例
const bus = new EventEmitter();

// 1. 订阅事件（on：监听事件，可多次触发）
bus.on('done', (msg) => {
  console.log('事件触发：', msg);
});

// 2. 订阅一次性事件（once：只触发一次，触发后自动取消订阅）
bus.once('onceEvent', () => {
  console.log('一次性事件，只触发一次');
});

// 3. 发布事件（emit：触发指定事件，并传递参数）
bus.emit('done', '任务完成');
bus.emit('done', '再次触发任务完成');
bus.emit('onceEvent');
bus.emit('onceEvent'); // 无输出，已取消订阅

// 4. 取消订阅（off：移除指定事件的监听）
bus.off('done', (msg) => {
  console.log('事件触发：', msg);
});
```

适用场景：

- 自定义事件总线（如服务端内部模块间通信）

- 事件驱动编程（如处理异步任务完成后的回调）

- 理解Node.js异步模型（如stream的data、end事件）

### stream模块

核心作用：提供流式处理数据的抽象接口，用于分块处理大数据（如大文件），减少内存占用（Node官方说明：stream是处理流式数据的抽象接口，请求对象和process.stdout都是stream）。

常见方法及示例：

```javascript
// 引入fs和stream模块（fs可创建文件流）
const fs = require('node:fs');
const { pipeline } = require('node:stream');

// 1. 创建可读流（读取大文件）
const readStream = fs.createReadStream('./big.zip');
// 2. 创建可写流（写入目标文件）
const writeStream = fs.createWriteStream('./copy.zip');

// 3. 管道流：将可读流的数据直接传递到可写流（自动处理背压）
readStream.pipe(writeStream);

// 4. 使用pipeline（推荐，更安全，支持错误处理）
pipeline(
  fs.createReadStream('./big.zip'),
  fs.createWriteStream('./copy2.zip'),
  (err) => {
    if (err) console.error('复制失败：', err);
    else console.log('复制成功');
  }
);
```

适用场景：

- 大文件读写（如视频、压缩包，避免一次性读取占用过多内存）

- 文件上传下载（分块传输数据，提升效率）

- 数据分块处理（如日志流式写入、大数据解析）

### crypto模块

核心作用：提供加密、解密、哈希、签名验签等安全相关能力（Node官方说明：node:crypto提供哈希、HMAC、加解密、签名验签等能力）。

常见方法及示例：

```javascript
// 引入crypto模块
const crypto = require('node:crypto');

// 1. 生成哈希值（如密码加密存储，常用sha256）
const hash = crypto.createHash('sha256')
  .update('user123456') // 要加密的内容
  .digest('hex'); // 输出格式（hex：十六进制）
console.log(hash); // 输出加密后的哈希值

// 2. HMAC签名（带密钥的哈希，更安全）
const hmac = crypto.createHmac('sha256', 'secretKey') // secretKey为密钥
  .update('hello')
  .digest('hex');
console.log(hmac);

// 3. 简单加密解密（AES示例）
const algorithm = 'aes-128-cbc';
const key = crypto.scryptSync('password', 'salt', 16); // 生成密钥
const iv = crypto.randomBytes(16); // 生成初始向量

// 加密
const cipher = crypto.createCipheriv(algorithm, key, iv);
let encrypted = cipher.update('secret data', 'utf8', 'hex');
encrypted += cipher.final('hex');

// 解密
const decipher = crypto.createDecipheriv(algorithm, key, iv);
let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');
console.log(decrypted); // 输出：secret data
```

适用场景：

- 用户密码加密存储（如用sha256生成哈希，不存储明文）

- Token签名与验签（如JWT签名，确保数据不被篡改）

- 数据完整性校验（如文件哈希校验，判断文件是否被修改）

- 敏感数据加密解密（如传输敏感信息时加密）

### util模块

核心作用：提供Node.js内部API和应用/模块开发常用的工具方法（Node官方说明：node:util支持Node内部API和应用/模块开发常见工具能力）。

常见方法及示例：

```javascript
// 引入util模块
const util = require('node:util');

// 1. promisify：将回调风格的函数转为Promise风格（常用）
const fsReadFile = util.promisify(fs.readFile);
// 用法：可配合async/await使用
async function read() {
  const content = await fsReadFile('./a.txt', 'utf-8');
  console.log(content);
}

// 2. callbackify：将Promise风格的函数转为回调风格（较少用）
const readCallback = util.callbackify(read);
readCallback((err, content) => {
  if (err) console.error(err);
  else console.log(content);
});

// 3. inspect：调试输出（格式化对象，便于查看）
const obj = { name: 'tom', age: 20, arr: [1, 2, 3] };
console.log(util.inspect(obj, { depth: null })); // 完整输出对象结构
```

适用场景：

- Promise化回调函数（如将fs的回调方法转为Promise，配合async/await简化代码）

- 调试输出（inspect方法可格式化复杂对象，便于开发调试）

- Node.js内部API的工具辅助（如类型判断、函数绑定）

### timers模块

核心作用：提供定时器相关能力，用于延迟执行、定时执行任务，Node.js全局对象已挂载该模块的方法，可直接使用。

常见方法及示例：

```javascript
// 1. setTimeout：延迟指定时间执行一次（单位：毫秒）
const timer1 = setTimeout(() => {
  console.log('延迟1秒执行');
}, 1000);
// 取消定时器
clearTimeout(timer1);

// 2. setInterval：每隔指定时间执行一次（单位：毫秒）
const timer2 = setInterval(() => {
  console.log('每隔1秒执行一次');
}, 1000);
// 取消定时器
clearInterval(timer2);

// 3. setImmediate：在当前事件循环的末尾执行（比setTimeout(fn, 0)更可靠）
setImmediate(() => {
  console.log('当前事件循环末尾执行');
});
```

适用场景：

- 延迟执行任务（如延迟发送通知、定时清理缓存）

- 定时执行任务（如定时同步数据、定时日志切割）

- 事件循环相关操作（setImmediate用于异步任务的顺序控制）

### process模块

核心作用：提供当前Node.js进程的相关信息，用于进程管理、环境配置、信号处理等，是全局模块，无需require即可使用。

常见方法及示例：

```javascript
// 1. 获取环境变量（常用，如获取配置信息）
console.log(process.env.NODE_ENV); // 输出：development/production（开发/生产环境）
console.log(process.env.PORT); // 输出：端口号（如3000）

// 2. 获取进程信息
console.log(process.pid); // 输出：当前进程ID
console.log(process.version); // 输出：Node.js版本

// 3. 退出进程
process.exit(0); // 正常退出（code=0）
process.exit(1); // 异常退出（code=1）

// 4. 监听进程信号（如终止进程信号）
process.on('SIGINT', () => {
  console.log('进程被终止');
  process.exit(0);
});
```

适用场景：

- 获取环境变量（区分开发/生产环境，加载不同配置）

- 进程管理（如退出进程、监听进程异常）

- 获取进程信息（如进程ID、Node版本，用于日志记录）

### buffer模块

核心作用：处理二进制数据，Node.js中Buffer是全局对象，无需require即可使用，用于存储二进制数据（如文件、网络数据）。

常见方法及示例：

```javascript
// 1. 创建Buffer（三种方式）
const buf1 = Buffer.from('hello', 'utf8'); // 从字符串创建
const buf2 = Buffer.alloc(5); // 创建指定长度的空Buffer（初始化0）
const buf3 = Buffer.allocUnsafe(5); // 创建指定长度的空Buffer（不初始化，速度快）

// 2. Buffer转字符串
console.log(buf1.toString('utf8')); // 输出：hello

// 3. Buffer拼接
const buf4 = Buffer.from('world');
const buf5 = Buffer.concat([buf1, buf4]);
console.log(buf5.toString()); // 输出：helloworld

// 4. Buffer写入数据
buf2.write('node', 0, 4, 'utf8');
console.log(buf2.toString()); // 输出：node
```

适用场景：

- 处理二进制数据（如文件读取、网络传输的数据）

- 字符串与二进制数据的转换（如服务端接收二进制请求体）

- 二进制数据的拼接、切割（如分块接收数据后拼接）

### zlib模块

核心作用：提供数据的压缩与解压能力，支持gzip、deflate等常见压缩格式。

常见方法及示例：

```javascript
// 引入zlib和fs模块
const zlib = require('node:zlib');
const fs = require('node:fs');

// 1. 压缩文件（gzip格式）
fs.createReadStream('./test.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('./test.txt.gz'));

// 2. 解压文件（gzip格式）
fs.createReadStream('./test.txt.gz')
  .pipe(zlib.createGunzip())
  .pipe(fs.createWriteStream('./test-unzip.txt'));
```

适用场景：

- 文件压缩（如日志文件压缩、静态资源压缩）

- 网络传输数据压缩（如接口响应数据压缩，减少传输体积）

- 解压压缩文件（如接收压缩的上传文件、解压第三方压缩包）

### child_process模块

核心作用：创建子进程，用于执行系统命令、运行其他脚本（如shell命令、Python脚本）。

常见方法及示例：

```javascript
// 引入child_process模块
const { exec, spawn } = require('node:child_process');

// 1. exec：执行shell命令，获取输出结果（适用于简单命令）
exec('ls -l', (err, stdout, stderr) => {
  if (err) {
    console.error('执行失败：', stderr);
    return;
  }
  console.log('命令输出：', stdout);
});

// 2. spawn：执行shell命令，流式获取输出（适用于输出量大的命令，如npm install）
const child = spawn('npm', ['install']);
// 监听stdout（标准输出）
child.stdout.on('data', (data) => {
  console.log('输出：', data.toString());
});
// 监听stderr（错误输出）
child.stderr.on('data', (data) => {
  console.error('错误：', data.toString());
});
// 监听子进程退出
child.on('close', (code) => {
  console.log(`子进程退出，退出码：${code}`);
});
```

适用场景：

- 执行系统命令（如文件操作、环境配置命令）

- 运行其他脚本（如在Node.js中执行Python、Shell脚本）

- 工程化工具开发（如构建工具、脚手架，执行编译、打包命令）

## 第三方模块

第三方模块不是Node.js自带的，需通过npm、pnpm、yarn等包管理工具安装，是项目开发中常用的工具，面试中重点考查核心模块的作用和基础用法。

### express模块

核心作用：轻量灵活的Node.js Web应用框架（Express官方定义：minimal and flexible Node.js web application framework），用于快速搭建Web服务、开发RESTful API，简化http模块的开发流程。

常见用法及示例：

```javascript
// 1. 安装：npm install express
// 2. 引入并创建应用实例
const express = require('express');
const app = express();

// 3. 中间件：解析JSON格式请求体（必备）
app.use(express.json());

// 4. 定义路由（GET请求）
app.get('/', (req, res) => {
  res.send('Hello World!'); // 响应字符串
});

// 定义带参数的路由（RESTful API）
app.get('/user/:id', (req, res) => {
  const id = req.params.id; // 获取路径参数
  const query = req.query; // 获取query参数
  res.json({ id, query }); // 响应JSON数据
});

// 5. 启动服务器，监听3000端口
app.listen(3000, () => {
  console.log('Express服务器运行在 http://localhost:3000');
});
```

适用场景：

- 快速搭建Web服务（比原生http模块更简洁）

- 开发RESTful API（接口开发、前后端分离项目）

- 使用中间件处理请求（如身份验证、日志记录、跨域处理）

- 路由管理（统一管理接口路径，便于维护）

### axios模块

核心作用：基于Promise的HTTP客户端，可运行在Node.js和浏览器中（Axios官方说明），在Node端底层使用原生http模块，用于发起HTTP/HTTPS请求，简化请求逻辑。

常见用法及示例：

```javascript
// 1. 安装：npm install axios
// 2. 引入axios
const axios = require('axios');

// 3. 发起GET请求
axios.get('https://api.example.com/users', {
  params: { name: 'tom' } // query参数
})
.then(res => {
  console.log('请求成功：', res.data);
})
.catch(err => {
  console.error('请求失败：', err);
});

// 4. 发起POST请求（JSON格式请求体）
axios.post('https://api.example.com/users', {
  name: 'tom',
  age: 20
})
.then(res => {
  console.log('新增用户成功：', res.data);
})
.catch(err => {
  console.error('新增用户失败：', err);
});

// 5. 全局配置（简化请求）
axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.headers.common['Authorization'] = 'Bearer token';

// 简化请求
axios.get('/users');
```

适用场景：

- 服务端发起HTTP请求（调用第三方接口、微服务间通信）

- 统一封装请求逻辑（如设置请求头、拦截器、错误处理）

- 前后端通用的请求工具（浏览器端和Node端均可使用）

### mongoose模块

核心作用：基于Schema的MongoDB ODM（对象文档映射）工具（Mongoose官方说明），内置类型转换、数据校验、查询构建和hooks等能力，用于简化MongoDB数据库操作。

常见用法及示例：

```javascript
// 1. 安装：npm install mongoose
// 2. 引入并连接MongoDB数据库
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/testDB')
.then(() => console.log('数据库连接成功'))
.catch(err => console.error('数据库连接失败：', err));

// 3. 定义Schema（数据模型约束）
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // 必传字段
    trim: true // 去除空格
  },
  age: {
    type: Number,
    min: 0, // 最小值约束
    max: 120 // 最大值约束
  },
  email: {
    type: String,
    unique: true, // 唯一值约束
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // 邮箱格式校验
  }
});

// 4. 定义Model（对应MongoDB中的集合）
const User = mongoose.model('User', UserSchema);

// 5. 新增数据
const user = new User({
  name: 'tom',
  age: 20,
  email: 'tom@example.com'
});
user.save()
.then(res => console.log('新增用户：', res))
.catch(err => console.error('新增失败：', err));

// 6. 查询数据
User.find({ age: { $gt: 18 } }) // 查询年龄大于18的用户
.then(res => console.log('查询结果：', res));
```

适用场景：

- 操作MongoDB数据库（新增、查询、修改、删除数据）

- 定义数据模型和约束（数据校验、类型转换，保证数据一致性）

- 封装数据库查询逻辑（简化复杂查询，提升代码可维护性）

### cors模块

核心作用：解决跨域资源共享（CORS）问题，用于给Node.js Web服务添加CORS响应头，允许前端跨域请求。

常见用法及示例：

```javascript
// 1. 安装：npm install cors
// 2. 引入express和cors
const express = require('express');
const cors = require('cors');
const app = express();

// 3. 全局使用cors中间件（允许所有跨域请求，开发环境常用）
app.use(cors());

// 4. 配置指定跨域来源（生产环境推荐，更安全）
app.use(cors({
  origin: 'https://example.com', // 允许的跨域来源
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 允许的请求方法
  allowedHeaders: ['Content-Type', 'Authorization'] // 允许的请求头
}));

// 定义路由
app.get('/api/user', (req, res) => {
  res.json({ name: 'tom', age: 20 });
});

app.listen(3000);
```

适用场景：

- 前后端分离项目（解决前端跨域请求被浏览器拦截的问题）

- Web服务对外开放接口（允许指定域名跨域访问）

## 面试高频问题

### 内置核心模块相关问题

- path模块的核心作用是什么？列举2个常用方法及用途。

- fs模块有几种API风格？分别是什么？同步和异步API的区别是什么？

- http模块如何创建HTTP服务器？Express框架和http模块的关系是什么？

- events模块的核心机制是什么？EventEmitter的on和once方法有什么区别？

- stream模块的核心作用是什么？为什么处理大文件时推荐使用stream？

- crypto模块的常用场景有哪些？如何用crypto生成密码的哈希值？

- process模块如何获取环境变量？process.exit()的作用是什么？

- buffer模块的作用是什么？Buffer和字符串如何相互转换？

### 第三方模块相关问题

- express框架的核心作用有哪些？如何用express创建一个基础的Web服务？

- axios模块的优势是什么？在Node端和浏览器端的底层实现有什么区别？

- mongoose的作用是什么？Schema和Model的关系是什么？

- cors模块的作用是什么？如何配置指定域名跨域访问？

### 综合问题

- Node.js内置模块和第三方模块的区别是什么？分别举3个例子。

- 开发一个Node.js Web服务，需要用到哪些核心模块和第三方模块？请简要说明用途。

- 如何用fs和stream模块实现大文件的复制？
> （注：文档部分内容可能由 AI 生成）