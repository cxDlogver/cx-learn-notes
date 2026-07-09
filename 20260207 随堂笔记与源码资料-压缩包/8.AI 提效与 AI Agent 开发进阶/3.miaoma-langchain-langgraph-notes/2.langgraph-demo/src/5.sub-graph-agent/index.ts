import "dotenv/config";

import { agent } from './agent'

const invoke = async () => {
    // const messages = [
    //     {
    //         role: 'user',
    //         content: 'Add 3 and 4.'
    //     }
    // ]
    const result = await agent.invoke({ times: 2, url: 'https://www.miaomaedu.com' })
    console.log(result)
}

invoke()
