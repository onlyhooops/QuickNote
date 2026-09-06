const BASE = '/api';

async function request(method, url, body, headers = {}) {
  const opts = { method, headers };
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
  ensureTag(name) {
    return request('POST', '/tags', { name });
  },
  removeOrphanTag(name) {
    return request('DELETE', '/tags/' + encodeURIComponent(name));
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
  // AI 助手
  getAiConfig() {
    return request('GET', '/ai/config');
  },
  saveAiConfig(patch) {
    return request('PUT', '/ai/config', patch);
  },
  getAiKey(headers = {}) {
    return request('GET', '/ai/key', undefined, headers);
  },
  testAi(body) {
    return request('POST', '/ai/test', body);
  },
  aiExplore(text) {
    return request('POST', '/ai/explore', { text });
  },
  // 快捷写入（PopClip）
  getQuickinConfig() {
    return request('GET', '/quickin/config');
  },
  saveQuickinConfig(patch) {
    return request('PUT', '/quickin/config', patch);
  },
  getQuickinToken(headers = {}) {
    return request('GET', '/quickin/token', undefined, headers);
  },
  rotateQuickinToken(headers = {}) {
    return request('POST', '/quickin/token', undefined, headers);
  },
  clearQuickinToken(headers = {}) {
    return request('DELETE', '/quickin/token', undefined, headers);
  },
  async downloadQuickinExtension(headers = {}) {
    const res = await fetch(BASE + '/quickin/extension', { headers });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new Error(d?.error || `下载失败（${res.status}）`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'QuickNote.popclipextz';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  // 版本 / 更新检查（只读）
  getMeta() {
    return request('GET', '/update/meta');
  },
  getUpdateStatus() {
    return request('GET', '/update/status');
  },
  checkUpdate() {
    return request('POST', '/update/check');
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
