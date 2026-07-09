import { createRouter, createWebHistory } from 'vue-router';

const HomePage = {
    template: `
        <main class="home-page">
            <h1>妙码智能剪辑平台</h1>
            <p>桌面端基础壳已就绪。</p>
        </main>
    `
};

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: HomePage
        }
    ]
});
