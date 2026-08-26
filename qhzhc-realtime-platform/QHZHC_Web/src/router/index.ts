import Vue from "vue";
import VueRouter, { type RouteConfig } from "vue-router";
import {
  fetchSessionProfile,
  type SessionProfile,
} from "@/services/authSession";

Vue.use(VueRouter);

const routes: RouteConfig[] = [
  {
    path: "/",
    component: () => import("@/layout/wholePage.vue"),
    redirect: "/index",
    children: [
      {
        path: "/index",
        component: () => import("@/views/home/indexApp.vue"),
        meta: { title: "首页", requireAuth: false },
      },
      {
        path: "/dataVisualization",
        component: () =>
          import("@/views/DataVisualization/dataVisualization.vue"),
        meta: { title: "数据可视化", requireAuth: true },
      },
    ],
  },
  {
    path: "/login",
    component: () => import("@/views/loginPage.vue"),
    meta: { title: "登录", requireAuth: false },
  },
  {
    path: "/register",
    component: () => import("@/views/registerPage.vue"),
    meta: { title: "注册", requireAuth: false },
  },
  {
    path: "/admin/simulator",
    component: () => import("@/views/Admin/simulatorAdmin.vue"),
    meta: {
      title: "走航模拟后台",
      requireAuth: true,
      adminOnly: true,
    },
  },
  { path: "*", redirect: "/index" },
];

const router = new VueRouter({ routes });

function clearSessionProfile(): void {
  sessionStorage.removeItem("qhzhc_authenticated");
  localStorage.removeItem("user");
  localStorage.removeItem("userform");
}

function cachedProfile(): SessionProfile | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as SessionProfile) : null;
  } catch (_error) {
    return null;
  }
}

let sessionBootstrap: Promise<SessionProfile> | null = null;

async function bootstrapSession(): Promise<SessionProfile> {
  if (!sessionBootstrap) {
    sessionBootstrap = fetchSessionProfile().finally(() => {
      sessionBootstrap = null;
    });
  }
  return sessionBootstrap;
}

router.beforeEach(async (to, _from, next) => {
  document.title = `${String(to.meta?.title || "平台")} | 温室气体监测和计量平台`;
  const requiresAuth = to.matched.some((record) => record.meta.requireAuth);
  const adminOnly = to.matched.some((record) => record.meta.adminOnly);
  if (!requiresAuth) {
    next();
    return;
  }

  try {
    let profile = cachedProfile();
    if (
      sessionStorage.getItem("qhzhc_authenticated") !== "true" ||
      !profile
    ) {
      profile = await bootstrapSession();
      sessionStorage.setItem("qhzhc_authenticated", "true");
      localStorage.setItem("user", JSON.stringify(profile));
      localStorage.setItem("userform", JSON.stringify(profile));
    }
    if (adminOnly && !profile.is_superuser) {
      next("/dataVisualization");
      return;
    }
    next();
  } catch (_error) {
    clearSessionProfile();
    next({ path: "/login", query: { redirect: to.fullPath } });
  }
});

export default router;
