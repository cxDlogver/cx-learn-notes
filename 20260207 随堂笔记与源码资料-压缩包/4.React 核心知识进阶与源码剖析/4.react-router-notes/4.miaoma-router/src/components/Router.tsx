// BrowserRouter
// HashRouter
// MemoryRouter
import { useEffect, useState, type PropsWithChildren } from "react";
import { RouterContext } from "../contexts/RouterContext";

// 1. 先有一个 provider，深层状态管理
// 2. 确定用什么记录栈
// 3. 路由匹配，得到组件
// 4. 组件渲染

interface BrowserRouterProps extends PropsWithChildren {
  pathname?: string;
}

export const BrowserRouter = (props: BrowserRouterProps) => {
  // 获取当前路由
  const [location, setLocation] = useState(window.location.pathname);

  //   导航方法
  const navigate = (to: string) => {
    setLocation(to);
    // 状态同步到 location
    window.history.pushState({}, "", to);
  };

  useEffect(() => {
    console.log("useEffect");
    const handlePop = () => {
      console.log("popstate");
      console.log(window.location.pathname);
      setLocation(window.location.pathname);
    };
    window.addEventListener("popstate", handlePop);
    // window.addEventListener('hashchange', () => {
    //     console.log('hashchange');
    // })

    return () => {
      window.removeEventListener("popstate", handlePop);
    };
  }, []);

  return (
    <RouterContext.Provider
      value={{
        location,
        navigate,
      }}
    >
      {props.children}
    </RouterContext.Provider>
  );
};
