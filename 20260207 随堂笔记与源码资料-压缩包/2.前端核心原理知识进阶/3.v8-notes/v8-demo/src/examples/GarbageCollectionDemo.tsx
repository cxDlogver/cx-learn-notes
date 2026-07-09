import { useState } from 'react'
import { DemoCard, CodeBlock } from '../components/DemoCard'

interface GarbageObject {
  id: number
  size: number
  reachable: boolean
  color: 'white' | 'gray' | 'black' | 'grey'
}

export function GarbageCollectionDemo() {
  const [objects, setObjects] = useState<GarbageObject[]>([
    { id: 1, size: 64, reachable: true, color: 'black' },
    { id: 2, size: 128, reachable: true, color: 'grey' },
    { id: 3, size: 32, reachable: true, color: 'white' },
    { id: 4, size: 256, reachable: false, color: 'white' },
    { id: 5, size: 64, reachable: false, color: 'white' },
  ])
  const [phase, setPhase] = useState<'mark' | 'sweep' | 'idle'>('idle')
  const [generation, setGeneration] = useState(0)

  const startGC = () => {
    if (phase !== 'idle') return

    // Mark phase
    setPhase('mark')
    setObjects(prev => prev.map(obj => {
      if (obj.id === 1) return { ...obj, color: 'black' as const }
      if (obj.id === 2 && obj.reachable) return { ...obj, color: 'gray' as const }
      if ([3, 4].includes(obj.id) && obj.reachable) return { ...obj, color: 'white' as const }
      return obj
    }))

    setTimeout(() => {
      // Continue mark
      setObjects(prev => prev.map(obj => {
        if ([1, 2, 3].includes(obj.id) && obj.reachable) return { ...obj, color: 'black' as const }
        return obj
      }))

      setTimeout(() => {
        // Sweep phase
        setPhase('sweep')
        setObjects(prev => prev.filter(obj => obj.reachable))

        setTimeout(() => {
          setPhase('idle')
          setGeneration(g => g + 1)
          // Add new objects
          setObjects(prev => [
            ...prev,
            { id: Date.now() % 10000, size: 96, reachable: true, color: 'black' },
          ])
        }, 800)
      }, 800)
    }, 1500)
  }

  const allocate = () => {
    const newId = Date.now() % 10000
    const size = Math.floor(Math.random() * 200) + 32
    const reachable = Math.random() > 0.2
    setObjects(prev => [...prev, { id: newId, size, reachable, color: 'white' }])
  }

  const toggleReachable = (id: number) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, reachable: !obj.reachable } : obj
    ))
  }

  return (
    <DemoCard
      title="♻️ 垃圾回收演示"
      description="V8 使用分代式垃圾回收（新生代 + 老生代）"
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={startGC} disabled={phase !== 'idle'}>
          {phase === 'idle' ? '启动 GC' : `${phase.toUpperCase()}...`}
        </button>
        <button onClick={allocate}>分配对象</button>
      </div>

      <div style={{
        background: '#0d0d0d',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ color: '#888', marginBottom: '12px' }}>堆内存可视化:</div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {objects.map(obj => (
            <div
              key={obj.id}
              onClick={() => toggleReachable(obj.id)}
              style={{
                padding: '12px',
                background: phase === 'mark' || phase === 'sweep'
                  ? obj.color === 'black' ? '#1a3a1a' : obj.color === 'gray' ? '#3a3a1a' : obj.reachable ? '#3a1a1a' : '#2a2a2a'
                  : obj.reachable ? '#1a3a5c' : '#3a1a1a',
                borderRadius: '8px',
                border: `1px solid ${obj.reachable ? '#4ec9b0' : '#ce9178'}`,
                cursor: phase === 'idle' ? 'pointer' : 'default',
                opacity: !obj.reachable && phase === 'sweep' ? 0.3 : 1,
                transition: 'all 0.3s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: obj.reachable ? '#9cdcfe' : '#888' }}>
                  Object #{obj.id} ({obj.size} bytes)
                </span>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: obj.reachable ? '#1a3a5c' : '#3a1a1a',
                  color: obj.reachable ? '#4ec9b0' : '#ce9178'
                }}>
                  {obj.reachable ? '可达' : '不可达'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CodeBlock
        code={`// V8 垃圾回收策略:
// 1. 标记 - 清除 (Mark-Sweep)
// 2. 复制回收 (Scavenge) - 新生代
// 3. 增量标记 (Incremental Marking)

// 内存分代:
// • New Space (新生代): 0-16MB, Scavenge 算法
// • Old Space (老生代): 16MB+, Mark-Sweep-Compact
// • Large Object Space: >1MB 大对象`}
        output={`GC 状态：${phase.toUpperCase()}\n存活对象：${objects.filter(o => o.reachable).length}\n可回收对象：${objects.filter(o => !o.reachable).length}\n总回收：${generation} 次`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div style={{
          background: '#1a1a1a',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h4 style={{ color: '#646cff', marginBottom: '12px' }}>新生代 (New Space)</h4>
          <ul style={{ color: '#ccc', lineHeight: '2', fontSize: '13px', paddingLeft: '20px' }}>
            <li><strong>大小:</strong> 1-16MB</li>
            <li><strong>算法:</strong> Scavenge (复制算法)</li>
            <li><strong>对象:</strong> 新创建的对象</li>
            <li><strong>晋升:</strong> 存活对象移入老生代</li>
          </ul>
        </div>

        <div style={{
          background: '#1a1a1a',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h4 style={{ color: '#646cff', marginBottom: '12px' }}>老生代 (Old Space)</h4>
          <ul style={{ color: '#ccc', lineHeight: '2', fontSize: '13px', paddingLeft: '20px' }}>
            <li><strong>大小:</strong> 动态扩展</li>
            <li><strong>算法:</strong> Mark-Sweep-Compact</li>
            <li><strong>对象:</strong> 长期存活对象</li>
            <li><strong>增量标记:</strong> 减少 STW 时间</li>
          </ul>
        </div>
      </div>

      <div style={{
        background: '#1a1a1a',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <h4 style={{ color: '#646cff', marginBottom: '12px' }}>GC 优化技巧</h4>
        <ul style={{ color: '#ccc', lineHeight: '2', paddingLeft: '20px' }}>
          <li><strong>避免内存泄漏:</strong> 及时清理定时器、事件监听器</li>
          <li><strong>对象池模式:</strong> 复用频繁创建的对象</li>
          <li><strong>避免大型对象:</strong> 单个对象超过 1MB 会进入大对象空间</li>
          <li><strong>WeakMap/WeakSet:</strong> 使用弱引用避免内存泄漏</li>
        </ul>
      </div>
    </DemoCard>
  )
}
