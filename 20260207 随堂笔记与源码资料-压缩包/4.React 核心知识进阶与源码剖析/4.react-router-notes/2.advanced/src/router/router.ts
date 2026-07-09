import { /* createBrowserRouter, createHashRouter, */ createMemoryRouter } from "react-router";
import { routes } from "./routes";

// 浏览器历史记录栈
// export const router = createBrowserRouter(routes);
// export const router = createHashRouter(routes);
export const router = createMemoryRouter(routes);
