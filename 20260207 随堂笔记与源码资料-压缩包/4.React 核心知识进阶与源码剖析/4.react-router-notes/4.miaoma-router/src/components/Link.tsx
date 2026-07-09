import { type PropsWithChildren } from "react";
import { RouterContext } from "../contexts/RouterContext";

export const Link = (props: PropsWithChildren<{ path: string }>) => {
  return (
    <RouterContext.Consumer>
      {(ctx) => {
        return (
          <div>
            <a onClick={() => ctx?.navigate(`/${props.path}`)}>
              {props.children}
            </a>
          </div>
        );
      }}
    </RouterContext.Consumer>
  );
};
