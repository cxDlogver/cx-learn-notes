# 🚀 V8 Demo 快速启动指南

## 项目已就绪！

V8 引擎原理演示项目已经创建在 `v8-demo` 目录中。

## 📦 项目结构

```
v8-notes/
├── v8-demo/                    # React + TypeScript + Vite 演示项目
│   ├── src/
│   │   ├── components/
│   │   │   └── DemoCard.tsx    # 可复用演示组件
│   │   ├── examples/
│   │   │   ├── ArrayDemo.tsx          # 📦 数组实现演示
│   │   │   ├── JITDemo.tsx            # ⚡ JIT 编译演示
│   │   │   ├── HiddenClassDemo.tsx    # 🗂️ 隐藏类演示
│   │   │   └── GarbageCollectionDemo.tsx  # ♻️ 垃圾回收演示
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── dist/                   # 生产构建输出
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
│
├── array-join.tq               # V8 源码 array-join.tq 详解
├── array-first-last.tq         # 数组扩展方法示例 (TQ 语言)
├── ARRAY_EXTENSION_DOCUMENTATION.md  # 详细开发文档
└── README_V8_DEMO.md           # 本文件
```

## 🎯 启动演示项目

### 方式一：开发模式（推荐）

```bash
cd v8-demo
npm run dev
```

然后访问：**http://localhost:3000**

### 方式二：预览生产构建

```bash
cd v8-demo
npm run preview
```

### 方式三：直接打开已构建的静态文件

```bash
# 使用任意 HTTP 服务器服务 dist 目录
cd v8-demo/dist
python3 -m http.server 8000
```

然后访问：**http://localhost:8000**

## 📚 演示内容

### 1. 📦 数组内部实现
- **ElementsKind 层次结构**: PACKED → HOLEY → DICTIONARY
- **可视化操作**: 添加 hole、查看元素类型变化
- **join() 优化**: Buffer 策略、重复检测、OneByteString 优化
- **性能对比**: 不同元素类型的访问速度差异

### 2. ⚡ JIT 编译演示
- **Ignition 解释器**: 快速启动，生成字节码
- **TurboFan 优化**: 代码热度触发，类型特化
- **执行计数器**: 观察优化触发过程（5 次执行后优化）
- **性能提升**: 优化后可提升 10-100 倍性能

### 3. 🗂️ 隐藏类演示
- **Map 转换**: 动态添加属性时的隐藏类转换
- **共享优化**: 相同结构对象共享隐藏类
- **最佳实践**: 快/慢代码模式对比
- **性能影响**: 隐藏类对属性访问的影响

### 4. ♻️ 垃圾回收演示
- **标记阶段**: 可视化标记可达对象
- **清除阶段**: 回收不可达对象
- **内存分代**: 新生代 (Scavenge) vs 老生代 (Mark-Sweep)
- **GC 技巧**: 避免内存泄漏的最佳实践

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint
```

## 📖 学习路径建议

1. **先阅读源码**：查看 `array-join.tq` 了解 V8 内置函数实现
2. **阅读文档**：阅读 `ARRAY_EXTENSION_DOCUMENTATION.md` 学习 TQ 语言基础
3. **运行演示**：启动 v8-demo，交互式体验 V8 内部机制
4. **动手实践**：参考 `array-first-last.tq` 编写自己的数组方法
5. **深入源码**：访问 https://github.com/v8/v8 探索真实 V8 代码

## 🎨 界面预览

演示项目包含：
- **顶部导航栏**: 4 个主题切换按钮
- **介绍区域**: V8 引擎概览和核心组件
- **交互演示区**: 可操作的可视化演示
- **代码展示区**: 实时显示代码和执行结果
- **知识卡片**: 最佳实践和优化技巧

## 🔗 相关资源

- **V8 官方文档**: https://v8.dev/docs
- **V8 源码**: https://github.com/v8/v8
- **V8 博客**: https://v8.dev/blog
- **TC39 规范**: https://tc39.es/ecma262/

## 💡 提示

- 所有演示组件都是交互式的，点击按钮查看效果
- 代码块可以复制输出结果
- 每个演示都包含「最佳实践」和「常见陷阱」章节
- 建议按顺序体验：数组 → JIT → 隐藏类 → 垃圾回收

---

**祝你学习愉快！** 🎉

如有问题，请查看项目 README.md 或访问 V8 官方文档。
