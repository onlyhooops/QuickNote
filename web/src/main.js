import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import { applyTheme, watchSystemTheme } from './theme.js';
import { applyFonts } from './font.js';
import './style.css';

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
