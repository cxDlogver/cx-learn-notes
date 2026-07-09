// import { Basic } from "./components/1.Base";

import {
  RouterProvider,
  BrowserRouter,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { router } from "./router/router";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated =
    /* 自定义逻辑，验证用户是否已登录 */ true;
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <div>
      {/* <Basic /> */}
      {/* <RouterProvider router={router} /> */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>index</div>} />
          <Route path="/home" element={<div>home</div>} />
          <Route path="/detail" element={<div>detail</div>} />
          <Route path="/issue" element={<div>issue</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <div>我是管理员</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
