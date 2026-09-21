/**
 * 进入 Processing 和 Transport 的统一数据契约。
 * 结构由独立的协议包定义，SDK 不再维护第二份服务端 DTO。
 */
export type { TelemetryEventV2 as TelemetryEnvelope } from '@browser-monitor/protocol';
