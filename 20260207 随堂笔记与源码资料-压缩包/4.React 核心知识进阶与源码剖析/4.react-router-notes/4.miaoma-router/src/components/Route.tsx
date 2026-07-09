import React, { useContext, type PropsWithChildren } from "react";
import { RouterContext } from "../contexts/RouterContext";

// 匹配路由
const matchPath = (pathname: string, path: string) => {
  return pathname === path;
};

interface RouteProps {
  path: string;
  element: React.ReactNode;
}

export const Routes = (props: PropsWithChildren) => {
  // 匹配组件
  let element: React.ReactNode | null = null;

  //   获得当前路由
  const location = useContext(RouterContext).location;

  // 子组件的遍历
  React.Children.map(props.children, (child) => {
    if (
      !element &&
      React.isValidElement(child) &&
      matchPath(child.props.path, location)
    ) {
      element = child;
    }
  });

  return element;
};

export const Route = (props: RouteProps) => {
  return props.element;
};
