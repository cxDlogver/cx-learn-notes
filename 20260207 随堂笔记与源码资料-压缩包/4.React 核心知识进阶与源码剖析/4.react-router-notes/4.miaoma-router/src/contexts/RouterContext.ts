import { createContext } from "react";

interface RouterContextValue {
  location: string;
  navigate: (to: string) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);
