# 3.JavaScript V8 引擎原理详解

## 引擎基础


<!-- AI 最擅长的还是文本处理，怎么样用结构化的数据来表征你的业务【DSL】 -->

```js
const doc = {
    type: 'md',
    contents: [
        // blocksuit 数据协议
        {
            type: 'heading',
            level: 1,
            text: '3.JavaScript V8 引擎原理详解'
        }
        {
            type: 'heading',
            level: 2,
            text: '引擎基础'
        }
    ]
}
```



ai 工具的补充

1. 安装 ollama，直接官网下载安装
2. 安装 opencode，https://github.com/anomalyco/opencode?tab=readme-ov-file#installation
3. ollama launch opencode --model qwen3.5:397b-cloud    