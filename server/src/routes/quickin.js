import express from 'express';
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { loadConfig, saveConfig, ROOT } from '../config.js';
import { createNote, normalizeTags } from '../db.js';
import { secretAllowed } from '../auth.js';

export const quickinRouter = Router();
// 兼容 PopClip/curl 的表单提交（同时保留 JSON）
quickinRouter.use(express.urlencoded({ extended: false }));

const MAX_TEXT = 8000;
const EXT_DIR = path.resolve(ROOT, '..', 'extensions', 'popclip');
const escHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const genToken = () => randomBytes(24).toString('base64url'); // 32 字符

/** 纯文本 → 行级 <p> 的 HTML（净化，防注入） */
function textToHtml(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ''));
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const body = lines.map((l) => (l ? `<p>${escHtml(l)}</p>` : '<p><br></p>')).join('');
  return `<div>${body}</div>`;
}

/** 当前 quickin 对外可见状态（令牌本身不回传） */
const quickinMask = () => {
  const c = loadConfig().quickin;
  return { enabled: c.enabled !== false, hasToken: !!c.token };
};

const fromLoopback = (req) => {
  const ip = String(req.socket?.remoteAddress || '');
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

/**
 * 修改令牌类操作的严格门控：仅本机，或“已配置令牌且请求头匹配”。
 * 防止未配置令牌时被局域网访问者抢先设置令牌（锁死属主）。
 */
const adminAllowed = (req) => {
  if (fromLoopback(req)) return true;
  const tk = loadConfig().quickin?.token;
  if (!tk) return false;
  return String(req.headers['x-quicknote-token'] || '') === tk;
};

/** GET /api/quickin/config —— 开关/令牌状态 */
quickinRouter.get('/config', (_req, res) => res.json(quickinMask()));

/** PUT /api/quickin/config —— 开关（令牌不在此修改） */
quickinRouter.put('/config', (req, res) => {
  const enabled = req.body?.enabled !== false;
  const next = saveConfig({ quickin: { enabled } });
  res.json({ ok: true, enabled: next.quickin.enabled !== false, hasToken: !!next.quickin.token });
});

/**
 * GET /api/quickin/token —— 读回已保存令牌（复制用）。
 * 门控同 AI Key：仅本机或携带有效令牌时返回。
 */
quickinRouter.get('/token', (req, res) => {
  if (!secretAllowed(req)) {
    return res.status(403).json({ ok: false, error: '出于安全考虑，仅本机访问或携带有效令牌时可查看令牌' });
  }
  res.json({ ok: true, token: loadConfig().quickin.token || '', hasToken: !!loadConfig().quickin.token });
});

/**
 * POST /api/quickin/token —— 生成/轮换新令牌（旧令牌即刻失效，PopClip 需重新下载/配置）。
 */
quickinRouter.post('/token', (req, res) => {
  if (!adminAllowed(req)) {
    return res.status(403).json({ ok: false, error: '出于安全考虑，仅本机访问或携带有效令牌时可生成/轮换令牌' });
  }
  const token = genToken();
  const next = saveConfig({ quickin: { token } });
  res.status(201).json({ ok: true, token: next.quickin.token, enabled: next.quickin.enabled !== false });
});

/** DELETE /api/quickin/token —— 清除令牌（恢复“不鉴权”，旧插件将失效） */
quickinRouter.delete('/token', (req, res) => {
  if (!adminAllowed(req)) {
    return res.status(403).json({ ok: false, error: '出于安全考虑，仅本机访问或携带有效令牌时可清除令牌' });
  }
  const next = saveConfig({ quickin: { token: '' } });
  res.json({ ok: true, hasToken: !!next.quickin.token, enabled: next.quickin.enabled !== false });
});

/** 把 quicknote.sh 中的烘焙占位行改写为实际值（留空则保持默认） */
function bakeScript(baseUrl, token) {
  const file = path.join(EXT_DIR, 'QuickNote.popclipext', 'quicknote.sh');
  let sh = readFileSync(file, 'utf8');
  sh = sh.replace(/^BASE_BAKED='.*'$/m, `BASE_BAKED='${String(baseUrl || '').replace(/'/g, '')}'`);
  sh = sh.replace(/^TOKEN_BAKED='.*'$/m, `TOKEN_BAKED='${String(token || '').replace(/'/g, '')}'`);
  return sh;
}

/**
 * GET /api/quickin/extension —— 下载 QuickNote.popclipextz
 * 按当前请求 Host（回环时归一为 127.0.0.1:PORT）与已配置令牌现场打包，
 * 安装到 PopClip 即可用（令牌留空则不鉴权）。内含令牌，故同样受门控保护。
 */
quickinRouter.get('/extension', (req, res) => {
  if (!secretAllowed(req)) {
    return res.status(403).json({ ok: false, error: '出于安全考虑，仅本机访问或携带有效令牌时可下载内置令牌的插件' });
  }
  const ext = path.join(EXT_DIR, 'QuickNote.popclipext');
  if (!existsSync(path.join(ext, 'Config.yaml')) || !existsSync(path.join(ext, 'icon.png'))) {
    return res.status(404).json({ error: '未找到插件模板（extensions/popclip/QuickNote.popclipext）' });
  }
  const token = loadConfig().quickin.token || '';
  // 回环请求默认指向本机，否则取用户访问设置页所用的 Host（形如 192.168.1.6:3987）
  let host = String(req.headers.host || `127.0.0.1:3987`).replace(/[^\w.:\-[\]]/g, '');
  const ip = String(req.socket?.remoteAddress || '');
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    const m = host.match(/:\d+$/);
    host = '127.0.0.1' + (m ? m[0] : ':3987');
  }
  const baseUrl = `http://${host}`;

  const zip = new AdmZip();
  const folder = 'QuickNote.popclipext/';
  zip.addFile(folder + 'Config.yaml', readFileSync(path.join(ext, 'Config.yaml')));
  zip.addFile(folder + 'icon.png', readFileSync(path.join(ext, 'icon.png')));
  zip.addFile(folder + 'quicknote.sh', Buffer.from(bakeScript(baseUrl, token), 'utf8'));

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="QuickNote.popclipextz"');
  res.send(zip.toBuffer());
});

/**
 * POST /api/quickin —— 快捷写入（PopClip 等外部工具）
 * body: { text: string, tags?: string[], source?: string }
 * 校验：仅本机访问；若配置了 quickin.token，则要求请求头 X-QuickNote-Token 匹配。
 */
quickinRouter.post('/', (req, res) => {
  const cfg = loadConfig().quickin;
  if (cfg && cfg.enabled === false) {
    return res.status(403).json({ ok: false, error: '快捷写入已关闭' });
  }
  if (cfg && cfg.token) {
    const got = String(req.headers['x-quicknote-token'] || '');
    if (got !== cfg.token) {
      return res.status(403).json({ ok: false, error: '令牌无效' });
    }
  }

  const raw = typeof req.body?.text === 'string' ? req.body.text : '';
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text) return res.status(400).json({ ok: false, error: '文本不能为空' });
  if (text.length > MAX_TEXT) {
    return res.status(400).json({ ok: false, error: `文本超过 ${MAX_TEXT} 字符` });
  }

  // tags 支持数组（JSON）或逗号分隔字符串（表单）
  let tagRaw = req.body?.tags;
  if (typeof tagRaw === 'string') tagRaw = tagRaw.split(',').map((t) => t.trim()).filter(Boolean);
  const tags = normalizeTags(tagRaw);
  const source = String(req.body?.source || 'popclip').trim().slice(0, 24);

  const content = textToHtml(text);
  const note = createNote(content, text, tags);
  res.status(201).json({
    ok: true,
    id: note.id,
    source,
    tags: note.tags,
    created_at: note.created_at
  });
});
