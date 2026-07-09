import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import {
  createTodo,
  deleteTodo,
  filterTodos,
  getTodoStats,
  toggleTodo,
  updateTodoTitle,
} from "./todoLogic";
import { loadTodos, saveTodos } from "./todoStorage";
import type { Todo, TodoFilter } from "./todoTypes";

const FILTER_LABELS: Record<TodoFilter, string> = {
  all: "全部",
  active: "未完成",
  completed: "已完成",
};

function getEmptyMessage(filter: TodoFilter) {
  if (filter === "active") {
    return "当前没有未完成任务。";
  }

  if (filter === "completed") {
    return "当前没有已完成任务。";
  }

  return "还没有任务，先添加第一条。";
}

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(() =>
    loadTodos(window.localStorage),
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const stats = useMemo(() => getTodoStats(todos), [todos]);
  const visibleTodos = useMemo(() => filterTodos(todos, filter), [todos, filter]);

  useEffect(() => {
    saveTodos(window.localStorage, todos);
  }, [todos]);

  function handleCreateTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const todo = createTodo(draftTitle);

    if (!todo) {
      return;
    }

    setTodos((currentTodos) => [todo, ...currentTodos]);
    setDraftTitle("");
  }

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle("");
  }

  function saveEditing(id: string) {
    if (!editingTitle.trim()) {
      return;
    }

    setTodos((currentTodos) =>
      updateTodoTitle(currentTodos, id, editingTitle),
    );
    cancelEditing();
  }

  const canSubmit = draftTitle.trim().length > 0;
  const canSaveEdit = editingTitle.trim().length > 0;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <section className="mx-auto flex w-full max-w-[920px] flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              今日任务
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">
              待办清单
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[300px]">
            <div className="rounded-md bg-surface px-3 py-2 shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
              <p className="text-lg font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">全部</p>
            </div>
            <div className="rounded-md bg-surface px-3 py-2 shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
              <p className="text-lg font-semibold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">未完成</p>
            </div>
            <div className="rounded-md bg-surface px-3 py-2 shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
              <p className="text-lg font-semibold text-primary">
                {stats.completed}
              </p>
              <p className="text-xs text-muted-foreground">已完成</p>
            </div>
          </div>
        </header>

        <div className="rounded-lg bg-surface p-4 shadow-[rgba(0,0,0,0.3)_0px_8px_8px] sm:p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={handleCreateTodo}
          >
            <Input
              aria-label="新任务标题"
              placeholder="输入新任务"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            <Button className="sm:w-[120px]" disabled={!canSubmit} type="submit">
              <Plus aria-hidden="true" className="h-4 w-4" />
              添加
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as TodoFilter[]).map((filterKey) => (
              <Button
                key={filterKey}
                type="button"
                variant={filter === filterKey ? "default" : "secondary"}
                size="sm"
                onClick={() => setFilter(filterKey)}
              >
                {FILTER_LABELS[filterKey]}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
          {visibleTodos.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
                <ClipboardList aria-hidden="true" className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                {getEmptyMessage(filter)}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visibleTodos.map((todo) => {
                const isEditing = editingId === todo.id;

                return (
                  <li
                    key={todo.id}
                    className="flex flex-col gap-3 bg-surface px-4 py-4 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox
                        checked={todo.completed}
                        label={todo.completed ? "标记为未完成" : "标记为完成"}
                        onCheckedChange={() =>
                          setTodos((currentTodos) =>
                            toggleTodo(currentTodos, todo.id),
                          )
                        }
                      />

                      {isEditing ? (
                        <Input
                          aria-label="编辑任务标题"
                          className="min-w-0"
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              saveEditing(todo.id);
                            }

                            if (event.key === "Escape") {
                              cancelEditing();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <p
                          className={`min-w-0 break-words pt-1 text-base ${
                            todo.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {todo.title}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                      {isEditing ? (
                        <>
                          <Button
                            aria-label="保存任务"
                            title="保存任务"
                            type="button"
                            size="icon"
                            disabled={!canSaveEdit}
                            onClick={() => saveEditing(todo.id)}
                          >
                            <Check aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="取消编辑"
                            title="取消编辑"
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={cancelEditing}
                          >
                            <X aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            aria-label="编辑任务"
                            title="编辑任务"
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(todo)}
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="删除任务"
                            title="删除任务"
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              setTodos((currentTodos) =>
                                deleteTodo(currentTodos, todo.id),
                              )
                            }
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          <span>{FILTER_LABELS[filter]} · {stats.active} 项待处理</span>
        </footer>
      </section>
    </main>
  );
}
