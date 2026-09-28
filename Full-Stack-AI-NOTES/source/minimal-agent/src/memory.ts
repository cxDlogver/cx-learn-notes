import type { AgentState, MemoryItem } from "./contracts.ts";

/**
 * CheckpointStore 保存的是 AgentState 快照。
 *
 * 编排层每完成一个关键步骤都会保存状态，这样运行中断后可以 resume。
 * 当前实现是内存版，适合教学和单进程测试；生产环境通常会替换为数据库。
 */
export interface CheckpointStore {
  save(state: AgentState): Promise<void>;
  load(runId: string): Promise<AgentState | undefined>;
}

/** 基于 Map 的内存 Checkpoint。进程退出后数据会丢失。 */
export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly states = new Map<string, AgentState>();

  async save(state: AgentState): Promise<void> {
    // 保存 clone，避免调用方继续修改 state 时污染已经落盘的快照。
    this.states.set(state.runId, structuredClone(state));
  }

  async load(runId: string): Promise<AgentState | undefined> {
    const state = this.states.get(runId);
    // 读取时也返回 clone，保持存储层和运行层隔离。
    return state ? structuredClone(state) : undefined;
  }
}

/**
 * 长期记忆接口。
 *
 * 它和 Checkpoint 不同：Checkpoint 保存某一次运行的状态，LongTermMemory
 * 保存跨任务可复用的知识、偏好或规则。
 */
export interface LongTermMemoryStore {
  recall(query: string, limit: number): Promise<MemoryItem[]>;
}

/** 空记忆实现。用于不需要长期记忆的测试或最小运行。 */
export class EmptyMemoryStore implements LongTermMemoryStore {
  async recall(_query: string, _limit: number): Promise<MemoryItem[]> {
    return [];
  }
}

/**
 * 简单的内存长期记忆。
 *
 * 这个实现故意很轻量：通过 query 和 tags 的字符串匹配打分，演示「召回记忆」
 * 这个动作。真实 Agent 通常会用向量检索、关键词检索或知识图谱替代这里。
 */
export class InMemoryLongTermMemoryStore implements LongTermMemoryStore {
  private readonly items: MemoryItem[];

  constructor(items: MemoryItem[]) {
    this.items = structuredClone(items);
  }

  async recall(query: string, limit: number): Promise<MemoryItem[]> {
    const normalized = query.toLowerCase();
    const ranked = this.items
      .map((item) => {
        const searchable = `${item.content} ${item.tags.join(" ")}`.toLowerCase();
        // 标签命中给更高分，完整内容命中给基础分，便于演示规则类记忆召回。
        const score = item.tags.reduce(
          (total, tag) => total + (normalized.includes(tag.toLowerCase()) ? 2 : 0),
          searchable.includes(normalized) ? 1 : 0
        );
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ item }) => item);

    return structuredClone(ranked);
  }
}
