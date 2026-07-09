import { useState } from 'react'
import { ArrayDemo } from './examples/ArrayDemo'
import { JITDemo } from './examples/JITDemo'
import { HiddenClassDemo } from './examples/HiddenClassDemo'
import { GarbageCollectionDemo } from './examples/GarbageCollectionDemo'

function App() {
  const [activeTab, setActiveTab] = useState<'array' | 'jit' | 'hidden-class' | 'gc'>('array')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #333',
        padding: '20px 40px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>
              ⚡ V8 引擎原理演示
            </h1>
            <p style={{ color: '#888', margin: '4px 0 0', fontSize: '14px' }}>
              交互式学习 V8 内部机制
            </p>
          </div>
          <nav style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'array', label: '📦 数组实现', icon: '📦' },
              { id: 'jit', label: '⚡ JIT 编译', icon: '⚡' },
              { id: 'hidden-class', label: '🗂️ 隐藏类', icon: '🗂️' },
              { id: 'gc', label: '♻️ 垃圾回收', icon: '♻️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '10px 16px',
                  background: activeTab === tab.id ? '#646cff' : '#2a2a2a',
                  color: activeTab === tab.id ? '#fff' : '#ccc',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px'
      }}>
        {/* Introduction */}
        <section style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          color: '#fff'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '28px' }}>
            V8 JavaScript 引擎
          </h2>
          <p style={{ margin: 0, lineHeight: 1.8, opacity: 0.9 }}>
            V8 是 Google 开发的开源 JavaScript 引擎，使用 C++ 编写，用于 Chrome 浏览器和 Node.js 运行时。
            它通过即时编译（JIT）技术将 JavaScript 代码编译为机器码，实现极致的执行性能。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginTop: '24px' }}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ignition</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>解释器 - 快速启动</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>TurboFan</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>优化编译器 - 极致性能</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>♻️</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Orinoco</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>垃圾回收器 - 分代回收</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔧</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Maglev</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>中期编译器 - 平衡速度与质量</div>
            </div>
          </div>
        </section>

        {/* Demos */}
        {activeTab === 'array' && <ArrayDemo />}
        {activeTab === 'jit' && <JITDemo />}
        {activeTab === 'hidden-class' && <HiddenClassDemo />}
        {activeTab === 'gc' && <GarbageCollectionDemo />}

        {/* Additional Resources */}
        <section style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '32px',
          marginTop: '32px'
        }}>
          <h3 style={{ color: '#646cff', marginBottom: '20px' }}>📚 扩展学习资源</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <a
              href="https://v8.dev/docs"
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#2a2a2a',
                padding: '20px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: '#fff',
                border: '1px solid #333',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📖 V8 官方文档</div>
              <div style={{ fontSize: '13px', color: '#888' }}>深入了解 V8 架构和内部实现</div>
            </a>
            <a
              href="https://github.com/v8/v8"
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#2a2a2a',
                padding: '20px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: '#fff',
                border: '1px solid #333',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔧 V8 源码</div>
              <div style={{ fontSize: '13px', color: '#888' }}>在 GitHub 上探索 V8 源代码</div>
            </a>
            <a
              href="https://v8.dev/blog"
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#2a2a2a',
                padding: '20px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: '#fff',
                border: '1px solid #333',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📝 V8 博客</div>
              <div style={{ fontSize: '13px', color: '#888' }}>最新的性能优化和技术文章</div>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #333',
        padding: '40px',
        textAlign: 'center',
        color: '#888',
        marginTop: '40px'
      }}>
        <p style={{ margin: 0 }}>
          基于 V8 v12.0 源码分析 • 使用 React + TypeScript + Vite 构建
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
          源代码：<a href="https://github.com/anomalyco/v8-notes" style={{ color: '#646cff' }}>github.com/anomalyco/v8-notes</a>
        </p>
      </footer>
    </div>
  )
}

export default App
