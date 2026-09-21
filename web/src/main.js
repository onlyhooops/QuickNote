import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import { applyTheme, watchSystemTheme } from './theme.js';
import { applyFonts } from './font.js';
import './style.css';
// 纸感主题（宣纸 / 桑皮纸）：纯 CSS + 内联 SVG 纸纹，复刻依据见 docs/paper-texture-research.md
import './themes-paper.css';
// 自托管中文字体分片（自动生成，npm run fonts:gen 重新生成）
import './fonts.generated.css';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/write' },
    { path: '/write', name: 'write', component: () => import('./views/WriteView.vue') },
    { path: '/timeline', name: 'timeline', component: () => import('./views/TimelineView.vue') },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') }
  ]
});

applyTheme();
applyFonts();
watchSystemTheme();

createApp(App).use(router).mount('#app');
