const BASE = '/api';

async function request(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `请求失败（${res.status}）`);
  return data;
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? '?' + s : '';
}

export const api = {
  // 笔记
  listNotes(params) {
    return request('GET', '/notes' + qs(params));
  },
  getNote(id) {
    return request('GET', `/notes/${id}`);
  },
  createNote(content, plain, tags) {
    return request('POST', '/notes', { content, plain, tags });
  },
  updateNote(id, content, plain, tags) {
    return request('PUT', `/notes/${id}`, { content, plain, tags });
  },
  deleteNote(id) {
    return request('DELETE', `/notes/${id}`);
  },
  // 标签
  listTags() {
    return request('GET', '/tags');
  },
  // 图片
  async uploadImage(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(BASE + '/images', { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || '图片上传失败');
    return data.url;
  },
  // 附件（任意类型、不限大小）
  async uploadAttachment(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(BASE + '/attachments', { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || '附件上传失败');
    return data;
  },
  // 网页解析（Open Graph 元信息）
  async unfurl(url) {
    const res = await fetch(BASE + '/unfurl?url=' + encodeURIComponent(url));
    const d = await res.json().catch(() => null);
    return (d && d.ok) ? d : { title: '', desc: '', thumb: '' };
  },
  // 备份
  getBackupConfig() {
    return request('GET', '/backup/config');
  },
  saveBackupConfig(patch) {
    return request('PUT', '/backup/config', patch);
  },
  runBackup() {
    return request('POST', '/backup/run');
  }
};
