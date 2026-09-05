import { Router } from 'express';
import { loadConfig, saveConfig } from '../config.js';
import { runBackup } from '../backup/runner.js';

export const backupRouter = Router();

/** GET /api/backup/config —— 读取备份配置 */
backupRouter.get('/config', (_req, res) => {
  const cfg = loadConfig();
  res.json(cfg);
});

/** PUT /api/backup/config —— 更新备份配置（可传部分字段） */
backupRouter.put('/config', (req, res) => {
  const body = req.body ?? {};
  const patch = {};
  if (body.webdav && typeof body.webdav === 'object') {
    const w = { ...loadConfig().webdav, ...body.webdav };
    // 空串密码视为保持不变
    if (w.password === '') w.password = loadConfig().webdav.password;
    patch.webdav = w;
  }
  if (body.autoBackup && typeof body.autoBackup === 'object') {
    patch.autoBackup = { ...loadConfig().autoBackup, ...body.autoBackup };
  }
  res.json(saveConfig(patch));
});

/** POST /api/backup/run —— 立即执行一次备份 */
backupRouter.post('/run', async (_req, res) => {
  try {
    const result = await runBackup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});
