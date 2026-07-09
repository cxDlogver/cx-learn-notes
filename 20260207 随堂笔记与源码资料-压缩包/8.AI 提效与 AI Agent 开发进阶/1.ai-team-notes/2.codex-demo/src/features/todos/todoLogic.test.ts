import { describe, expect, it } from "vitest";
import {
  createTodo,
  deleteTodo,
  filterTodos,
  getTodoStats,
  toggleTodo,
  updateTodoTitle,
} from "./todoLogic";
import type { Todo } from "./todoTypes";

const now = () => "2026-06-06T03:00:00.000Z";
const later = () => "2026-06-06T04:00:00.000Z";
const idFactory = () => "todo-1";

const baseTodos: Todo[] = [
  {
    id: "todo-1",
    title: "写计划",
    completed: false,
    createdAt: "2026-06-06T03:00:00.000Z",
    updatedAt: "2026-06-06T03:00:00.000Z",
  },
  {
    id: "todo-2",
    title: "验收页面",
    completed: true,
    createdAt: "2026-06-06T03:00:00.000Z",
    updatedAt: "2026-06-06T03:00:00.000Z",
  },
];

describe("todoLogic", () => {
  it("创建任务时会裁剪标题并填充默认字段", () => {
    expect(createTodo("  发布应用  ", now, idFactory)).toEqual({
      id: "todo-1",
      title: "发布应用",
      completed: false,
      createdAt: "2026-06-06T03:00:00.000Z",
      updatedAt: "2026-06-06T03:00:00.000Z",
    });
  });

  it("空白标题不会创建任务", () => {
    expect(createTodo("   ", now, idFactory)).toBeNull();
  });

  it("可以切换完成状态并更新时间", () => {
    expect(toggleTodo(baseTodos, "todo-1", later)[0]).toMatchObject({
      completed: true,
      updatedAt: "2026-06-06T04:00:00.000Z",
    });
  });

  it("可以更新非空标题", () => {
    expect(updateTodoTitle(baseTodos, "todo-1", "  写实现  ", later)[0]).toMatchObject({
      title: "写实现",
      updatedAt: "2026-06-06T04:00:00.000Z",
    });
  });

  it("空白编辑标题不会覆盖原任务", () => {
    expect(updateTodoTitle(baseTodos, "todo-1", "   ", later)).toBe(baseTodos);
  });

  it("可以删除指定任务", () => {
    expect(deleteTodo(baseTodos, "todo-1")).toEqual([baseTodos[1]]);
  });

  it("可以按状态筛选任务", () => {
    expect(filterTodos(baseTodos, "all")).toHaveLength(2);
    expect(filterTodos(baseTodos, "active")).toEqual([baseTodos[0]]);
    expect(filterTodos(baseTodos, "completed")).toEqual([baseTodos[1]]);
  });

  it("可以统计全部、未完成和已完成数量", () => {
    expect(getTodoStats(baseTodos)).toEqual({
      total: 2,
      active: 1,
      completed: 1,
    });
  });
});
