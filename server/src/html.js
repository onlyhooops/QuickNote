// 摘抄内容（网页 HTML / Markdown）→ 快记可用的净化 HTML
//
// 设计目标（对应需求）：
//  - 保留排版：标题 / 加粗斜体 / 列表 / 引用 / 代码块 / 表格 / 链接 / 分隔线
//  - 丢弃：图片、内联样式、网页 class/data-*/事件属性、脚本、iframe、按钮等噪音
//  - 安全：白名单净化（不信任 PopClip 传来的 HTML），链接仅 http(s)/mailto
//  - 归一化：div → p，空段落清理，便于 Tiptap 解析成文档流
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';

/** HTML 摘抄上限（字符数）；超限自动回退 Markdown / 纯文本 */
export const MAX_HTML = 200_000;
/** Markdown 摘抄上限（字符数） */
export const MAX_MARKDOWN = 100_000;

export const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ALLOWED_TAGS = [
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'hr', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'a'
];

// 净化后清理空壳段落/容器（div 包装、空行），避免编辑器里出现大量空段
const EMPTY_BLOCK_RE = /<(p|div)>\s*(?:<br\s*\/?>\s*)*<\/\1>/gi;

// 块级标签之间的缩进空白（不影响 pre/code 内的代码缩进）
const BLOCK_TAGS = 'p|div|h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tfoot|tr';
const AFTER_BLOCK_RE = new RegExp(`(<(?:${BLOCK_TAGS})\\b[^>]*>)\\s+`, 'gi');
const BEFORE_CLOSE_RE = new RegExp(`\\s+(</(?:${BLOCK_TAGS})>)`, 'gi');

// 这些标签连同其文本一起丢弃（复制按钮、脚本、样式、图标等噪音）
const NON_TEXT_TAGS = [
  'script', 'style', 'textarea', 'option', 'button', 'select',
  'svg', 'iframe', 'noscript', 'template', 'input', 'math'
];

/** 校验来源 URL：仅接受干净的 http(s) 绝对地址 */
export function cleanSourceUrl(raw) {
  const u = String(raw ?? '').trim();
  if (u.length > 2048) return '';
  if (!/^https?:\/\//i.test(u)) return '';
  if (/[\s<>"']/.test(u)) return '';
  try {
    const parsed = new URL(u);
    if (!parsed.hostname) return '';
    return u;
  } catch {
    return '';
  }
}

/** 由 URL 生成简洁来源名：优先网页标题，其次域名 */
export function sourceLabel(url, titleRaw) {
  const title = String(titleRaw ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (title) return title;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** 记录末尾的「来源」超链接段落（无有效来源时返回空串） */
export function sourceTail(url, title) {
  const clean = cleanSourceUrl(url);
  if (!clean) return '';
  const label = escapeHtml(sourceLabel(clean, title));
  const href = escapeHtml(clean);
  return `<p class="qn-src"><a href="${href}" target="_blank" rel="noopener noreferrer">来源 · ${label}</a></p>`;
}

/** 纯文本 → 行级 <p>（保留原行为，不附来源） */
export function plainTextToHtml(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ''));
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const body = lines.map((l) => (l ? `<p>${escapeHtml(l)}</p>` : '<p><br></p>')).join('');
  return `<div>${body}</div>`;
}

/** 相对链接按页面 URL 补全；无 base 时相对链接降级为纯文本（去掉 href） */
function resolveHref(href, baseUrl) {
  const h = String(href ?? '').trim();
  if (!h) return '';
  if (/^(https?:|mailto:)/i.test(h)) return h;
  if (h.startsWith('#')) return h;
  if (!baseUrl) return '';
  try {
    return new URL(h, baseUrl).href;
  } catch {
    return '';
  }
}

function sanitizeOptions(baseUrl) {
  return {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: true,
    disallowedTagsMode: 'discard',
    nonTextTags: NON_TEXT_TAGS,
    exclusiveFilter: (frame) => {
      // 注意：sanitize-html 的 exclusiveFilter 返回 true = 丢弃（连同内容）
      // 这里只丢弃常见“噪音容器”整棵子树（代码块头部/复制按钮/工具栏/行号等）
      const cls = String(frame.attribs?.class || '');
      return /(?:^|[\s_-])(?:copy|code-header|code-block-header|code-toolbar|toolbar|hljs-ln|line-numbers)(?:[\s_-]|$)/i.test(cls);
    },
    transformTags: {
      // 链接：补全相对地址；无法解析的相对链接降级为纯文本
      a: (tagName, attribs) => {
        const href = resolveHref(attribs.href, baseUrl);
        if (!href) return { tagName: 'span', attribs: {} };
        return { tagName, attribs: { href, title: attribs.title || '' } };
      }
    }
  };
}

/** 网页 HTML → 快记可用的净化 HTML */
export function sanitizeCaptureHtml(html, baseUrl = '') {
  let out = sanitizeHtml(String(html ?? ''), sanitizeOptions(baseUrl));
  // 反复清理空壳（div 包装、空行），最多 3 轮处理嵌套
  for (let i = 0; i < 3; i++) {
    const next = out.replace(EMPTY_BLOCK_RE, '');
    if (next === out) break;
    out = next;
  }
  // 压缩块级标签之间的缩进空白（pre/code 内缩进原样保留）
  out = out.replace(AFTER_BLOCK_RE, '$1').replace(BEFORE_CLOSE_RE, '$1');
  return out.replace(/\s+$/, '');
}

/** Markdown → 净化 HTML（GFM：表格/代码块/任务列表等） */
export function markdownToHtml(md, baseUrl = '') {
  const raw = marked.parse(String(md ?? ''), { gfm: true, breaks: false, async: false });
  return sanitizeCaptureHtml(raw, baseUrl);
}

/** 净化后是否还有可读内容（避免只剩空壳时静默写入空记录） */
export function hasVisibleContent(html) {
  const s = String(html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return s.length > 0 || /<(table|pre|code|hr)\b/i.test(html);
}
