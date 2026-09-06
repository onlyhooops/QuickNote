// AI 补全区块的 HTML 构造（原文 vs AI 部分用排版区分）

const escHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 把 AI 返回的纯文本包成"AI 补全"区块（独立引用样式 + 标签），与原文档区分 */
export function buildAiBlockHtml(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => escHtml(l).trimEnd())
    .filter((l, i, arr) => !(l === '' && (i === arr.length - 1 || arr[i + 1] === '')));
  const paras = lines.length
    ? lines
        .map((l) => (l ? `<p>${l}</p>` : '<p><br></p>'))
        .join('')
    : '';
  return (
    `<hr>` +
    `<blockquote class="ai-added">` +
    `<p class="ai-badge">✨ AI 补全 · 由 DeepSeek 生成，可能存在错误，请核验</p>` +
    paras +
    `</blockquote>`
  );
}
