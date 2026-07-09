import type { Todo } from "./todoTypes";

export const TODOS_STORAGE_KEY = "todo-app:v1:todos";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function isTodo(value: unknown): value is Todo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.completed === "boolean" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

export function loadTodos(storage: StorageLike): Todo[] {
  const rawValue = storage.getItem(TODOS_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue.filter(isTodo) : [];
  } catch {
    return [];
  }
}

export function saveTodos(storage: StorageLike, todos: Todo[]) {
  storage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
}
