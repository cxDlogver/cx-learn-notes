import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type FilterType = 'all' | 'active' | 'completed'

function App() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', [])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const addTodo = () => {
    const text = input.trim()
    if (!text) return
    setTodos([...todos, { id: Date.now(), text, completed: false }])
    setInput('')
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  const clearCompleted = () => {
    setTodos(todos.filter(t => !t.completed))
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.length - activeCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-6 px-4 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-800 mb-6 sm:mb-8">
          待办事项
        </h1>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="添加新任务..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <button
              onClick={addTodo}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium"
            >
              添加
            </button>
          </div>
        </div>

        {todos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                {(['all', 'active', 'completed'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                      filter === f
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
                  </button>
                ))}
              </div>
              <span className="text-xs sm:text-sm text-slate-500">
                {activeCount} 项进行中
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filteredTodos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center text-slate-400 text-sm sm:text-base">
              {todos.length === 0 ? '暂无任务，添加一个开始吧！' : '该筛选下没有任务'}
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div
                key={todo.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 sm:p-4 flex items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="w-5 h-5 cursor-pointer accent-blue-500 flex-shrink-0"
                />
                <span
                  className={`flex-1 text-sm sm:text-base break-all ${
                    todo.completed ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="px-3 py-1 text-xs sm:text-sm text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>

        {completedCount > 0 && (
          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={clearCompleted}
              className="px-4 py-2 text-sm text-slate-600 hover:text-red-500 transition-colors"
            >
              清除已完成 ({completedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
