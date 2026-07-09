import { useEffect, useState } from "react";

// 路由映射表
const routes = [
  {
    path: "/home",
    element: <div>主页</div>,
  },
  {
    path: "/detail",
    element: <div>详情</div>,
  },
  {
    path: "/issue",
    element: <div>缺陷</div>,
  },
];

export function HistoryAPI() {
  // 浏览器当前路由初始化，同步到状态
  const [pathname, setPathname] = useState(window.location.pathname);
  console.log("🚀 ~ HistoryAPI ~ pathname:", pathname);

  // // 监听逻辑
  // useEffect(() => {
  //   const handlePop = () => {
  //     console.log(window.location.pathname);

  //     setPathname(window.location.pathname);
  //   };
  //   window.addEventListener("popstate", handlePop, false);

  //   return () => {
  //     window.removeEventListener("popstate", handlePop);
  //   };
  // }, []);

  // 路由匹配
  const matchRoute = (path: string) => {
    const currentRoute = routes.find((item) => item.path === path);

    // if (!currentRoute) return 404;

    return currentRoute;

    // return currentRoute.element;
  };

  // 路由视图渲染
  const renderMatchs = (path: string) => {
    const matches = matchRoute(path);

    if (!matches) return 404;

    return matches.element;
  };

  // 主动修改状态引起历史记录变更同步
  const handlePush = (path: string) => {
    setPathname(path);
    // history.pushState(null, "", path);
  };

  return (
    <div>
      {renderMatchs(pathname)}
      <button onClick={() => history.back()}>返回</button>
      <button onClick={() => handlePush("/home")}>状态跳转 home</button>
      <button onClick={() => handlePush("/detail")}>状态跳转到 detail</button>
      <button onClick={() => handlePush("/issue")}>状态跳转到 issue</button>
    </div>
  );
}
