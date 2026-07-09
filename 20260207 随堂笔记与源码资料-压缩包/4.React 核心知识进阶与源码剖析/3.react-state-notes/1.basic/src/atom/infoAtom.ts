import { atom } from "jotai";
import { nameAtom } from "./nameAtom";
import { ageAtom } from "./ageAtom";

export const infoAtom = atom((get) => {
  const name = get(nameAtom);
  const age = get(ageAtom);

  return {
    name,
    age,
  };
});
