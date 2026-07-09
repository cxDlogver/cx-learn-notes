# DeepAgents 通用智能体开发课程 - QA 审查报告

**审查日期：2024 年**
**审查范围：课程大纲、讲义 brief、Skills 代码**

---

## 1. 审查结论

**整体评级：有条件通过**

课程架构完整，风险意识较强，学员画像匹配度高。Skills 代码实现了核心功能，结构清晰。但在工程细节（类型安全、边界处理、参数校验）方面存在必改项，完成后即可正式交付。

---

## 2. 课程大纲审查结果

| 审查项 | 状态 | 说明 |
|--------|------|------|
| 工程约束 | ✅ 通过 | 产物写入 /workspace/，符合规则 |
| 运行命令 | ✅ 通过 | 所有 demo 命令明确，包含 npm 前缀 |
| HITL 审批流 | ✅ 通过 | 包含 Checkpoint 依赖、审批模式、断点恢复 |
| 安全边界 | ✅ 通过 | 沙箱隔离、文件权限、路径遍历均有说明 |
| Streaming 可观测性 | ✅ 通过 | 三层日志、token 追踪、压缩风险已覆盖 |
| 模块风险点 | ✅ 通过 | 每个模块末尾均有风险提示 |

---

## 3. Skills 代码审查问题列表

| 序号 | 问题描述 | 严重程度 | 所在文件 |
|------|---------|---------|---------|
| 1 | `summarizeOrderMetrics` 缺少输入参数验证，可能导致运行时错误 | 高 | `/skills/order-analysis/scripts/index.ts` |
| 2 | `productLine` 未限定为枚举值，可能传入非法值 | 中 | `/skills/order-analysis/scripts/index.ts` |
| 3 | 退款率阈值硬编码，缺少配置化能力和文档说明 | 中 | `/skills/order-analysis/scripts/index.ts` |
| 4 | `buildBriefSkeleton` 未校验 `moduleName` 是否为空 | 中 | `/skills/brief-writer/scripts/index.ts` |
| 5 | SKILL.md 未说明异常场景处理方式 | 中 | 两个 SKILL.md |
| 6 | `refundRate` 缺少 0-1 边界值校验 | 中 | `/skills/order-analysis/scripts/index.ts` |
| 7 | 未提供单元测试文件 | 低 | 两个 skill |
| 8 | SKILL.md 未说明 skill 组合使用方式 | 低 | 两个 SKILL.md |

---

## 4. 改进建议

### 代码质量建议
1. **增强类型安全**：
   ```typescript
   type ProductLine = "course" | "workshop" | "consulting";
   ```

2. **增加参数校验**：
   ```typescript
   if (!payload || !payload.metrics) throw new Error("Invalid payload");
   if (refundRate < 0 || refundRate > 1) console.warn("边界警告");
   ```

3. **配置化阈值**：支持自定义团队采购阈值

### 文档改进建议
1. 增加"异常处理"章节，说明工具调用失败时的降级策略
2. 增加"组合使用示例"，展示 order-analysis + brief-writer 配合

---

## 5. 最终交付前必改项

**强制执行（发布前必须完成）：**

1. ✅ 为 `summarizeOrderMetrics` 添加基础参数校验
2. ✅ 限定 `productLine` 为枚举类型
3. ✅ 增加 `refundRate` 0-1 边界校验

**强烈推荐：**

4. 添加单元测试用例
5. 补充 SKILL.md 异常处理说明

---

## 6. 发布批准意见

**课程内容审查通过，Skills 代码修复后可发布。**

审查人：course-qa-reviewer
