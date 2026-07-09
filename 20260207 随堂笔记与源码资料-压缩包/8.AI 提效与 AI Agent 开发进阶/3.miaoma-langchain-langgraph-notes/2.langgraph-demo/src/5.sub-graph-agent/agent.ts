import { Annotation, InMemoryStore, StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai';
import { tool } from 'langchain'
import * as z from 'zod'


// 需求，让大模型帮我请求给定次数
const store = new InMemoryStore()

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

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
    await llm.invoke(state.url)
    console.log('🚀 ~ modelNode ~ msg:')
    return { times: state.times }
}

// 4. 定义状态
const StateAnnotation = Annotation.Root({
    url: Annotation<string>,
    times: Annotation<number>
})

// 5. 定义判断节点
const shouldContinue = (state: typeof StateAnnotation.State) => {
    console.log('🚀 ~ shouldContinue ~ state.times:', state.times)
    while (state.times > 0) {
        return 'fetchTool'
    }
    return '__end__'
}

// 6. 定义 agent
export const subAgent = new StateGraph(StateAnnotation)
    .addNode('modelNode', modelNode)
    .addNode('fetchTool', fetchToolNode)
    .addEdge('__start__', 'modelNode')
    .addConditionalEdges('modelNode', shouldContinue, ['fetchTool', '__end__'])
    .addEdge('fetchTool', 'modelNode')
    .compile({
        store
    })

// 7. 定义主 agent 模型节点
const mainModelNode = async (state: typeof StateAnnotation.State) => {
    await llm.invoke(state.url)
    console.log('🚀 ~ mainModelNode ~ msg:')
    return { times: state.times }
}
// 7. 定义主 agent
export const agent = new StateGraph(StateAnnotation)
    .addNode('modelNode', mainModelNode)
    .addNode('subAgent', async state => {
        const subgraphOutput = await subAgent.invoke({ url: state.url, times: state.times })
        return { times: subgraphOutput.times }
    })
    .addEdge('__start__', 'modelNode')
    .addEdge('modelNode', 'subAgent')
    .addEdge('subAgent', '__end__')
    .compile({
        store
    })
