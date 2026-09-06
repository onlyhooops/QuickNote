// 富文本（contenteditable）工具：净化 / 统计 / 转纯文本
import DOMPurify from 'dompurify';

const SCHEMA = {
  ALLOWED_TAGS: [
    'p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del',
    'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img',
    'span', 'a', 'iframe'
  ],
  ALLOWED_ATTR: [
    'src', 'alt', 'href', 'title', 'target', 'rel', 'class',
    'style', 'loading', 'allow', 'allowfullscreen', 'scrolling', 'frameborder', 'referrerpolicy',
    // 嵌入组件用的 data-* 属性
    'data-embed', 'data-href', 'data-provider', 'data-iframe', 'data-title', 'data-desc', 'data-thumb', 'data-h'
  ],
  ALLOW_URI_SAFE_ATTR: ['src', 'href'],
  // 只允许同源图片路径与安全的 http(s)
  ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/(?:png|jpe?g|webp|gif);|\/)/i
};

export function sanitizeHtml(html) {
  const out = DOMPurify.sanitize(String(html ?? ''), SCHEMA);
  return out;
}

export function emptyDocHtml() {
  return '<p><br></p>';
}

function domOf(html) {
  const div = document.createElement('div');
  div.innerHTML = sanitizeHtml(html);
  return div;
}

/** 统计：纯文本、是否有字、图片数、嵌入数、是否空 */
export function contentStats(html) {
  const div = domOf(html);
  const text = (div.textContent || '').replace(/\u00a0/g, ' ').trim();
  const imgs = div.querySelectorAll('img').length;
  const embeds = div.querySelectorAll('div[data-embed]').length;
  const plain = (div.innerText || div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  return {
    text,
    plain,
    hasText: text.length > 0,
    imgs,
    embeds,
    isEmpty: text.length === 0 && imgs === 0 && embeds === 0
  };
}

export function htmlToPlain(html) {
  return contentStats(html).plain;
}

/** 提取"纯文字"用于 AI：剔除图片/嵌入卡/iframe 等非文本，仅留正文文字 */
export function mediaFreePlain(html, limit = 8000) {
  const div = document.createElement('div');
  div.innerHTML = sanitizeHtml(html || '');
  div.querySelectorAll('img, iframe, audio, video, div[data-embed]').forEach((n) => n.remove());
  const t = (div.innerText || div.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t.slice(0, limit);
}
