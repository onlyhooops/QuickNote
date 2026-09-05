// 明暗主题管理：pref ∈ 'light' | 'dark' | 'auto'，持久化于 localStorage
const KEY = 'quicknote.theme';
const media = () =>
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemePref() {
  try {
    return localStorage.getItem(KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function effectiveTheme(pref = getThemePref()) {
  if (pref === 'auto') return media()?.matches ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref = getThemePref()) {
  const eff = effectiveTheme(pref);
  document.documentElement.dataset.theme = eff;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', eff === 'dark' ? '#101013' : '#faf9f7');
  return eff;
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { pref } }));
}

// 跟随系统时响应系统切换
export function watchSystemTheme() {
  const mq = media();
  if (!mq) return;
  const onChange = () => {
    if (getThemePref() === 'auto') applyTheme('auto');
  };
  mq.addEventListener('change', onChange);
}

// 全局响应式暗色状态（供第三方组件绑定 theme）
import { ref } from 'vue';
const darkState = ref(typeof document !== 'undefined' && effectiveTheme() === 'dark');
if (typeof window !== 'undefined') {
  const sync = () => (darkState.value = effectiveTheme() === 'dark');
  window.addEventListener('themechange', sync);
  window.addEventListener('DOMContentLoaded', sync);
}
export function useDark() {
  return darkState;
}
