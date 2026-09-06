import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** server/ 目录根 */
export const ROOT = path.resolve(__dirname, '..');

/** 数据目录（DB / 图片 / 备份 / 配置），可用环境变量覆盖 */
export const DATA_DIR = process.env.QUICKNOTE_DATA || path.join(ROOT, 'data');
// 图片 / 附件 / 备份目录可各自独立配置（便于挂载大容量盘）
export const IMAGES_DIR = process.env.QUICKNOTE_IMAGES_DIR || path.join(DATA_DIR, 'images');
export const ATTACHMENTS_DIR = process.env.QUICKNOTE_ATTACHMENTS_DIR || path.join(DATA_DIR, 'attachments');
export const BACKUP_DIR = process.env.QUICKNOTE_BACKUP_DIR || path.join(DATA_DIR, 'backups');
export const DB_FILE = path.join(DATA_DIR, 'quicknote.db');
export const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

/** 仅本机监听 */
export const HOST = process.env.QUICKNOTE_HOST || '127.0.0.1';
export const PORT = Number(process.env.QUICKNOTE_PORT || 3987);

/** 前端构建产物目录（存在时由后端一并托管，单进程部署） */
export const WEB_DIST = path.resolve(ROOT, '..', 'web', 'dist');

export const DEFAULT_CONFIG = {
  webdav: {
    enabled: false,
    url: '',
    username: '',
    password: '',
    remoteDir: '/QuickNote'
  },
  autoBackup: {
    enabled: false,
    everyHours: 24,
    lastRunAt: null
  },
  ai: {
    enabled: false,
    apiKey: '',
    model: 'deepseek-chat', // deepseek-chat | deepseek-reasoner
    baseUrl: 'https://api.deepseek.com'
  }
};

export function ensureDirs() {
  for (const d of [DATA_DIR, IMAGES_DIR, ATTACHMENTS_DIR, BACKUP_DIR]) {
    mkdirSync(d, { recursive: true });
  }
}

/** 深合并：以 defaults 为底，用 saved（浅层对象，嵌套按 key 合并一层） */
function merge(defaults, saved) {
  const out = { ...defaults };
  for (const [k, v] of Object.entries(saved || {})) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      defaults[k] &&
      typeof defaults[k] === 'object'
    ) {
      out[k] = { ...defaults[k], ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function loadConfig() {
  ensureDirs();
  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return structuredClone(DEFAULT_CONFIG);
  }
  try {
    const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    return merge(DEFAULT_CONFIG, saved);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

/** 部分更新配置（嵌套对象按 key 合并一层）并落盘，返回合并后的完整配置 */
export function saveConfig(patch = {}) {
  const next = merge(loadConfig(), patch);
  ensureDirs();
  writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
  return next;
}
