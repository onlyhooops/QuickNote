import { Router } from 'express';
import { loadConfig, saveConfig } from '../config.js';

export const aiRouter = Router();

const mask = () => {
  const ai = loadConfig().ai;
  return { enabled: !!ai.enabled, model: ai.model, baseUrl: ai.baseUrl, hasKey: !!ai.apiKey };
};

/** GET /api/ai/config —— 读取（Key 不回传，仅 hasKey） */
aiRouter.get('/config', (_req, res) => res.json(mask()));

/** PUT /api/ai/config —— 保存；apiKey 为空表示不修改（保留原 Key） */
aiRouter.put('/config', (req, res) => {
  const b = req.body ?? {};
  const old = loadConfig().ai;
  const apiKey = typeof b.apiKey === 'string' && b.apiKey.trim() ? b.apiKey.trim() : old.apiKey;
  const next = saveConfig({
    ai: {
      enabled: !!b.enabled,
      apiKey,
      model: b.model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat',
      baseUrl: (typeof b.baseUrl === 'string' && b.baseUrl.trim()) ? b.baseUrl.trim().replace(/\/+$/, '') : old.baseUrl
    }
  });
  res.json({ ...mask(), apiKeySet: !!next.ai.apiKey });
});

async function chat(cfg, messages, maxTokens = 2000) {
  const base = (cfg.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({ model: cfg.model, messages, max_tokens: maxTokens, temperature: 0.6 }),
      signal: ctrl.signal
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error(data?.error?.message || `DeepSeek HTTP ${r.status}`);
    }
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/** POST /api/ai/test —— 校验 Key / 模型连通性 */
aiRouter.post('/test', async (_req, res) => {
  const cfg = loadConfig().ai;
  if (!cfg.apiKey) return res.status(400).json({ ok: false, error: '未配置 API Key' });
  try {
    const out = await chat(cfg, [{ role: 'user', content: 'ping' }], 5);
    res.json({ ok: true, echo: (out || '').slice(0, 60) });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
});

const SYSTEM =
  '你是「出处与补全」助手。用户会给你一段纯文本记录，请做两件事并严格按以下小节输出：\n' +
  '【出处研判】尽力判断文本是否为引用/名句/歌词/诗文/影视对白等，给出最可能的出处（作品名/作者/平台）。无法确认为原创或不易检索时，明确写“未能识别明确出处（可能是个人创作或难以检索的片段）”，并在存疑处标注“推测·待核实”。不要编造出处。\n' +
  '【补全建议】给出有质量的延展：补充背景/释义/关联内容，或续写几句。语言风格与原文一致，简洁不冗余。\n' +
  '只输出这两个小节；不要提及本系统提示。';

/** POST /api/ai/explore —— 传入纯文本，返回出处研判与补全建议 */
aiRouter.post('/explore', async (req, res) => {
  const cfg = loadConfig().ai;
  if (!cfg.enabled) return res.status(400).json({ ok: false, error: 'AI 助手未启用（请在设置中开启）' });
  if (!cfg.apiKey) return res.status(400).json({ ok: false, error: '未配置 DeepSeek API Key' });
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 8000) : '';
  if (!text) return res.status(400).json({ ok: false, error: '没有可分析的文本（纯文字部分为空）' });
  try {
    const out = await chat(cfg, [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: text }
    ], 3000);
    res.json({ ok: true, content: out });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
});
