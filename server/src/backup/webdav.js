import { createClient } from 'webdav';

/**
 * WebDAV 上传单个 Buffer 文件到远端目录（自动递归建目录）。
 * 返回远端完整路径。
 */
export async function uploadBuffer({ url, username, password, remoteDir, filename, buffer }) {
  if (!url) throw new Error('未配置 WebDAV 地址');
  const base = String(url).replace(/\/+$/, '');
  const dir = String(remoteDir || '/QuickNote').replace(/^\/+/, '').replace(/\/+$/, '');
  const remotePath = dir ? `/${dir}/${filename}` : `/${filename}`;

  const client = createClient(base, { username, password });
  const parent = remotePath.slice(0, remotePath.lastIndexOf('/')) || '/';
  try {
    await client.createDirectory(parent, { recursive: true });
  } catch (err) {
    // 目录已存在等错误不阻塞，交给上传兜底
    if (!/already exists/i.test(String(err?.message ?? err))) {
      throw err;
    }
  }
  await client.putFileContents(remotePath, buffer, { overwrite: true });
  return remotePath;
}
