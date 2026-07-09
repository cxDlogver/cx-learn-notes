import { useContext } from "react";
import { LangContext } from "../contexts/LangContext";

export const useLang = () => {
  const ctx = useContext(LangContext);

  return ctx;
};
