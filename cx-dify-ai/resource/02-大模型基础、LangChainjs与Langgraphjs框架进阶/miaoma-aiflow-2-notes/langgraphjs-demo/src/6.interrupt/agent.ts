import { Annotation, InMemoryStore, interrupt, MemorySaver, StateGraph } from '@langchain/langgraph'
import { ChatOllama } from '@langchain/ollama'
import { tool } from 'langchain'
import * as z from 'zod'

// 需求，让大模型帮我请求给定次数
const store = new InMemoryStore()

// 1. 定义模型
const model = new ChatOllama({
    model: 'qwen3:0.6b'
})

// 2. 定义工具
const fetchTool = tool(
    async ({ url }) => {
        const res = await fetch(url)
        return await res.text()
    },
    {
        name: 'fetch',
        description: '从URL获取内容',
        schema: z.object({
            url: z.string().describe('要获取内容的URL')
        })
    }
)
// 工具节点
const fetchToolNode = async (state: typeof StateAnnotation.State) => {
    await fetchTool.invoke({ url: state.url })
    console.log('🚀 ~ fetchToolNode ~ msg:')
    return { times: state.times - 1 }
}

// 3. 定义模型节点
async function modelNode(state: typeof StateAnnotation.State) {
    await model.invoke(state.url)
    console.log('🚀 ~ modelNode ~ msg:')
    return { times: state.times }
}

// 4. 定义状态
const StateAnnotation = Annotation.Root({
    url: Annotation<string>,
    times: Annotation<number>
})

// 5. 定义中断节点
const interruptNode = (state: typeof StateAnnotation.State) => {
    const approved = interrupt('你想要暂停，稍后处理吗？')
    return {
        approved
    }
}

// 定义检查点
const checkpointer = new MemorySaver()
// 6. 定义 agent
export const agent = new StateGraph(StateAnnotation)
    .addNode('modelNode', modelNode)
    .addNode('fetchTool', fetchToolNode)
    .addNode('interruptNode', interruptNode)
    .addEdge('__start__', 'modelNode')
    .addEdge('modelNode', 'interruptNode')
    .addEdge('interruptNode', 'fetchTool')
    .addEdge('fetchTool', '__end__')
    .compile({
        store,
        checkpointer
    })
