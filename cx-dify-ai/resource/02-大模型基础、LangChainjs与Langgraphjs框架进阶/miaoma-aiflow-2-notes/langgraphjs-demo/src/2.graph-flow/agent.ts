import { StateGraph, Annotation } from '@langchain/langgraph'
import { ChatOllama } from '@langchain/ollama'

const llm = new ChatOllama({
    model: 'qwen3:0.6b'
})

// 图状态
const StateAnnotation = Annotation.Root({
    topic: Annotation<string>,
    joke: Annotation<string>,
    improvedJoke: Annotation<string>,
    finalJoke: Annotation<string>
})

// 定义节点函数

// 通过 LLM 生成初始笑话
async function generateJoke(state: typeof StateAnnotation.State) {
    const msg = await llm.invoke(`写一个关于 ${state.topic} 的笑话`)
    return { joke: msg.content }
}

// 检查笑话是否有好玩的点
function checkPunchline(state: typeof StateAnnotation.State) {
    // 简单检查 - 笑话是否包含 "?" 或 "!"
    if (state.joke?.includes('?') || state.joke?.includes('!')) {
        return 'Pass'
    }
    return 'Fail'
}

// 通过 LLM 改进笑话
async function improveJoke(state: typeof StateAnnotation.State) {
    const msg = await llm.invoke(`使这个笑话更有趣: ${state.joke}`)
    return { improvedJoke: msg.content }
}

// 通过 LLM 完善笑话
async function polishJoke(state: typeof StateAnnotation.State) {
    const msg = await llm.invoke(`添加一个历史典故到这个笑话: ${state.improvedJoke}`)
    return { finalJoke: msg.content }
}

// 构建工作流
export const agent = new StateGraph(StateAnnotation)
    .addNode('generateJoke', generateJoke)
    .addNode('improveJoke', improveJoke)
    .addNode('polishJoke', polishJoke)
    .addEdge('__start__', 'generateJoke')
    .addConditionalEdges('generateJoke', checkPunchline, {
        Pass: 'improveJoke',
        Fail: '__end__'
    })
    .addEdge('improveJoke', 'polishJoke')
    .addEdge('polishJoke', '__end__')
    .compile()
