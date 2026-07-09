import { Ref, ref } from "vue";

type UseToggleResult = [Ref<boolean>, () => void];

export const useToggle = (initial: boolean): UseToggleResult => {
  const flag = ref(initial);

  const toggle = () => {
    flag.value = !flag.value;
  };

  return [flag, toggle];
};
