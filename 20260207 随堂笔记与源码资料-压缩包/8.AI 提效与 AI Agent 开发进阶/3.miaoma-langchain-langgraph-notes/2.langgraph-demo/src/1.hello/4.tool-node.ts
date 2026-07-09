import { task } from '@langchain/langgraph'
import { toolsByName } from './1.tools'

import type { ToolCall } from '@langchain/core/messages/tool'

export const callTool = task({ name: 'callTool' }, async (toolCall: ToolCall) => {
    const tool = toolsByName[toolCall.name]
    return tool?.invoke(toolCall)
})
