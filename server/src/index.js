import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HOST, PORT, IMAGES_DIR, ATTACHMENTS_DIR, ensureDirs, loadConfig, WEB_DIST, CONFIG_FILE } from './config.js';
import { notesRouter } from './routes/notes.js';
import { tagsRouter } from './routes/tags.js';
import { imagesRouter, imagesErrorHandler } from './routes/images.js';
import { attachmentsRouter } from './routes/attachments.js';
import { unfurlRouter } from './routes/unfurl.js';
import { aiRouter } from './routes/ai.js';
import { quickinRouter } from './routes/quickin.js';
import { backupRouter } from './routes/backup.js';
import { updateRouter } from './routes/update.js';
import { runBackup } from './backup/runner.js';

ensureDirs();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

// ---- API ----
app.use('/api/notes', notesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/unfurl', unfurlRouter);
app.use('/api/ai', aiRouter);
app.use('/api/quickin', quickinRouter);
app.use('/api/backup', backupRouter);
app.use('/api/update', updateRouter);
app.use('/images', express.static(IMAGES_DIR, { maxAge: '30d' }));
app.use('/attachments', express.static(ATTACHMENTS_DIR));

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'quicknote' }));

// ---- 前端构建产物（生产单进程模式） ----
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  // SPA fallback：非 /api、非 /images 的 GET 一律回退到 index.html（hash 路由其实用不到，保险起见）
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/images')) {
      return res.sendFile(path.join(WEB_DIST, 'index.html'));
    }
    next();
  });
  console.log(`[quicknote] 托管前端构建产物：${WEB_DIST}`);
} else {
  console.log('[quicknote] 未发现 web/dist（开发模式请另行启动 Vite dev server）');
}

// ---- 统一 404 / 错误处理 ----
app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在' }));
app.use(imagesErrorHandler);
app.use((err, _req, res, _next) => {
  console.error('[quicknote] 未捕获错误：', err);
  res.status(500).json({ error: String(err?.message ?? '服务器内部错误') });
});

app.listen(PORT, HOST, () => {
  console.log(`[quicknote] 服务已启动：http://${HOST}:${PORT}`);
  console.log(`[quicknote] 数据目录：${path.dirname(CONFIG_FILE)}`);
  if (HOST === '0.0.0.0') {
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address);
    console.log(`[quicknote] 已开放局域网：手机可访问 http://${ips[0] ?? '<局域网IP>'}:${PORT}`);
    console.log('[quicknote] 注意：应用无账号体系，任何能访问到该端口的人均可读写笔记，请仅在可信网络使用！');
  } else {
    console.log(`[quicknote] 仅本机可访问。如需手机/平板访问，请以 QUICKNOTE_HOST=0.0.0.0 启动（风险自负，详见 README「移动端访问」）。`);
  }
});

// ---- 定时自动备份 ----
const TICK_MS = 60_000;
async function checkSchedule() {
  try {
    const cfg = loadConfig();
    const ab = cfg.autoBackup;
    if (!ab?.enabled || !ab.everyHours || ab.everyHours < 1) return;
    const everyMs = ab.everyHours * 3600_000;
    const last = ab.lastRunAt ? new Date(ab.lastRunAt).getTime() : 0;
    if (Date.now() - last >= everyMs) {
      console.log('[quicknote] 触发定时自动备份…');
      const result = await runBackup();
      console.log(`[quicknote] 自动备份完成：${result.message}`);
    }
  } catch (err) {
    console.error('[quicknote] 定时备份失败：', err);
  }
}
setInterval(checkSchedule, TICK_MS);
// 启动后先检查一次（若服务重启且距上次备份超时则立即补跑）
setTimeout(checkSchedule, 15_000);
