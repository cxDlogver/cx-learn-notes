# V8 引擎原理演示项目

一个交互式的 V8 JavaScript 引擎内部原理演示项目，使用 React + TypeScript + Vite 构建。

## 📦 功能特性

### 1. 数组内部实现演示
- 可视化 ElementsKind 层次结构
- 演示 PACKED/HOLEY/DICTIONARY 元素类型
- join() 算法的 Buffer 优化策略
- Hole 处理机制

### 2. JIT 编译演示
- Ignition 解释器工作流程
- TurboFan 优化编译器触发条件
- 代码热度与优化阈值
- Inline Caching 和内联优化

### 3. 隐藏类 (Hidden Class) 演示
- 对象结构共享机制
- Map 转换过程可视化
- 属性访问优化原理
- 最佳实践代码模式对比

### 4. 垃圾回收演示
- 标记 - 清除算法可视化
- 新生代/老生代分代回收
- Scavenge 和 Mark-Sweep-Compact 算法
- 内存泄漏检测技巧

## 🚀 快速开始

### 安装依赖

```bash
cd v8-demo
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
npm run build
```

### 预览构建

```bash
npm run preview
```

## 📁 项目结构

```
v8-demo/
├── src/
│   ├── components/
│   │   └── DemoCard.tsx       # 可复用演示组件
│   ├── examples/
│   │   ├── ArrayDemo.tsx      # 数组实现演示
│   │   ├── JITDemo.tsx        # JIT 编译演示
│   │   ├── HiddenClassDemo.tsx # 隐藏类演示
│   │   └── GarbageCollectionDemo.tsx # GC 演示
│   ├── App.tsx                 # 主应用组件
│   ├── main.tsx                # 入口文件
│   └── index.css               # 全局样式
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 学习要点

### 数组优化
- 理解 ElementsKind 对性能的影响
- 避免在数组中创建 hole
- 理解 join() 的内部优化策略

### JIT 编译
- 理解代码热度如何触发优化
- 识别可被优化的代码模式
- 避免导致去优化的陷阱

### 隐藏类
- 按相同顺序声明对象属性
- 避免使用 delete 操作符
- 使用构造函数创建对象

### 垃圾回收
- 理解分代回收原理
- 识别常见的内存泄漏模式
- 使用 WeakMap/WeakSet 优化内存

## 📚 扩展阅读

- [V8 官方文档](https://v8.dev/docs)
- [V8 源码仓库](https://github.com/v8/v8)
- [V8 博客](https://v8.dev/blog)
- [TC39 ECMA-262 规范](https://tc39.es/ecma262/)

## 🛠️ 技术栈

- **React 18** - UI 框架
- **TypeScript 5** - 类型系统
- **Vite 5** - 构建工具
- **CSS Modules** - 样式方案

## 📄 许可证

MIT License

## 🔗 相关资源

本项目的 TQ 源码示例位于项目根目录：
- `array-join.tq` - V8 数组 join 方法的 TQ 实现
- `array-first-last.tq` - 扩展的数组方法示例
