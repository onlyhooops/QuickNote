// 字体方案：4 套预设（中文 / 英文成对），经 CSS 变量全局应用
//
// 楷体为自托管字体（分片在 web/public/fonts，由 scripts/gen-fonts.mjs 生成）：
// · @font-face 全部带 unicode-range，浏览器只下载用到的分片
// · 字体栈是「西文栈 → 中文栈 → 通用关键字」三段式（见 style.css 的 --sans），
//   因此英文 / 数字 / 半角符号命中默认字体，中文才落到书法字体；
//   通用关键字必须放最后，否则 Chrome 会用系统 CJK 回退直接吃掉中文，后面的中文栈永远不生效
// · 字体未覆盖的生僻字按栈继续回退（系统楷体 → 通用回退），不会出现豆腐块
const KEY = 'quicknote.font.scheme';

const DEFAULT_EN =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial";

export const SCHEMES = [
  {
    id: 'sans',
    label: '现代无衬线',
    desc: '系统默认 · 清晰通用',
    en: DEFAULT_EN,
    generic: 'sans-serif',
    cn: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC'"
  },
  {
    id: 'serif',
    label: '人文衬线',
    desc: '博客 / 阅读 · 温润',
    en: "Georgia,'Times New Roman'",
    generic: 'serif',
    cn: "'Songti SC','Noto Serif CJK SC','SimSun'"
  },
  {
    id: 'mono',
    label: '极客等宽',
    desc: '数字 / 代码感',
    en: "ui-monospace,'SF Mono',Menlo,Consolas",
    generic: 'monospace',
    cn: "'PingFang SC','Microsoft YaHei'"
  },
  {
    id: 'kai',
    label: '楷体 · 霞鹜文楷',
    desc: '自托管 · 覆盖 GB2312 与通用规范汉字表',
    en: DEFAULT_EN,
    generic: 'serif',
    cn: "'LXGW WenKai','Kaiti SC','STKaiti','KaiTi','楷体','PingFang SC','Microsoft YaHei'"
  },
];

export function getScheme() {
  try {
    const id = localStorage.getItem(KEY) || 'sans';
    return SCHEMES.some((s) => s.id === id) ? id : 'sans';
  } catch {
    return 'sans';
  }
}

export function setScheme(id) {
  if (!SCHEMES.some((s) => s.id === id)) id = 'sans';
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  applyFonts();
  try {
    window.dispatchEvent(new Event('fontchange'));
  } catch {
    /* ignore */
  }
}

export function applyFonts() {
  const s = SCHEMES.find((x) => x.id === getScheme()) || SCHEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--font-en', s.en);
  r.setProperty('--font-cn', s.cn);
  r.setProperty('--font-generic', s.generic || 'sans-serif');
}
