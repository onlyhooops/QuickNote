import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { ATTACHMENTS_DIR, ensureDirs } from '../config.js';

ensureDirs();

// multer/busboy 默认按 latin1 解码 multipart filename，中文会被误读成乱码。
// 将 latin1 字节串还原为 UTF-8：仅当还原结果不含替换符时采纳（避免误伤本无乱码的名字）。
function fixName(n) {
  if (!n) return n;
  try {
    const decoded = Buffer.from(n, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD')) return n; // 非 UTF-8 误读，保持原样
    return decoded !== n ? decoded : n;
  } catch {
    return n;
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ATTACHMENTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
      .slice(0, 40);
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${ext}`;
    cb(null, name);
  }
});

// 附件：任意格式、不限大小（单机本地）
const upload = multer({ storage });

export const attachmentsRouter = Router();

/** POST /api/attachments —— 上传附件（multipart/form-data，字段名 file），返回 { url, name } */
attachmentsRouter.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到附件文件' });
  res.status(201).json({
    url: `/attachments/${req.file.filename}`,
    name: fixName(req.file.originalname),
    size: req.file.size
  });
});
