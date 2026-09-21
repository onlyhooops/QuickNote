// 字体方案：3 套主流预设（中文 / 英文成对），经 CSS 变量全局应用
const KEY = 'quicknote.font.scheme';

export const SCHEMES = [
  {
    id: 'sans',
    label: '现代无衬线',
    desc: '系统默认 · 清晰通用',
    en: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    cn: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif"
  },
  {
    id: 'serif',
    label: '人文衬线',
    desc: '博客 / 阅读 · 温润',
    en: "Georgia,'Times New Roman',serif",
    cn: "'Songti SC','Noto Serif CJK SC','SimSun',serif"
  },
  {
    id: 'mono',
    label: '极客等宽',
    desc: '数字 / 代码感',
    en: "ui-monospace,'SF Mono',Menlo,Consolas,monospace",
    cn: "'PingFang SC','Microsoft YaHei',sans-serif"
  }
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
}
