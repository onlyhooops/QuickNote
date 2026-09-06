import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';

// 构建期注入：版本号与编译时间（在“设置 → 关于”展示）
const rootPkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_NAME__: JSON.stringify(rootPkg.name || 'quicknote'),
    __APP_VERSION__: JSON.stringify(rootPkg.version || '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3987',
      '/images': 'http://127.0.0.1:3987'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
