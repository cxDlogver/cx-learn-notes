import { useState } from 'react'

interface DemoCardProps {
  title: string
  description: string
  children: React.ReactNode
}

export function DemoCard({ title, description, children }: DemoCardProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #333',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#646cff', marginBottom: '8px' }}>{title}</h2>
        <p style={{ color: '#888', fontSize: '14px' }}>{description}</p>
      </div>
      {children}
    </div>
  )
}

interface CodeBlockProps {
  code: string
  output: string
}

export function CodeBlock({ code, output }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: '#0d0d0d',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #333'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: '#1a1a1a',
        borderBottom: '1px solid #333'
      }}>
        <span style={{ color: '#888', fontSize: '12px' }}>JavaScript</span>
        <button
          onClick={handleCopy}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: copied ? '#4ec9b0' : '#2a2a2a',
            color: copied ? '#fff' : '#ccc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {copied ? '✓ 已复制' : '复制结果'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '16px', borderRight: '1px solid #333' }}>
          <pre style={{ color: '#d4d4d4', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {code}
          </pre>
        </div>
        <div style={{ padding: '16px', background: '#0a0a0a' }}>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>输出 / 状态:</div>
          <pre style={{ color: '#4ec9b0', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}
