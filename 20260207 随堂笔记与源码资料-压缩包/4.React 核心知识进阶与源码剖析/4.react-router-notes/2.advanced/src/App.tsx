// import { Basic } from "./components/1.Base";

import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";

// const ProtectedRoute = ({ children }) => {
//   const isAuthenticated =
//     /* 自定义逻辑，验证用户是否已登录 */ true;
//   return isAuthenticated ? children : <Navigate to="/" replace />;
// };

function App() {
  return (
    <div>
      {/* <Basic /> */}
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
