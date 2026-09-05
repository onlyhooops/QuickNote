import { mkdirSync, copyFileSync, existsSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { db } from '../db.js';
import {
  DB_FILE,
  IMAGES_DIR,
  BACKUP_DIR,
  loadConfig,
  saveConfig
} from '../config.js';
import { uploadBuffer } from './webdav.js';

const KEEP_LOCAL_SNAPSHOTS = 5;

/** WAL 模式下安全快照：checkpoint 后复制主库文件 */
export function snapshotDb(destFile) {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    /* 空库等场景忽略 */
  }
  copyFileSync(DB_FILE, destFile);
}

/** 打包快照（DB + 图片目录）为一个 zip 的 Buffer */
export function buildSnapshotZip(stamp) {
  const zip = new AdmZip();
  const dbTmp = path.join(BACKUP_DIR, `.snapshot-${stamp}.db`);
  try {
    snapshotDb(dbTmp);
    zip.addFile('data/quicknote.db', readFileSync(dbTmp));
    if (existsSync(IMAGES_DIR)) {
      for (const f of readdirSync(IMAGES_DIR)) {
        zip.addLocalFile(path.join(IMAGES_DIR, f), 'data/images');
      }
    }
    return zip.toBuffer();
  } finally {
    rmSync(dbTmp, { force: true });
  }
}

function stampNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 清理本地历史快照目录，仅保留最近 KEEP_LOCAL_SNAPSHOTS 个 */
function pruneLocalSnapshots() {
  if (!existsSync(BACKUP_DIR)) return;
  const dirs = readdirSync(BACKUP_DIR)
    .filter((n) => /^quicknote-\d{8}-\d{6}$/.test(n))
    .sort()
    .reverse();
  for (const name of dirs.slice(KEEP_LOCAL_SNAPSHOTS)) {
    rmSync(path.join(BACKUP_DIR, name), { recursive: true, force: true });
  }
}

/**
 * 执行一次备份：
 * 1) 本地保存快照目录（DB + 图片 zip）；
 * 2) 若配置了 WebDAV 且 enabled，把 zip 上传到远端；
 * 返回本次结果描述。
 */
export async function runBackup() {
  const cfg = loadConfig();
  const stamp = stampNow();
  const snapDir = path.join(BACKUP_DIR, `quicknote-${stamp}`);
  mkdirSync(snapDir, { recursive: true });

  const zipFile = `quicknote-${stamp}.zip`;
  const zipPath = path.join(snapDir, zipFile);
  const buffer = buildSnapshotZip(stamp);

  // 本地 zip 落盘
  writeFileSync(zipPath, buffer);

  const parts = [`本地快照：${zipFile}（${(buffer.length / 1024 / 1024).toFixed(2)} MB）`];
  let webdavInfo = null;

  if (cfg.webdav?.enabled && cfg.webdav?.url) {
    try {
      const remotePath = await uploadBuffer({
        url: cfg.webdav.url,
        username: cfg.webdav.username,
        password: cfg.webdav.password,
        remoteDir: cfg.webdav.remoteDir,
        filename: zipFile,
        buffer
      });
      webdavInfo = { ok: true, remotePath };
      parts.push(`WebDAV 上传成功：${remotePath}`);
    } catch (err) {
      webdavInfo = { ok: false, error: String(err?.message ?? err) };
      parts.push(`WebDAV 上传失败：${webdavInfo.error}`);
    }
  } else {
    parts.push('WebDAV 未启用，跳过云端上传');
  }

  saveConfig({
    autoBackup: {
      ...cfg.autoBackup,
      lastRunAt: new Date().toISOString()
    }
  });
  pruneLocalSnapshots();

  return { ok: webdavInfo ? webdavInfo.ok : true, at: new Date().toISOString(), message: parts.join('；'), webdav: webdavInfo };
}
