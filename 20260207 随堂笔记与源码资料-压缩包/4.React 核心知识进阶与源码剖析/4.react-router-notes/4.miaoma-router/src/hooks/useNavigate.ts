import { useContext } from "react";
import { RouterContext } from "../contexts/RouterContext";

export const useNavigate = () => {
  return useContext(RouterContext)!.navigate;
};
