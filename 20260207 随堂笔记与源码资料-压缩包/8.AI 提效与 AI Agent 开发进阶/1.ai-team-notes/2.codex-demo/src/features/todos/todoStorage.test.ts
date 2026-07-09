import { describe, expect, it } from "vitest";
import { loadTodos, saveTodos, TODOS_STORAGE_KEY } from "./todoStorage";
import type { Todo } from "./todoTypes";

function createMemoryStorage(initialValue?: string) {
  let value = initialValue ?? null;

  return {
    getItem: (key: string) => (key === TODOS_STORAGE_KEY ? value : null),
    setItem: (key: string, nextValue: string) => {
      if (key === TODOS_STORAGE_KEY) {
        value = nextValue;
      }
    },
  };
}

const todo: Todo = {
  id: "todo-1",
  title: "写测试",
  completed: false,
  createdAt: "2026-06-06T03:00:00.000Z",
  updatedAt: "2026-06-06T03:00:00.000Z",
};

describe("todoStorage", () => {
  it("可以保存并读取任务", () => {
    const storage = createMemoryStorage();

    saveTodos(storage, [todo]);

    expect(loadTodos(storage)).toEqual([todo]);
  });

  it("空存储返回空数组", () => {
    expect(loadTodos(createMemoryStorage())).toEqual([]);
  });

  it("无效 JSON 返回空数组", () => {
    expect(loadTodos(createMemoryStorage("{bad-json"))).toEqual([]);
  });

  it("只保留结构有效的任务", () => {
    const storage = createMemoryStorage(JSON.stringify([todo, { id: "bad" }]));

    expect(loadTodos(storage)).toEqual([todo]);
  });
});
