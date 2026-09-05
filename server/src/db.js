import { DatabaseSync } from 'node:sqlite';
import { DB_FILE, ensureDirs } from './config.js';

ensureDirs();

export const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT NOT NULL DEFAULT '',  -- 净化后的富文本 HTML
    plain      TEXT NOT NULL DEFAULT '',  -- 纯文本（检索/标题用）
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS note_tags (
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
  );
`);

const nowIso = () => new Date().toISOString();

/** 清理并规范化标签数组（去空白、去重、去空串，长度上限） */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of tags) {
    const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 30 || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/** 从富文本 HTML 提取纯文本（服务端兜底；正常由前端传入 plain） */
export function stripHtml(html) {
  const s = String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return s;
}

function escapeLike(s) {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
}

/** 取一条 note 的标签集合 */
function tagsOfNote(noteId) {
  return db
    .prepare(
      `SELECT t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
       WHERE nt.note_id = ? ORDER BY t.name COLLATE NOCASE`
    )
    .all(noteId)
    .map((r) => r.name);
}

/** 绑定某笔记的标签集合（先清后建） */
export function setTagsOfNote(noteId, names) {
  db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
  const insert = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const link = db.prepare(
    'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, (SELECT id FROM tags WHERE name = ?))'
  );
  for (const name of names) {
    insert.run(name);
    link.run(noteId, name);
  }
}

/**
 * 列表查询。
 * q      —— 关键字（在 plain 纯文本上做子串匹配，中文可用）
 * tag    —— 精确标签名过滤
 * sort   —— 'created' | 'updated'
 * order  —— 'asc' | 'desc'
 * from/to —— 日期范围（按创建日期）
 */
export function listNotes({ q, tag, sort = 'created', order = 'desc', from, to } = {}) {
  const where = [];
  const params = [];
  if (q) {
    where.push(`plain LIKE ? ESCAPE '\\'`);
    params.push(`%${escapeLike(q)}%`);
  }
  if (tag) {
    where.push(`EXISTS (SELECT 1 FROM note_tags nt2 JOIN tags t2 ON t2.id = nt2.tag_id
                       WHERE nt2.note_id = notes.id AND t2.name = ?)`);
    params.push(tag);
  }
  if (from) {
    where.push(`date(created_at) >= date(?)`);
    params.push(from);
  }
  if (to) {
    where.push(`date(created_at) <= date(?)`);
    params.push(to);
  }
  const col = sort === 'updated' ? 'updated_at' : 'created_at';
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const sql = `SELECT id, content, plain, created_at, updated_at FROM notes
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY ${col} ${dir}, id ${dir}`;

  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => {
    const title = deriveTitle(r.plain);
    return { id: r.id, content: r.content, plain: r.plain, title, created_at: r.created_at, updated_at: r.updated_at, tags: tagsOfNote(r.id) };
  });
}

export function getNote(id) {
  const r = db.prepare('SELECT id, content, plain, created_at, updated_at FROM notes WHERE id = ?').get(id);
  if (!r) return null;
  return { id: r.id, content: r.content, plain: r.plain, title: deriveTitle(r.plain), created_at: r.created_at, updated_at: r.updated_at, tags: tagsOfNote(r.id) };
}

export function createNote(content, plain, tags) {
  const ts = nowIso();
  const clean = stripHtml(content || '');
  const info = db
    .prepare('INSERT INTO notes (content, plain, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(content ?? '', plain != null ? plain : clean, ts, ts);
  const id = Number(info.lastInsertRowid);
  setTagsOfNote(id, normalizeTags(tags));
  return getNote(id);
}

export function updateNote(id, content, plain, tags) {
  const existing = getNote(id);
  if (!existing) return null;
  const clean = stripHtml(content || '');
  db.prepare('UPDATE notes SET content = ?, plain = ?, updated_at = ? WHERE id = ?')
    .run(content ?? '', plain != null ? plain : clean, nowIso(), id);
  if (Array.isArray(tags)) setTagsOfNote(id, normalizeTags(tags));
  return getNote(id);
}

export function deleteNote(id) {
  const info = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return info.changes > 0;
}

export function listTags() {
  return db
    .prepare(
      `SELECT t.name, COUNT(nt.note_id) AS count
       FROM tags t LEFT JOIN note_tags nt ON nt.tag_id = t.id
       GROUP BY t.id ORDER BY count DESC, t.name COLLATE NOCASE`
    )
    .all()
    .map((r) => ({ name: r.name, count: Number(r.count) }));
}

/** 由纯文本推导标题：取首个非空行，超长截断 */
export function deriveTitle(plain) {
  const text = String(plain ?? '').trim();
  if (!text) return '';
  const line = text.split(/\n/)[0].trim();
  return line.length > 48 ? line.slice(0, 48) + '…' : line;
}

export function countNotes() {
  const r = db.prepare('SELECT COUNT(*) AS n FROM notes').get();
  return Number(r.n);
}
