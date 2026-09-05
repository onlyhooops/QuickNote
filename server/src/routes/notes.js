import { Router } from 'express';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  normalizeTags
} from '../db.js';

export const notesRouter = Router();

/** GET /api/notes?q=&tag=&sort=created|updated&order=desc&from=&to= */
notesRouter.get('/', (req, res) => {
  const { q, tag, sort, order, from, to } = req.query;
  const notes = listNotes({
    q: q ? String(q).slice(0, 200) : '',
    tag: tag ? String(tag) : '',
    sort: sort === 'updated' ? 'updated' : 'created',
    order: order === 'asc' ? 'asc' : 'desc',
    from: from ? String(from) : '',
    to: to ? String(to) : ''
  });
  res.json(notes);
});

notesRouter.get('/:id', (req, res) => {
  const note = getNote(Number(req.params.id));
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  res.json(note);
});

notesRouter.post('/', (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  const plain = typeof req.body?.plain === 'string' ? req.body.plain : '';
  const tags = normalizeTags(req.body?.tags);
  const note = createNote(content, plain, tags);
  res.status(201).json(note);
});

notesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: '非法 id' });
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  const plain = typeof req.body?.plain === 'string' ? req.body.plain : '';
  const note = updateNote(id, content, plain, normalizeTags(req.body?.tags));
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  res.json(note);
});

notesRouter.delete('/:id', (req, res) => {
  const ok = deleteNote(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: '笔记不存在' });
  res.status(204).end();
});
