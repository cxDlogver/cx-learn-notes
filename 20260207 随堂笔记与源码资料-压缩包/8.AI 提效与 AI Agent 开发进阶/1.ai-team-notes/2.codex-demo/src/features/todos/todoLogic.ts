import type { Todo, TodoFilter } from "./todoTypes";

type Clock = () => string;
type IdFactory = () => string;

const defaultClock: Clock = () => new Date().toISOString();

const defaultIdFactory: IdFactory = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function createTodo(
  title: string,
  clock: Clock = defaultClock,
  idFactory: IdFactory = defaultIdFactory,
): Todo | null {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    return null;
  }

  const now = clock();

  return {
    id: idFactory(),
    title: normalizedTitle,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function toggleTodo(
  todos: Todo[],
  id: string,
  clock: Clock = defaultClock,
): Todo[] {
  const now = clock();

  return todos.map((todo) =>
    todo.id === id
      ? { ...todo, completed: !todo.completed, updatedAt: now }
      : todo,
  );
}

export function updateTodoTitle(
  todos: Todo[],
  id: string,
  title: string,
  clock: Clock = defaultClock,
): Todo[] {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    return todos;
  }

  const now = clock();

  return todos.map((todo) =>
    todo.id === id ? { ...todo, title: normalizedTitle, updatedAt: now } : todo,
  );
}

export function deleteTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter((todo) => todo.id !== id);
}

export function filterTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (filter === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

export function getTodoStats(todos: Todo[]) {
  const completed = todos.filter((todo) => todo.completed).length;

  return {
    total: todos.length,
    active: todos.length - completed,
    completed,
  };
}
