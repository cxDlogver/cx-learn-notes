# 反面回答模版

本文件用于收录用户明确指出不符合要求的问答样例。只有用户明确说“作为反面模版”“写入反面模版”等，才向本文件追加内容。

反面模版的目的不是保存失败本身，而是帮助后续回答避开同类问题。记录时需要保留原始问题和原始回答，并明确指出缺陷与改进方向。

## 常见问题类型

| 类型 | 表现 |
| --- | --- |
| 内容太少 | 只给结论或几条短句，没有展开机制、边界和例子 |
| 回答片面 | 只解释一个维度，缺少架构、流程、工程实践或反例 |
| 过于摘要 | 像提纲或速记，没有形成完整回答 |
| 证据不足 | 没有本地资料和外部资料依据，或来源不可追溯 |
| 结构混乱 | 没有回答大纲，概念跳跃，主次不清 |
| 晦涩难懂 | 堆术语但没有解释概念关系和判断标准 |
| 重复提问 | 未检查 QA 历史，提出已经记录过的问题 |

## 收录格式

```markdown
## YYYY-MM-DD：问题标题

### 选入原因

- ...

### 主要问题

- ...

### 改进方向

- ...

### 原始问题

...

### 原始回答

...
```

## 已收录样例

## 2026-07-20：任务切片与 Web Worker 基础概念铺垫不足

### 选入原因

- 用户明确指出“问题不好”，回答没有先讲清“任务切片”和 “Web Worker”是什么。
- 回答直接进入方案选择和工程权衡，跳过基础概念、机制流程和最小心智模型。
- 作为反面样例用于提醒：当学习者基础概念未建立时，不能直接输出偏工程实践的综合题。

### 主要问题

- 问题类型偏高阶：题目问“如何在任务切片和 Web Worker 之间选择”，默认学习者已经理解两者机制。
- 概念解释不足：没有先定义 Web Worker 是什么、运行在哪个线程、和主线程如何通信、为什么不能访问 DOM。
- 机制解释不足：没有先定义任务切片是什么、为什么拆成多个 task 能让浏览器穿插处理输入和渲染。
- 学习路径跳跃：前面刚学习 rAF、长任务、代码分割，下一题应先补“长任务如何被拆开”和“计算如何移出主线程”的基础机制。
- 回答虽然有代码，但代码偏实现示例，没有配合足够的流程图和执行时序解释，导致初学者难以理解机制。

### 改进方向

- 先把题目改成基础题：`任务切片和 Web Worker 分别是什么？它们为什么能缓解主线程长任务？`
- 先讲共同背景：主线程长任务会阻塞输入、rAF 和渲染；优化目标是减少连续占用主线程的时间。
- 再分别讲机制：任务切片是“仍在主线程执行，但分段让出控制权”；Web Worker 是“把可独立计算放到后台线程，通过消息和主线程通信”。
- 用文本流程图说明执行时序，再给最小代码；最后才比较适用场景。
- 明确边界：任务切片不能减少总计算量，Worker 不能直接操作 DOM，消息传递和数据复制也有成本。

### 原始问题

当页面出现一个 300ms 的纯 JavaScript 计算任务时，应该如何在“任务切片”和 “Web Worker”之间选择？两种方案分别如何避免阻塞渲染与用户交互？

### 原始回答

### 问题

当页面出现一个 300ms 的纯 JavaScript 计算任务时，应该如何在“任务切片”和 “Web Worker”之间选择？两种方案分别如何避免阻塞渲染与用户交互？

### 回答大纲

- **本题考察什么**：主线程长任务的工程化拆解方案。
- **核心判断**：能拆分且必须访问 DOM 的工作适合任务切片；纯计算密集、可序列化的数据处理优先放入 Web Worker。
- **回答思路**：比较两种方案的执行位置、通信成本、渲染影响和适用边界，再给出 TypeScript 实现示例。

### 正式回答

面对 300ms 纯 JavaScript 计算，首先不能只看“代码是否耗时”，而要看它是否依赖 DOM、是否可拆分、数据传输成本是否可接受、结果是否需要实时反馈。

`Web Worker` 能在后台线程执行脚本，不干扰主 UI 线程；但 Worker 不能直接访问 DOM，主线程和 Worker 之间通常通过消息传递数据。这个结论与 MDN 的 [Web Workers 指南](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) 一致。web.dev 的 [长任务优化指南](https://web.dev/articles/optimize-long-tasks) 也指出，拆分任务和避免主线程阻塞是改善交互响应的重要手段。

| 方案 | 核心方式 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- |
| 任务切片 | 将一个大同步任务拆为多个短 task | 需要直接操作 DOM、可分批处理的列表、渐进式渲染 | 单次计算本身不可拆或每片仍很重 |
| Web Worker | 将纯计算移到后台线程 | 大 JSON 转换、排序、搜索、图像/音视频计算、复杂算法 | 需要直接访问 DOM、数据拷贝成本高且工作量小 |
| rAF 切片 | 每帧只做有限工作 | 视觉更新、动画关联计算、渐进渲染 | 非视觉的大量后台计算 |
| `requestIdleCallback` | 在浏览器空闲时做低优先级工作 | 预计算、缓存预热、非关键统计 | 必须立即完成或兼容性要求严格的关键路径 |

任务切片的关键是：每次只执行一小段，**主动把控制权还给浏览器**，让它可以处理输入、微任务和渲染。

```ts
function processInChunks<T>(
  items: T[],
  processItem: (item: T) => void,
  budgetMs = 8,
): void {
  let index = 0;

  function runChunk(): void {
    const start = performance.now();

    while (index < items.length && performance.now() - start < budgetMs) {
      processItem(items[index]);
      index++;
    }

    if (index < items.length) {
      setTimeout(runChunk, 0);
    }
  }

  runChunk();
}
```

如果这段工作直接影响动画或可视化状态，更适合用 rAF 调度下一片：

```ts
function processVisualWork<T>(
  items: T[],
  processItem: (item: T) => void,
): void {
  let index = 0;

  function frame(): void {
    const start = performance.now();

    while (index < items.length && performance.now() - start < 8) {
      processItem(items[index]);
      index++;
    }

    if (index < items.length) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}
```

注意不要用递归 `Promise.then()` 或 `queueMicrotask()` 做切片。微任务会在渲染前持续清空；不断追加微任务反而可能形成微任务饥饿，浏览器仍然没有机会绘制下一帧。

对于不依赖 DOM 的重计算，Worker 更合适：

```ts
// main.ts
const worker = new Worker(new URL("./calculate.worker.ts", import.meta.url), {
  type: "module",
});

worker.postMessage({ values: largeValues });

worker.onmessage = (
  event: MessageEvent<{ result: number; progress: number }>,
) => {
  resultElement.textContent = String(event.data.result);
  progressElement.style.transform = `scaleX(${event.data.progress})`;
};
```

```ts
// calculate.worker.ts
self.onmessage = (event: MessageEvent<{ values: number[] }>) => {
  let result = 0;

  for (const value of event.data.values) {
    result += Math.sqrt(value);
  }

  self.postMessage({ result, progress: 1 });
};
```

Worker 不是零成本。`postMessage` 默认会进行结构化克隆；传输很大的对象可能产生复制和内存开销。对于 `ArrayBuffer`、`Uint8Array` 等二进制数据，可以使用 transferable objects 转移底层数据所有权，避免复制，但转移后原线程不能继续使用该 buffer。

```ts
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage({ buffer }, [buffer]);

// 此后主线程中的 buffer 已被转移，不能继续读取。
```

### 专业回答总结：

300ms 的纯 JS 计算会阻塞主线程，导致 rAF、渲染和输入响应延迟。需要访问 DOM 或能渐进处理的工作，使用基于时间预算的任务切片，并通过 `setTimeout` 或 rAF 主动让出主线程；不要用无限微任务链切片。

不依赖 DOM 的计算密集任务优先使用 Web Worker，让计算在后台线程运行，主线程只处理消息和 UI 更新。选择时必须同时评估可拆分性、DOM 依赖、实时反馈要求，以及 `postMessage` 的序列化或数据转移成本。
