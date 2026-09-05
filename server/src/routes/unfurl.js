import { Router } from 'express';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,*/*'
};

const decodeEntity = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

/** 逐一解析 <meta> 标签，提取 name/property/itemprop 与 content（顺序无关） */
function extractMetas(html) {
  const out = {};
  const re = /<meta[^>]+>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const attr = (name) => {
      const k = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']+)["\']', 'i'));
      return k ? k[1] : '';
    };
    const key = (attr('property') || attr('name') || attr('itemprop') || '').toLowerCase();
    const content = attr('content');
    if (key && content && !(key in out)) out[key] = decodeEntity(content.trim());
  }
  return out;
}

export const unfurlRouter = Router();

/** GET /api/unfurl?url= — 抓取网页 Open Graph 元信息，用于生成链接卡片 */
unfurlRouter.get('/', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: 'invalid url' });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: HEADERS });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text();
    const metas = extractMetas(html);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title =
      metas['og:title'] || metas['twitter:title'] ||
      (titleMatch ? decodeEntity(titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()) : '');
    const desc = metas['og:description'] || metas.description || metas['twitter:description'] || '';
    const thumb = metas['og:image'] || metas['twitter:image'] || '';
    const site = metas['og:site_name'] || '';
    res.json({ ok: true, url, title, desc, thumb, site });
  } catch (e) {
    res.json({ ok: false, url, error: String(e.message || e) });
  } finally {
    clearTimeout(timer);
  }
});
