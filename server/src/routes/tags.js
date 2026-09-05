import { Router } from 'express';
import { listTags } from '../db.js';

export const tagsRouter = Router();

/** GET /api/tags —— 全部标签及使用次数 */
tagsRouter.get('/', (_req, res) => {
  res.json(listTags());
});
