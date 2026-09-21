// 主题管理：pref ∈ 'auto' | 'light' | 'dark' | 'xuan' | 'sangpi'，持久化于 localStorage
//
// 一条轴：明暗与纸感主题互斥，共 5 项。
// 纸感主题（宣纸 / 桑皮纸）各自带「浅色版 + 夜色版」两套变量，夜色版跟随系统深色偏好自动启用，
// 因此 data-theme 的可能取值是：light | dark | xuan | xuan-dark | sangpi | sangpi-dark。
const KEY = 'quicknote.theme';
const PAPER = ['xuan', 'sangpi'];
const media = () =>
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/** 设置页与顶栏共用的主题清单 */
export const THEME_OPTIONS = [
  { id: 'auto', label: '跟随系统' },
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
  { id: 'xuan', label: '宣纸', desc: '暖白象牙 · 细帘纹 · 云絮纤维' },
  { id: 'sangpi', label: '桑皮纸', desc: '土黄米褐 · 粗帘纹 · 纤维束结节' }
];

/** 顶栏图标循环顺序 */
export const THEME_CYCLE = ['auto', 'light', 'dark', 'xuan', 'sangpi'];

/** 各 data-theme 取值对应的 moz/浏览器地址栏底色 */
const META_COLOR = {
  light: '#faf9f7',
  dark: '#101013',
  xuan: '#f3eee0',
  'xuan-dark': '#1a1811',
  sangpi: '#e0cba2',
  'sangpi-dark': '#1b1710'
};

export function isPaperPref(pref) {
  return PAPER.includes(pref);
}

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY) || 'auto';
    return THEME_OPTIONS.some((t) => t.id === v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** pref → 实际生效的 data-theme 取值（纸主题会按系统偏好切夜色版） */
export function effectiveTheme(pref = getThemePref()) {
  const dark = !!media()?.matches;
  if (pref === 'auto') return dark ? 'dark' : 'light';
  if (isPaperPref(pref)) return dark ? `${pref}-dark` : pref;
  return pref;
}

/** 是否处于深色语义（含夜色版纸主题），供第三方组件与图标使用 */
export function isDarkTheme(eff = effectiveTheme()) {
  return eff === 'dark' || eff.endsWith('-dark');
}

export function applyTheme(pref = getThemePref()) {
  const eff = effectiveTheme(pref);
  document.documentElement.dataset.theme = eff;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_COLOR[eff] ?? '#faf9f7');
  return eff;
}

export function setThemePref(pref) {
  if (!THEME_OPTIONS.some((t) => t.id === pref)) pref = 'auto';
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { pref } }));
}

// 跟随系统：auto 与纸主题的夜色版都依赖系统偏好，因此任何 pref 都要重算
export function watchSystemTheme() {
  const mq = media();
  if (!mq) return;
  mq.addEventListener('change', () => applyTheme(getThemePref()));
}

// 全局响应式暗色状态（供第三方组件绑定 theme）
import { ref } from 'vue';
const darkState = ref(typeof document !== 'undefined' && isDarkTheme());
if (typeof window !== 'undefined') {
  const sync = () => (darkState.value = isDarkTheme());
  window.addEventListener('themechange', sync);
  window.addEventListener('DOMContentLoaded', sync);
}
export function useDark() {
  return darkState;
}
