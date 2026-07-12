import "dotenv/config";

export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}

interface BailianResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
}

export class LLM {
  private apiKey = process.env.DASHSCOPE_API_KEY;
  private baseUrl = process.env.DASHSCOPE_BASE_URL;
  private model = process.env.DASHSCOPE_MODEL || "qwen-plus";

  async invoke(messages: Message[]): Promise<Message> {
    if (!this.apiKey) {
      throw new Error("缺少 DASHSCOPE_API_KEY");
    }

    if (!this.baseUrl) {
      throw new Error("缺少 DASHSCOPE_BASE_URL");
    }

    if (this.baseUrl.includes("{WorkspaceId}")) {
      throw new Error(
        "DASHSCOPE_BASE_URL 仍是模板值，请将 {WorkspaceId} 替换为实际工作空间 ID，或改为 https://dashscope.aliyuncs.com/compatible-mode/v1"
      );
    }

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2
        })
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`请求百炼接口失败：${detail}`);
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`模型调用失败：${response.status} ${detail}`);
    }

    const data = (await response.json()) as BailianResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`模型响应为空：${JSON.stringify(data)}`);
    }

    return {
      role: "assistant",
      content
    };
  }
}
