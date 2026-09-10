### 搭建个人知识库 RAGFlow + 本地部署模型
> [【知识库搭建】30分钟教你用DeepSeek + RAGFlow搭建私有知识库！2026最新个人知识库搭建教程，小白也能轻松实现！！！_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1ELXwBvErX/?spm_id_from=333.337.top_right_bar_window_custom_collection.content.click&vd_source=ff414aaf189e3a685358d2a984fd4742)


- `<REDACTED_GITHUB_TOKEN>`（GitHub Token 已移除；如曾真实使用，应在平台轮换）
- TDD BDD DDD
- UV包管理器 https://uv.doczh.com/#python
- Spec Kit
- MVP
- OpenSpec


## 用户手册
### skills 流程

- 安装 - 启动 - 检查状态 - 验证结果产出
安装到 openclaw 的 skills下
启动 （python 和 直接 命令行两种）
检测状态 （如何检查当前状态）
结果产出 （有哪些）

### 调整
1. heartbeat 分析无法生效， 所以改用了定时器 根据规则库分析， 分为train_data / train_data_label
2. 反馈三种都没有成功， 暂时没写上， 检验当前状态通过 状态检测指令
3. 原脚本基于linux， 对window兼容性有一些问题， 做了三个脚本兼容处理
4. 不再需要启动多个终端， 直接 /no0 start --with_tamper 启动监控器/定时器/篡改器/ 数据开始收集
5. 目录结构按照skills的标准结构，




- prisma
- Postgress 数据库
- Oracle
