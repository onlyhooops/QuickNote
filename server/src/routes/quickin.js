import express from 'express';
import { Router } from 'express';
import { loadConfig } from '../config.js';
import { createNote, normalizeTags } from '../db.js';

export const quickinRouter = Router();
// 兼容 PopClip/curl 的表单提交（同时保留 JSON）
quickinRouter.use(express.urlencoded({ extended: false }));

const MAX_TEXT = 8000;
const escHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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
