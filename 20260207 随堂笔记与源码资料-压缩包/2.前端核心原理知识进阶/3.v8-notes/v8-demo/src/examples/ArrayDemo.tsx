import { useState } from 'react'
import { DemoCard, CodeBlock } from '../components/DemoCard'

export function ArrayDemo() {
  const [arrayType, setArrayType] = useState<'PACKED' | 'HOLEY' | 'DICTIONARY'>('PACKED')
  const [elements, setElements] = useState([1, 2, 3, 4, 5])

  const demoJoin = () => {
    const result = elements.join(',')
    return result
  }

  const demoFirst = () => {
    return elements[0]
  }

  const demoLast = () => {
    return elements[elements.length - 1]
  }

  const addHole = () => {
    const newElements = [...elements]
    newElements[2] = undefined as any
    setElements(newElements)
    setArrayType('HOLEY')
  }

  const resetArray = () => {
    setElements([1, 2, 3, 4, 5])
    setArrayType('PACKED')
  }

  return (
    <DemoCard
      title="📦 数组内部实现"
      description="V8 根据数组元素类型和连续性优化存储结构"
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={resetArray} style={{ background: arrayType === 'PACKED' ? '#646cff' : '#2a2a2a' }}>
          PACKED 数组
        </button>
        <button onClick={addHole} style={{ background: arrayType === 'HOLEY' ? '#646cff' : '#2a2a2a' }}>
          添加 Hole
        </button>
      </div>

      <div style={{
        background: '#0d0d0d',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ color: '#888', marginBottom: '8px' }}>当前数组:</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {elements.map((elem, idx) => (
            <div
              key={idx}
              style={{
                width: '50px',
                height: '50px',
                background: elem === undefined ? '#3a3a3a' : '#1a1a2e',
                border: `2px solid ${elem === undefined ? '#666' : '#646cff'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: elem === undefined ? '#666' : '#fff',
                fontWeight: 'bold'
              }}
            >
              {elem === undefined ? '⌀' : elem}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', color: '#888', fontSize: '13px' }}>
          元素类型：<span style={{ color: arrayType === 'PACKED' ? '#4ec9b0' : '#ce9178' }}>{arrayType}_ELEMENTS</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        <CodeBlock
          code={`arr.join(',')`}
          output={demoJoin()}
        />
        <CodeBlock
          code={`arr.first()`}
          output={String(demoFirst())}
        />
        <CodeBlock
          code={`arr.last()`}
          output={String(demoLast())}
        />
      </div>

      <div style={{
        background: '#1a1a1a',
        padding: '16px',
        borderRadius: '8px'
      }}>
        <h4 style={{ color: '#646cff', marginBottom: '12px' }}>ElementsKind 层次结构</h4>
        <pre style={{ color: '#d4d4d4', fontSize: '12px', lineHeight: '1.8' }}>
{`PACKED_ELEMENTS (最优)
  ↓ 添加 undefined
PACKED_SMI_ELEMENTS (仅小整数)
  ↓ 混入其他类型
PACKED_DOUBLE_ELEMENTS (仅双精度浮点数)
  ↓ 出现 hole
HOLEY_ELEMENTS (允许 hole)
  ↓ 动态添加/删除属性
DICTIONARY_ELEMENTS (哈希字典)`}
        </pre>
      </div>

      <div style={{
        background: '#1a1a1a',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <h4 style={{ color: '#646cff', marginBottom: '12px' }}>join() 优化策略</h4>
        <ul style={{ color: '#ccc', lineHeight: '2', paddingLeft: '20px' }}>
          <li><strong>Skip holes:</strong> 跳过 hole 元素，不转换为字符串</li>
          <li><strong>Buffer optimization:</strong> 使用 FixedArray 缓存已转换的字符串</li>
          <li><strong>Repeat detection:</strong> 检测重复字符串，减少内存分配</li>
          <li><strong>One-byte check:</strong> 如果所有字符都是单字节，使用更快的 OneByteString</li>
        </ul>
      </div>
    </DemoCard>
  )
}
