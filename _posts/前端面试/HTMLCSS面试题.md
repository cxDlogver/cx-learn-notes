---
title: 【⭐】HTMLCSS面试题
categories:
  - 前端面试
tags: 前端三件套
date: 2025-12-11 16:00:32
---



## Grid

### 一、Grid 基础认知类（必问）

**1. 什么是 CSS Grid？解决了什么问题？**
 Grid 是二维布局系统，能同时控制行和列，适合做整体页面结构和复杂布局；相比 Flex（一维），Grid 更擅长“页面级布局”。

**2. Grid 和 Flex 的核心区别是什么？**
 Flex 是一维（主轴），Grid 是二维（行+列）；Flex 偏内容驱动，Grid 偏结构驱动。

**3. Grid 的两类核心角色是什么？**
 Grid Container（网格容器）和 Grid Item（网格项目）。

------

### 二、Grid 容器相关（高频）

**4. 如何开启 Grid 布局？**
 `display: grid` 和 `display: inline-grid` 的区别。

**5. 什么是显式网格和隐式网格？**
 显式：`grid-template-rows / columns` 定义的
 隐式：超出定义后自动生成的（受 `grid-auto-*` 控制）

**6. `grid-template-columns / rows` 是做什么的？**
 定义网格的行列结构，是 Grid 布局的骨架。

**7. `repeat()` 的作用是什么？**
 减少重复书写，常见于等分布局。

**8. `fr` 单位是什么？和 `%` 有什么不同？**
 `fr` 是剩余空间的分配单位，更适合响应式网格。

------

### 三、Grid 项目放置（非常高频）

**9. Grid Item 如何定位？**
 通过 `grid-row`、`grid-column` 或 `grid-area`。

**10. `grid-column: 1 / 3` 表示什么？**
 从第 1 条列线到第 3 条列线，占两列。

**11. `span` 关键字有什么用？**
 表示跨越多少行或列，而不是具体线号。

**12. 什么是网格线、网格轨道、网格单元？**
 线（line）→ 轨道（track）→ 单元（cell）。

------

### 四、命名与 grid-area（面试加分）

**13. `grid-template-areas` 的作用？**
 通过语义化名称定义布局区域，提高可读性。

**14. `grid-area` 在容器和项目中的不同含义？**
 容器中：定义区域
 项目中：指定项目放到哪个区域

**15. 什么时候用 grid-area 比较合适？**
 页面结构清晰、区域固定的布局（如 header / sidebar / main）。

------

### 五、自动布局与自动流（中高频）

**16. `grid-auto-flow` 是干什么的？**
 控制项目自动放置的方向（row / column / dense）。

**17. `dense` 有什么作用？有什么风险？**
 尝试填补空洞，但可能打乱 DOM 顺序。

**18. Grid 默认是按行还是按列填充？**
 默认按行（row）。

------

### 六、对齐与间距（必考）

**19. `gap`、`row-gap`、`column-gap` 的作用？**
 控制网格间距，不影响项目尺寸。

**20. `justify-items / align-items` 和 `justify-content / align-content` 区别？**
 items 控制**单元内项目**
 content 控制**整个网格在容器内的位置**

**21. 为什么 Grid 有这么多对齐属性？**
 因为它是二维布局，需要同时处理行和列两个方向。

------

### 七、响应式与高级能力（高频）

**22. `minmax()` 的作用是什么？**
 定义尺寸的最小和最大范围，是响应式 Grid 的核心。

**23. `auto-fit` 和 `auto-fill` 的区别？**
 `auto-fit` 会折叠空列
 `auto-fill` 会保留空列

**24. Grid 如何实现自适应卡片布局？**
 `repeat(auto-fit, minmax())` 是标准答案。

------

### 八、Grid vs Flex 高频对比题

**25. 哪些场景一定更适合 Grid？**
 页面整体布局、二维对齐、复杂栅格。

**26. 哪些场景 Flex 更合适？**
 导航栏、按钮组、单行排列。

**27. Grid 能不能替代 Flex？**
 不能完全替代，各自擅长不同层级。

------

### 九、性能与实践类（进阶）

**28. Grid 性能如何？**
 现代浏览器已高度优化，性能不是主要瓶颈。

**29. Grid 会影响 DOM 顺序吗？**
 视觉顺序可以改变，但 DOM 顺序不变（无障碍需注意）。

**30. Grid 常见易错点有哪些？**

- 混淆 `items` 和 `content`
- 错用 index 思维理解网格线
- 滥用 `dense`
- 响应式时忘记 `minmax`
