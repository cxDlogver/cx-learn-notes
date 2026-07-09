import { create } from "zustand";

interface Info {
  age?: number;
  name?: string;
}

type CounterState = {
  count: number;
  info: Info;
  add: () => void;
  sub: () => void;
  changeName: () => void;
};

export const useCounter = create<CounterState>((set) => ({
  count: 0,
  info: {
    age: 18,
    name: "heyi",
  },
  add: () => set((state) => ({ count: state.count + 1 })),
  sub: () => set((state) => ({ count: state.count - 1 })),
  changeName: () => set((state) => ({ info: { ...state.info, name: "合二" } })),
}));
