# 前端工程化设计全面解析

## 项目分类与工程化设计

### 技术拆分

- 纯前端（react/vue） vite cli
- 服务端（node、nestjs）
- 全栈
- 多端开发
  - iOS、Android、小程序
  - MacOS、Window、Linux

monorepo 介绍
macro repo，一个项目就对应一个 git 仓库
mono repo，一个 git 仓库包含多个项目，项目之间也能够轻松实现依赖复用

- lerna
- yarn monorepo
- pnpm monorepo ✅


### 业务场景拆分

- 基础业务开发，管理系统、业务系统（vite、webpack）
- 团队基建（ui库【类 mantineui 实战】、composition库【composition 实战】）
- 工具链（cli 工具【vite cli、nestjs cli】、代码生成工具【graphql-codegen】）
