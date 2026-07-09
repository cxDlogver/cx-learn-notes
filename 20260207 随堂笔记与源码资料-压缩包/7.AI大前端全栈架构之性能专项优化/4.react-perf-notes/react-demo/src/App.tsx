import React, { Suspense, useState } from "react";
import "./App.css";
import { useRouteStore } from "./stores/routeStore";

// 静态导入
// import About from './components/About'
// import Contact from './components/Contact'
// import Home from './components/Home'

// 动态导入
const Home = React.lazy(() => import("./components/Home"));
const About = React.lazy(() => import("./components/About"));
const Contact = React.lazy(() => import("./components/Contact"));

const AppContent = () => {  
  const route = useRouteStore((state) => state.route);

  return (
    <div>
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          {route === "home" && <Home />}
          {route === "about" && <About />}
          {route === "contact" && <Contact />}
        </Suspense>
      </div>
    </div>
  );
}

function App() {

  // 集中状态管理，就可以实现父组件无需更新，只是子组件根据需要而更新
  // const [route, setRoute] = useState("home");
  const setRoute = useRouteStore((state) => state.setRoute);
  return (
    <div>
      <div>Header</div>
      <div>Nav</div>
      <ul>
        <li onClick={() => setRoute("home")}>Home</li>
        <li onClick={() => setRoute("about")}>About</li>
        <li onClick={() => setRoute("contact")}>Contact</li>
      </ul>
      <AppContent />
    </div>
  )
}

export default App;
