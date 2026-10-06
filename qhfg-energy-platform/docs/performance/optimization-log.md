# 性能优化过程记录

日期：2026-10-07（Asia/Shanghai）

每完成有意义的步骤即追加，保留失败与回滚原因、原始报告；不把预计收益写成实测结果。

## 阶段0：调查与设计确认

状态：只读调查完成。已写入决策记录；尚无源码优化、Lighthouse分数或性能提升结论。

用户确认：公开独立仓库；调用范围内TS后端；三维接入；本地Lighthouse Node API。

待验证疑点：70,695,673字节背景GIF、17,840,436字节字体、Cesium首屏注入、UI/图表全量导入、图表监听未释放、三维重复请求与停用生命周期。

原二维已有缓存、防抖、取消请求和Blob URL回收，后续需区分原有机制和本次改动。

API、QGIS、天气的限时只读连通检查不能代表浏览器功能验证，也不能代表Lighthouse结果。底图短请求403作为现有依赖问题登记，不能静默换底图后宣称视觉一致。

| 场景 | Performance | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- | --- | --- |
| 原版首页 | 未测 | 未测 | 未测 | 未测 | 未测 | 未测 |
| 原版登录 | 未测 | 未测 | 未测 | 未测 | 未测 | 未测 |
| 原版二维数据服务 | 未测 | 未测 | 未测 | 未测 | 未测 | 未测 |
| 三维数据服务 | 原实际路由未接入，接入后另建优化基线 | — | — | — | — | — |

## 每轮记录模板

1. 时间、代码版本、数据与真实服务/本地测试模式。
2. 假设、具体改动和功能/样式兼容依据。
3. Node、Lighthouse、Chrome、设备、网络、缓存和登录状态。
4. 原始JSON/HTML/trace位置，多次运行中位数及范围。
5. 前后指标差异、业务操作耗时、失败结果。
6. 截图和筛选/地图/图表/表格/下载回归。
7. 保留或回滚的结论、原因与下一步。

导航分数与地图交互分别报告。本地测试数据结果不代表生产服务；未完成真实服务验证的场景需明确标记。

参考：[Lighthouse Node API](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md)、[认证页面测量](https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/auth/README.md)、[User Flows](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md)。
