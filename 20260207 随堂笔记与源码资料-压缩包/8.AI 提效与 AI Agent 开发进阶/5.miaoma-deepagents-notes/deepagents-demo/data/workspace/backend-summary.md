# Backend 选型交付摘要

## 客户背景
- **目标用户**：已有 LangChain 基础的工程师
- **核心诉求**：将 agent 从 demo 推向可控生产流程
- **风险偏好**：允许本地实验，生产环境必须隔离执行

## Backend 选型建议

### 1. 开发实验阶段
推荐使用 **FilesystemBackend + StateBackend** 组合：
- **FilesystemBackend**：提供本地文件系统读写能力，适合快速迭代和本地实验
- **StateBackend**：管理 agent 状态持久化，便于调试和状态回溯

### 2. 生产部署阶段
必须启用 **Sandbox Backend** 隔离执行环境：
- 生产环境涉及代码执行时，优先选择隔离 sandbox backend
- 配合 **StoreBackend** 实现生产级数据持久化

### 3. 进阶混合部署
采用 **CompositeBackend** 统一编排：
- 可同时挂载 Filesystem、State、Store 多种后端
- 实现开发/生产环境的平滑切换
- 支持细粒度权限控制

## 实施路径
1. 本地开发：FilesystemBackend 快速验证业务逻辑
2. 预发布：引入 StateBackend 进行状态管理测试
3. 生产上线：切换至 Sandbox + StoreBackend 保障安全隔离
