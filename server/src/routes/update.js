import { Router } from 'express';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from '../config.js';

export const updateRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, '..');
const BRANCH = process.env.QUICKNOTE_BRANCH || 'main';
const SERVICE = process.env.QUICKNOTE_SERVICE || 'quicknote';

const stripVer = (v) => String(v ?? '').replace(/^[\^~=<> ]+/, '');

/** 读取根/服务端/前端 package.json，汇总“版本与运行信息”（供设置 → 关于展示） */
function collectVersions() {
  const read = (p) => {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      return null;
    }
  };
  const rootPkg = read(path.join(PROJECT_ROOT, 'package.json')) || {};
  const serverPkg = read(path.join(PROJECT_ROOT, 'server', 'package.json')) || {};
  const webPkg = read(path.join(PROJECT_ROOT, 'web', 'package.json')) || {};
  const dep = (p, name, isDev) =>
    stripVer((isDev ? p.devDependencies : p.dependencies)?.[name]);
  const platform =
    process.platform === 'darwin' ? 'macOS' : process.platform === 'linux' ? 'Linux' : process.platform;
  return {
    node: process.version || '',
    platform: `${platform} ${process.arch}`,
    engines: rootPkg.engines?.node || '',
    vue: dep(webPkg, 'vue'),
    vite: dep(webPkg, 'vite', true),
    tiptap: dep(webPkg, '@tiptap/vue-3'),
    vueuse: dep(webPkg, '@vueuse/core'),
    lucide: dep(webPkg, 'lucide-vue-next'),
    dompurify: dep(webPkg, 'dompurify'),
    lunar: dep(webPkg, 'lunar-javascript'),
    express: dep(serverPkg, 'express'),
    admzip: dep(serverPkg, 'adm-zip'),
    webdav: dep(serverPkg, 'webdav')
  };
}

function run(cmd, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: PROJECT_ROOT, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, out: String(stdout || '').trim(), err: String(stderr || '').trim() });
    });
  });
}

const git = (args, timeoutMs) => run('git', ['-C', PROJECT_ROOT, ...args], timeoutMs);

/** 最近一条提交摘要 */
async function headInfo(ref = 'HEAD') {
  const r = await git(['log', '-1', `--format=%h%x09%ci%x09%s`, ref]);
  if (!r.ok) return null;
  const [short, date, ...subj] = r.out.split('\t');
  return { short: short || '', date: date || '', subject: subj.join(' ') || '' };
}

/** 运行环境能力（只读检测，不执行任何更新动作） */
async function capability() {
  const [gitOk, br] = await Promise.all([
    git(['rev-parse', '--is-inside-work-tree']),
    git(['rev-parse', '--abbrev-ref', 'HEAD'])
  ]);
  const sysd = await run('systemctl', ['cat', SERVICE], 5000);
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  return {
    isGitRepo: gitOk.ok && gitOk.out === 'true',
    branch: br.ok ? br.out : '',
    systemdService: sysd.ok,
    runningAsRoot: !!isRoot,
    // 一键更新需：git 仓库 + systemd 服务 + root（本版本仅提供“检测”，说明性字段）
    canSelfUpdate: false
  };
}

/** 打包版本信息（About 用） */
updateRouter.get('/meta', async (_req, res) => {
  let version = '';
  let name = '';
  try {
    const pkg = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    version = pkg.version || '';
    name = pkg.name || '';
  } catch { /* ignore */ }
  const [info, cap] = await Promise.all([headInfo('HEAD'), capability()]);
  res.json({
    ok: true,
    app: name || 'quicknote',
    version,
    versions: collectVersions(),
    git: info,
    capability: cap
  });
});

/**
 * GET /api/update/status —— 本地版本与环境能力（不访问网络，用于“关于”初始展示）
 */
updateRouter.get('/status', async (_req, res) => {
  const [info, cap] = await Promise.all([headInfo('HEAD'), capability()]);
  res.json({ ok: true, local: info, capability: cap, branch: BRANCH, remote: null });
});

/**
 * POST /api/update/check —— 只读“检查更新”：
 * git fetch origin/<branch> 后比对本地与远端版本差异。不拉代码、不构建、不重启。
 */
updateRouter.post('/check', async (_req, res) => {
  const cap = await capability();
  if (!cap.isGitRepo) {
    return res.status(400).json({ ok: false, error: '当前目录不是 git 仓库，无法检查更新' });
  }
  const fetch = await git(['fetch', 'origin', BRANCH], 30000);
  if (!fetch.ok) {
    const msg = fetch.err || fetch.out || `git fetch 失败（退出码 ${fetch.code}）`;
    return res.status(502).json({ ok: false, error: msg });
  }
  const [local, remote, dirty, behindR, aheadR] = await Promise.all([
    git(['rev-parse', 'HEAD']),
    git(['rev-parse', `origin/${BRANCH}`]),
    git(['status', '--porcelain']),
    git(['rev-list', '--count', 'HEAD..origin/' + BRANCH]),
    git(['rev-list', '--count', 'origin/' + BRANCH + '..HEAD'])
  ]);
  const [localInfo, remoteInfo] = await Promise.all([headInfo('HEAD'), headInfo(`origin/${BRANCH}`)]);
  res.json({
    ok: true,
    local: localInfo,
    remote: remoteInfo,
    capability: cap,
    branch: BRANCH,
    dirty: dirty.ok && dirty.out.length > 0,
    behind: behindR.ok ? Number(behindR.out) : -1,
    ahead: aheadR.ok ? Number(aheadR.out) : -1,
    sameHead: !!local.ok && !!remote.ok && local.out === remote.out,
    fetchError: null
  });
});
