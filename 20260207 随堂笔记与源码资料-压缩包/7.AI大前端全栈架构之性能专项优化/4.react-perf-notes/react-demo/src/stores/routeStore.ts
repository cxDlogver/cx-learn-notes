import { create } from "zustand";

type Store = {
  route: string;
  setRoute: (route: string) => void;
}

export const useRouteStore = create<Store>((set) => ({
  route: "home",
  setRoute: (route) => set({ route }),
}));
