import "dotenv/config";

import { Command } from '@langchain/langgraph'
import { agent } from './agent'

const config = { configurable: { thread_id: 'thread-1' } }

const invoke = async () => {
    const result = await agent.invoke({ times: 2, url: 'https://www.miaomaedu.com' }, config)
    console.log(result)

    // 过2秒后，继续执行
    setTimeout(async () => {
        // Resume with the decision; true routes to proceed, false to cancel
        const resumed = await agent.invoke(new Command({ resume: true/* , update: { times: 0 } */ }), config)
        console.log(resumed) // -> "approved"
    }, 2000)
}

invoke()
