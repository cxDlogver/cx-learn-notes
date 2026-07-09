import "dotenv/config";

import { agent } from './agent'

const invoke = async () => {
    // Invoke
    const state = await agent.invoke({ topic: 'cats' })
    console.log(state.combinedOutput)
}

invoke()
