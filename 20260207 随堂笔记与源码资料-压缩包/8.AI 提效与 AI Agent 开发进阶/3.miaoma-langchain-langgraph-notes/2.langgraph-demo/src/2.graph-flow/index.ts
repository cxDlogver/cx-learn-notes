import "dotenv/config";

import { agent } from './agent'

const invoke = async () => {
    // Invoke
    const state = await agent.invoke({ topic: '前端开发' })
    console.log('初始笑话:')
    console.log(state.joke)
    console.log('\n--- --- ---\n')
    console.log('🚀 ~ invoke ~ state.improvedJoke:', state.improvedJoke)
    if (state.improvedJoke !== undefined) {
        console.log('改进后的笑话:')
        console.log(state.improvedJoke)
        console.log('\n--- --- ---\n')

        console.log('最终笑话:')
        console.log(state.finalJoke)
    } else {
        console.log('笑话质量检查失败 - 没有好玩的点!')
    }
}

invoke()
