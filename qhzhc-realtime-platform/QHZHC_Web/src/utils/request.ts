import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { Message } from "element-ui";
import router from "../router";
import { resolveApiBaseUrl } from "./apiBaseUrl";

const service = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 30_000,
});

service.interceptors.request.use((config: AxiosRequestConfig) => config);

service.interceptors.response.use(
  (response) => response,
  async (rawError: AxiosError<{ message?: string; detail?: string }>) => {
    if (rawError.response?.status === 401) {
      sessionStorage.removeItem("qhzhc_authenticated");
      localStorage.removeItem("user");
      localStorage.removeItem("userform");
      if (router.currentRoute.path !== "/login") {
        await router.replace({
          path: "/login",
          query: { redirect: router.currentRoute.fullPath },
        });
      }
    } else {
      Message.error(
        rawError.response?.data?.message ||
          rawError.response?.data?.detail ||
          rawError.message,
      );
    }
    return Promise.reject(rawError);
  },
);

export default service;
