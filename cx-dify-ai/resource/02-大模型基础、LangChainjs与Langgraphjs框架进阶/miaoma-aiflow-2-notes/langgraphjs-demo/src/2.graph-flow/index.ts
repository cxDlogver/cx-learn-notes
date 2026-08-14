import { agent } from './agent'

const invoke = async () => {
    // Invoke
    const state = await agent.invoke({ topic: 'cats' })
    console.log('初始笑话:')
    console.log(state.joke)
    console.log('\n--- --- ---\n')
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
