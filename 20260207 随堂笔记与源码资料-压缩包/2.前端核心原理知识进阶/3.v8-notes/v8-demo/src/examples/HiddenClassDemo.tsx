import { useState } from 'react'
import { DemoCard, CodeBlock } from '../components/DemoCard'

export function HiddenClassDemo() {
  const [objects, setObjects] = useState<Array<{ id: number; props: Record<string, any>; map: string }>>([
    { id: 1, props: { x: 1, y: 2 }, map: 'Map_A' }
  ])
  const [nextId, setNextId] = useState(2)

  const addProperty = () => {
    setObjects(prev => prev.map((obj, idx) => {
      if (idx === 0) {
        const newProps = { ...obj.props, z: 3 }
        return {
          ...obj,
          props: newProps,
          map: 'Map_B'
        }
      }
      return obj
    }))
  }

  const addSameProperty = () => {
    setObjects(prev => {
      const last = prev[prev.length - 1]
      const newObj = {
        id: nextId,
        props: { ...last.props, z: nextId * 10 },
        map: last.map
      }
      setNextId(prev => prev + 1)
      return [...prev, newObj]
    })
  }

  const addDifferentProperty = () => {
    setObjects(prev => {
      const last = prev[prev.length - 1]
      const newObj = {
        id: nextId,
        props: { ...last.props, [`prop_${nextId}`]: nextId * 100 },
        map: `Map_${String.fromCharCode(65 + prev.length)}`
      }
      setNextId(prev => prev + 1)
      return [...prev, newObj]
    })
  }

  const reset = () => {
    setObjects([{ id: 1, props: { x: 1, y: 2 }, map: 'Map_A' }])
    setNextId(2)
  }

  return (
    <DemoCard
      title="🗂️ 隐藏类与对象优化"
      description="V8 使用隐藏类 (Hidden Class) 和内联缓存加速属性访问"
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={addProperty}>给 obj1 添加属性 z</button>
        <button onClick={addSameProperty}>创建相同结构对象</button>
        <button onClick={addDifferentProperty}>创建不同结构对象</button>
        <button onClick={reset} style={{ background: '#3a3a3a' }}>重置</button>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        {objects.map((obj, idx) => (
          <div
            key={obj.id}
            style={{
              background: idx === objects.length - 1 ? '#1a3a5c' : '#0d0d0d',
              padding: '12px',
              borderRadius: '8px',
              border: idx === objects.length - 1 ? '2px solid #646cff' : '1px solid #333'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9cdcfe' }}>obj{obj.id} = {JSON.stringify(obj.props)}</span>
              <span style={{
                background: '#2d2d2d',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: obj.map === objects[idx - 1]?.map ? '#4ec9b0' : '#ce9178'
              }}>
                {obj.map} {idx > 0 && obj.map === objects[idx - 1]?.map ? '✓ 共享' : obj.map !== objects[idx - 1]?.map ? '⚠ 转换' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <CodeBlock
        code={`// 相同隐藏类的对象 - 属性访问极快
const obj1 = { x: 1, y: 2 };
const obj2 = { x: 3, y: 4 }; // 共享隐藏类

// 动态添加属性 - 触发隐藏类转换
obj1.z = 3; // Map_A -> Map_B

// 不同属性顺序 - 不同隐藏类
const obj3 = { y: 2, x: 1 }; // Map_C (不同!)`}
        output={`当前对象数：${objects.length}\n共享隐藏类：${objects.filter((o, i, arr) => i === 0 || o.map === arr[i-1].map).length}\n独立隐藏类：${new Set(objects.map(o => o.map)).size}`}
      />

      <div style={{
        background: '#1a1a1a',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <h4 style={{ color: '#646cff', marginBottom: '12px' }}>隐藏类工作原理</h4>
        <ol style={{ color: '#ccc', lineHeight: '2', paddingLeft: '20px' }}>
          <li><strong>对象创建:</strong> V8 为新对象分配隐藏类</li>
          <li><strong>属性添加:</strong> 添加属性时创建新的隐藏类（Map 转换）</li>
          <li><strong>共享优化:</strong> 相同结构的对象共享隐藏类</li>
          <li><strong>内联缓存:</strong> 缓存属性偏移量，避免重复查找</li>
        </ol>
      </div>

      <div style={{
        background: '#1a1a1a',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <h4 style={{ color: '#646cff', marginBottom: '12px' }}>性能对比</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ color: '#4ec9b0', marginBottom: '8px' }}>✓ 快的代码模式</div>
            <pre style={{ color: '#d4d4d4', fontSize: '12px' }}>
{`// 1. 按相同顺序声明属性
function Point(x, y) {
  this.x = x;  // 总是先 x
  this.y = y;  // 再 y
}

// 2. 避免删除属性
// delete obj.x  ❌

// 3. 使用构造函数
const points = [
  new Point(1, 2),
  new Point(3, 4)
];`}
            </pre>
          </div>
          <div>
            <div style={{ color: '#ce9178', marginBottom: '8px' }}>✗ 慢的代码模式</div>
            <pre style={{ color: '#d4d4d4', fontSize: '12px' }}>
{`// 1. 属性顺序不一致
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p1 = new Point(1, 2);
const p2 = { y: 2, x: 1 };  // 不同隐藏类!

// 2. 动态删除属性
delete obj.x;  // 破坏优化

// 3. 字面量创建不同结构
const objects = [
  { x: 1 },
  { x: 1, y: 2 },  // 不同隐藏类
  { x: 1, y: 2, z: 3 }  // 又不同!
];`}
            </pre>
          </div>
        </div>
      </div>
    </DemoCard>
  )
}
