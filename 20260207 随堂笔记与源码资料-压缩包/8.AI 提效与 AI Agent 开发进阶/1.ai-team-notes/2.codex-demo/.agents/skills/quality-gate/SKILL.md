---
name: quality-gate
description: 当用户要求运行或沉淀项目质量验证流程时使用，包括 ESLint、类型检查、单元测试、构建、已有 package scripts、CI 本地复现、修复 lint/test/build 失败、或要求“走一遍规范测试验证”“跑 check”“验证改动是否通过项目规范”。
---

# Quality Gate

## Overview

使用项目已有工具链验证改动是否符合工程规范。默认先发现项目脚本和配置，再运行最小必要命令，最后汇总通过项、失败项和下一步。

## Workflow

1. 读取项目事实：检查 `package.json`、lint/test/build 配置、README/AGENTS 里的命令约定。
2. 选择命令：优先使用项目已有 scripts，不直接拼装底层工具命令。
3. 执行验证：按 `references/validation-workflow.md` 运行 lint、测试、类型检查和构建。
4. 定位失败：保留原始错误的关键行，先修最小问题，再重跑失败命令。
5. 收口验证：修复后运行完整质量门禁，通常是 `pnpm run check` 或项目等价命令。
6. 汇报结果：列出命令、状态、关键失败原因、修复范围和剩余风险。

## Command Selection

- 如果存在 `check` script，优先把它作为最终完整门禁。
- 如果用户只要求 ESLint，先运行 lint script，例如 `pnpm run lint`。
- 如果用户要求“各种已有规范测试”，运行 lint、test、build，或项目定义的串行 `check`。
- 如果没有统一 script，按项目包管理器和配置推断：lint -> test -> type/build。
- 不使用会重写文件的 formatter 或 `--fix`，除非用户明确要求自动修复。

## Failure Handling

按 `references/failure-handling.md` 处理失败。只修改与失败直接相关的代码或配置，避免无关重构。

常见处理顺序：

1. ESLint：先读规则和报错位置，修真实问题；不要用禁用规则掩盖问题。
2. TypeScript：优先修类型边界、导入导出、不可达或不安全假设。
3. Vitest/单测：先确认预期行为，再修实现或测试；不要为了通过测试删除有效断言。
4. Build：区分类型错误、打包错误、资源路径错误和环境缺失。

## Reporting Contract

最终回复必须包含：

- 执行过的命令。
- 每个命令的通过/失败状态。
- 如果失败，给出关键错误和下一步。
- 如果做了修复，说明修复文件和验证结果。
- 如果未能执行某命令，说明原因，不假装通过。

## References

- 验证流程：`references/validation-workflow.md`
- 失败处理：`references/failure-handling.md`
