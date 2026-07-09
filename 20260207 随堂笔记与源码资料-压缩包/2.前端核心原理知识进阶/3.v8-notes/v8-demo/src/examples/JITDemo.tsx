import { useState } from 'react'
import { DemoCard, CodeBlock } from '../components/DemoCard'

export function JITDemo() {
  const [compilationStage, setCompilationStage] = useState<'Ignition' | 'TurboFan' | 'Optimized'>('Ignition')
  const [executionCount, setExecutionCount] = useState(0)
  const [isOptimized, setIsOptimized] = useState(false)

  const runCode = () => {
    setExecutionCount(prev => {
      const newCount = prev + 1
      if (newCount >= 5 && !isOptimized) {
        setIsOptimized(true)
        setCompilationStage('TurboFan')
      }
      return newCount
    })
  }

  const reset = () => {
    setExecutionCount(0)
    setIsOptimized(false)
    setCompilationStage('Ignition')
  }

  return (
    <DemoCard
      title="⚡ JIT 编译演示"
      description="V8 使用即时编译技术，根据代码热度动态优化"
    >
      <div style={{ marginBottom: '16px' }}>
        <button onClick={runCode} style={{ marginRight: '8px' }}>
          执行函数
        </button>
        <button onClick={reset} style={{ background: '#3a3a3a' }}>
          重置
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{
          background: compilationStage === 'Ignition' ? '#1a3a5c' : '#0d0d0d',
          padding: '16px',
          borderRadius: '8px',
          border: compilationStage === 'Ignition' ? '2px solid #646cff' : '1px solid #333'
        }}>
          <div style={{ color: '#ce9178', marginBottom: '8px' }}>Ignition (解释器)</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {compilationStage === 'Ignition' ? '✓ 当前阶段' : compilationStage === 'TurboFan' ? '✓ 已完成' : '✓ 已完成'}
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#ccc' }}>
            • 快速启动<br/>
            • 生成字节码<br/>
            • 收集类型反馈
          </div>
        </div>

        <div style={{
          background: compilationStage === 'TurboFan' ? '#1a3a5c' : '#0d0d0d',
          padding: '16px',
          borderRadius: '8px',
          border: compilationStage === 'TurboFan' ? '2px solid #646cff' : '1px solid #333',
          opacity: isOptimized ? 1 : 0.5
        }}>
          <div style={{ color: '#4ec9b0', marginBottom: '8px' }}>TurboFan (优化编译器)</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {isOptimized ? '✓ 已激活' : '○ 等待代码变热...'}
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#ccc' }}>
            • 激进优化<br/>
            • 内联缓存<br/>
            • 类型特化
          </div>
        </div>
      </div>

      <div style={{
        background: '#0d0d0d',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ color: '#888', marginBottom: '8px' }}>执行次数:</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#646cff' }}>
          {executionCount} 次
        </div>
        <div style={{ marginTop: '8px', color: isOptimized ? '#4ec9b0' : '#888' }}>
          {isOptimized ? '★ 代码已优化！性能提升 10-100 倍' : '执行 5 次后触发优化...'}
        </div>
      </div>

      <CodeBlock
        code={`function add(a, b) {
  return a + b;
}

// 执行过程:
// 1. Ignition 解释执行 (1-4 次)
// 2. 收集类型反馈 (%AddFeedback)
// 3. TurboFan 编译优化函数
// 4. 切换到优化版本 (%OptimizeFunctionOnNextCall)`}
        output={isOptimized ? `优化版本：function add_SMI(a, b) { return a + b | 0 }` : `解释执行...(${5 - executionCount} 次后优化)`}
      />

      <div style={{
        background: '#1a1a1a',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <h4 style={{ color: '#646cff', marginBottom: '12px' }}>优化策略</h4>
        <ul style={{ color: '#ccc', lineHeight: '2', paddingLeft: '20px' }}>
          <li><strong>Inline Caching (IC):</strong> 缓存属性访问位置，避免重复查找</li>
          <li><strong>Type Feedback:</strong> 记录运行时类型，生成特化代码</li>
          <li><strong>Function Inlining:</strong> 内联小函数，消除调用开销</li>
          <li><strong>Deoptimization:</strong> 假设失败时回退到解释器</li>
        </ul>
      </div>
    </DemoCard>
  )
}
