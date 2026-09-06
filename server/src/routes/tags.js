import { Router } from 'express';
import { listTags, ensureTag, deleteOrphanTag } from '../db.js';

export const tagsRouter = Router();

/** GET /api/tags —— 全部标签及使用次数 */
tagsRouter.get('/', (_req, res) => {
  res.json(listTags());
});

/** POST /api/tags —— 新增标签即默认保存（录入页“＋标签”输入时调用） */
tagsRouter.post('/', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const { name: clean, created } = ensureTag(name);
  if (!clean) return res.status(400).json({ error: '标签名不能为空且不超过 30 字' });
  res.status(created ? 201 : 200).json({ name: clean, created });
});

/** DELETE /api/tags/:name —— 仅删除未被任何笔记引用的孤儿标签 */
tagsRouter.delete('/:name', (req, res) => {
  const removed = deleteOrphanTag(req.params.name);
  res.json({ ok: true, removed });
});
