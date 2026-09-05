import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { IMAGES_DIR, ensureDirs } from '../config.js';

const MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/bmp': '.bmp'
};

ensureDirs();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
  filename: (_req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('仅支持图片文件'));
  }
});

export const imagesRouter = Router();

/** POST /api/images —— 上传图片（multipart/form-data，字段名 file）
 *  默认返回 { url }；加 ?fmt=vditor 返回 Vditor 上传接口期望的 succMap 格式 */
imagesRouter.post('/', upload.array('file'), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: '未收到图片文件' });
  const toUrl = (f) => `/images/${f.filename}`;

  if (req.query.fmt === 'vditor') {
    const succMap = {};
    for (const f of files) succMap[f.originalname] = toUrl(f);
    return res.json({ code: 0, msg: '', data: { errFiles: [], succMap } });
  }

  res.status(201).json({ url: toUrl(files[0]) });
});

// multer 错误统一转为 JSON
export function imagesErrorHandler(err, _req, res, next) {
  if (err instanceof multer.MulterError || err?.message?.includes('仅支持')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}
