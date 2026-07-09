import { THEME_KEY } from "@/constants/THEME";
import { inject } from "vue";

export const useTheme = () => {
  const theme = inject(THEME_KEY);

  return {
    theme,
  };
};
