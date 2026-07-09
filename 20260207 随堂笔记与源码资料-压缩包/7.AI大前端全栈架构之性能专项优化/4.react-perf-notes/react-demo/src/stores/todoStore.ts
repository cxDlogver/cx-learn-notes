import { produce } from "immer";
import { create } from "zustand";

type Store = {
  todos: { id: number; text: string; completed: boolean }[];
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
};

export const useTodoStore = create<Store>((set) => ({
  todos: [],
  addTodo: (text: string) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now(), text, completed: false }],
    })),
  //   不能直接赋值原数组，会导致 rerender 范围太大
  toggleTodo: (id: number) =>
    set((state) =>
      produce(state, (draft) => {
        draft.todos.forEach((todo) => {
          if (todo.id === id) {
            todo.completed = !todo.completed;
          }
        });
      }),
    ),
}));
