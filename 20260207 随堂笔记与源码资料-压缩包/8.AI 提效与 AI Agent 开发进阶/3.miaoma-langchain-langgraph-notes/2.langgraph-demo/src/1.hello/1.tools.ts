import { tool } from 'langchain'
import * as z from 'zod'

// 定义工具
const add = tool(({ a, b }) => a + b, {
    name: 'add',
    description: '两数之和',
    schema: z.object({
        a: z.number().describe('第一个数'),
        b: z.number().describe('第二个数')
    })
})

const multiply = tool(({ a, b }) => a * b, {
    name: 'multiply',
    description: '两数之积',
    schema: z.object({
        a: z.number().describe('第一个数'),
        b: z.number().describe('第二个数')
    })
})

const divide = tool(({ a, b }) => a / b, {
    name: 'divide',
    description: '两数相除',
    schema: z.object({
        a: z.number().describe('第一个数'),
        b: z.number().describe('第二个数')
    })
})

export const toolsByName = {
    [add.name]: add,
    [multiply.name]: multiply,
    [divide.name]: divide
}

// 导出工具
export const tools = Object.values(toolsByName)
