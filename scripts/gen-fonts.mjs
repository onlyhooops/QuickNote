#!/usr/bin/env node
/**
 * 字体分包生成（开发期一次性运行，产物入库，部署时无需联网、无需本工具）
 *
 *  官方字体 → cn-font-split 切成按 unicode-range 的 woff2 分片 → web/public/fonts/<id>/
 *  并生成 web/src/fonts.generated.css（由 Vite 打进应用样式，分片走静态目录）
 *
 * 用法：npm run fonts:gen
 *   首次运行会自动：① 在 tools/fonts 安装工具依赖；② 下载 cn-font-split 原生库（Rust，~6MB）
 * 环境变量：FONT_GH_MIRROR 覆盖 GitHub 镜像前缀（默认 https://ghfast.top/，直连可用时设空串）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  ROOT,
  FONTS,
  OUT_ROOT,
  CSS_OUT,
  TOOLS_DIR,
  CACHE_DIR,
  DATA_DIR,
  GH_MIRROR
} from './lib/font-spec.mjs';
import {
  loadFontkit,
  gb2312Hanzi,
  tongyongLevels,
  unionCodepoints,
  analyzeCoverage,
  evaluate
} from './lib/font-coverage.mjs';

const CLI = path.join(TOOLS_DIR, 'node_modules', 'cn-font-split', 'dist', 'cli.js');
const CLI_DIST = path.dirname(CLI);
const rel = (p) => path.relative(ROOT, p) || '.';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
  if (r.error) throw new Error(`无法执行 ${cmd}：${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`${cmd} 异常退出（status=${r.status} signal=${r.signal ?? '-'}）`);
  }
}

// ---------- 1. 工具链自举 ----------
function ensureTooling() {
  try {
    createRequire(path.join(TOOLS_DIR, 'package.json')).resolve('cn-font-split');
    return;
  } catch {
    console.log('· 首次运行：在 tools/fonts 安装字体工具依赖…');
    run('npm', ['install', '--no-audit', '--no-fund', '--prefix', TOOLS_DIR]);
  }
}

function nativeLibFile() {
  if (!fs.existsSync(CLI_DIST)) return null;
  return fs.readdirSync(CLI_DIST).find((f) => /^libffi-/.test(f)) ?? null;
}

function ensureNativeLib() {
  if (nativeLibFile()) return;
  console.log('· 首次运行：下载 cn-font-split 原生库（经镜像，约 6MB）…');
  run(process.execPath, [CLI, 'i', 'default'], {
    env: { ...process.env, CN_FONT_SPLIT_GH_HOST: `${GH_MIRROR}https://github.com` }
  });
  if (!nativeLibFile()) {
    throw new Error(
      `原生库安装失败。可手动执行：\n  CN_FONT_SPLIT_GH_HOST=${GH_MIRROR}https://github.com ${process.execPath} ${CLI} i default`
    );
  }
}

// ---------- 2. 取字体（官方渠道 + sha256 校验） ----------
const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function fetchSource(font) {
  const src = font.source;
  const dest = path.join(CACHE_DIR, src.file);
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  if (fs.existsSync(dest) && sha256File(dest) === src.sha256) {
    console.log(`  · 命中本地缓存 ${src.file}`);
    return dest;
  }

  if (src.kind === 'url') {
    const urls = [src.url, GH_MIRROR ? `${GH_MIRROR}${src.url}` : null].filter(Boolean);
    let lastErr = null;
    for (const u of urls) {
      try {
        console.log(`  · 下载 ${u}`);
        await download(u, dest);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.log(`    ✗ ${err.message}`);
      }
    }
    if (lastErr) throw new Error(`下载失败：${lastErr.message}`);
  } else if (src.kind === 'npm') {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qn-font-'));
    console.log(`  · 从 npm 取 ${src.pkg}`);
    run('npm', ['pack', src.pkg, '--pack-destination', tmp]);
    const tgz = fs.readdirSync(tmp).find((f) => f.endsWith('.tgz'));
    if (!tgz) throw new Error(`npm pack 未产出 tgz：${src.pkg}`);
    run('tar', ['-xzf', path.join(tmp, tgz), '-C', tmp]);
    fs.copyFileSync(path.join(tmp, src.innerPath), dest);
    fs.rmSync(tmp, { recursive: true, force: true });
  } else {
    throw new Error(`未知来源类型：${src.kind}`);
  }

  const got = sha256File(dest);
  if (got !== src.sha256) {
    fs.rmSync(dest, { force: true });
    throw new Error(`sha256 校验失败（期望 ${src.sha256}，实际 ${got}）——已删除，请核查来源`);
  }
  console.log('    ✓ sha256 校验通过');
  return dest;
}

// ---------- 3. 切片 + 生成 CSS ----------
function splitFont(font, ttf) {
  const outDir = path.join(OUT_ROOT, font.id);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [
      CLI,
      'run',
      '-i', ttf,
      '-o', outDir,
      '--css.fontFamily', font.family,
      '--css.fontWeight', font.cssWeight,
      '--css.fontDisplay', 'swap',
      '-f', 'true'
    ],
    { stdio: 'inherit', cwd: ROOT }
  );

  // 注意：cn-font-split 7.x 在部分平台（实测 Intel macOS）退出阶段会 SIGABRT，
  // 但分片与 result.css 已经完整写出 —— 因此按「产物是否完整」判定成败，而不是退出码。
  const cssPath = path.join(outDir, 'result.css');
  const chunkCount = fs.existsSync(outDir)
    ? fs.readdirSync(outDir).filter((f) => f.endsWith('.woff2')).length
    : 0;
  if (!fs.existsSync(cssPath) || chunkCount === 0) {
    throw new Error(
      `切片失败（status=${result.status} signal=${result.signal ?? '-'}，分片数=${chunkCount}）`
    );
  }
  if (result.status !== 0) {
    console.log(
      `  · 提示：工具进程退出异常（signal=${result.signal ?? result.status}），但产物完整（${chunkCount} 分片），继续。`
    );
  }

  const raw = fs.readFileSync(cssPath, 'utf8');
  // 只保留 woff2 产物（丢弃 result.css / index.html / index.proto / reporter.bin）
  for (const f of fs.readdirSync(outDir)) {
    if (!f.endsWith('.woff2')) fs.rmSync(path.join(outDir, f), { force: true });
  }

  const body = raw
    .replace(/^\/\*[\s\S]*?\*\/\s*/, '') // 去掉工具自带的元信息注释
    .replace(/url\("\.\/([^"]+\.woff2)"\)/g, `url("/fonts/${font.id}/$1")`) // 指向静态路径
    .replace(/font-weight:\s*[\d.]+/g, `font-weight:${font.cssWeight}`) // 统一字重
    // 去掉 src 里的 local("…")：避免装了同名字体的机器走本地版本，保证各端渲染一致
    .replace(/local\("[^"]*"\),?/g, '');
  return { outDir, css: trimForeignFaces(body).trim(), chunkCount };
}

// 中文相关的码位区间：只有与这些区间相交的 @font-face 才保留。
// 依据需求「英文/数字/半角符号使用默认字体」——字体栈里默认字体在前，西文永远不会命中中文字体，
// 因此纯西文/希腊文/西里尔文的分片规则属于死代码，删掉可显著减小 CSS 体积。
// 注意：中文全角标点（U+3000–303F、U+FF00–FFEF）、引号破折号省略号等仍保留。
const KEEP_RANGES = [
  [0x2e80, 0x9fff], // CJK 部首扩展 → 基本区（含中文标点 U+3000–303F）
  [0xf900, 0xfaff], // 兼容汉字
  [0xfe10, 0xfe4f], // 竖排标点、兼容形式
  [0xff00, 0xffef], // 全角字符
  [0x20000, 0x3ffff], // 扩展 B–F
  [0x2013, 0x2014], // – —
  [0x2018, 0x201d], // ‘ ’ “ ”
  [0x2022, 0x2022], // •
  [0x2026, 0x2027], // … ‧
  [0x00b7, 0x00b7] // ·
];
const isCjkRelated = (cp) => KEEP_RANGES.some(([a, b]) => cp >= a && cp <= b);

function trimForeignFaces(css) {
  let dropped = 0;
  const out = css.replace(/@font-face\{[^}]*\}/g, (rule) => {
    const m = rule.match(/unicode-range:([^;}]+)/);
    if (!m) return rule;
    const starts = m[1]
      .split(',')
      .map((s) => parseInt(s.trim().replace(/^U\+/i, '').split('-')[0], 16))
      .filter((n) => !Number.isNaN(n));
    if (starts.some(isCjkRelated)) return rule;
    dropped++;
    return '';
  });
  if (dropped) console.log(`  · 裁剪纯西文分片规则 ${dropped} 条（西文走默认字体，中文字体栈不命中）`);
  return out.replace(/\}\s*\n\s*\n/g, '}\n');
}

function dirStats(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.woff2'));
  const bytes = files.reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
  return { count: files.length, bytes };
}

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
const mb = (n) => `${(n / 1048576).toFixed(1)}MB`;

async function writeNotices(generated) {
  for (const font of generated) {
    const lines = [
      `字体：${font.label}`,
      `字体家族：${font.family}`,
      `用途：${font.role}`,
      `来源：${font.homepage}`,
      `版权：${font.copyright}`,
      `许可：${font.license}`,
      '',
      '本目录下的 *.woff2 是上述字体的分片子集（由 cn-font-split 按 unicode-range 切分），',
      '仅用于「快记 QuickNote」自托管渲染；字体本身的版权与许可归原作者所有，未做任何字形修改。'
    ];
    fs.writeFileSync(path.join(OUT_ROOT, font.id, 'NOTICE.txt'), lines.join('\n') + '\n');

    // 许可原文：优先用随仓库入库的本地副本（离线、确定性），缺失时才回落到官方 URL
    const local = font.licenseLocalFile ? path.join(DATA_DIR, font.licenseLocalFile) : '';
    const target = path.join(OUT_ROOT, font.id, 'LICENSE.txt');
    if (local && fs.existsSync(local)) {
      fs.copyFileSync(local, target);
    } else if (font.licenseUrl) {
      try {
        const res = await fetch(font.licenseUrl, { redirect: 'follow' });
        if (res.ok) fs.writeFileSync(target, await res.text());
        else console.log(`  ! 许可原文获取失败（${font.id}），请在发布前补齐 LICENSE.txt`);
      } catch {
        console.log(`  ! 许可原文获取失败（${font.id}），请在发布前补齐 LICENSE.txt`);
      }
    }
  }

  const readme = [
    '# 自托管字体分片（自动生成，请勿手改）',
    '',
    '这些目录由 `npm run fonts:gen`（见 `scripts/gen-fonts.mjs`）生成，随仓库入库，',
    '部署时由 Node 静态托管（`/fonts/*`，带长期缓存），**不依赖用户系统字体、不依赖网络**。',
    '',
    '| 目录 | 字体 | 字重 | 分片 | 体积 | 用途 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...generated.map(
      (f) => `| \`${f.id}/\` | ${f.label} | ${f.cssWeight} | ${f.count} | ${mb(f.bytes)} | ${f.role} |`
    ),
    '',
    '## 为什么要整字体自己切，而不是用现成的预切包',
    '',
    '第三方预切字体包（如 `lxgw-wenkai-webfont`、`@hanzi.pro/webfonts-lxgw-wenkai`）实测会丢字：',
    '对 GB2312 缺 33 字（劐、阢、坶、塥…）。本项目直接从官方字体切片并用 `npm run fonts:check`',
    '做覆盖率硬校验，保证不出现缺字导致的显示异常。',
    '',
    '## 许可',
    '',
    '只收录「许可明确允许再分发 **且** 允许子集化/转格式」的字体，逐条核实记录见',
    '[`docs/font-selfhost-research.md`](../../../docs/font-selfhost-research.md)。',
    '',
    ...generated.map((f) => `- ${f.label}：${f.license}；各目录附 \`LICENSE.txt\` 许可原文。`),
    '',
    '⚠️ 反例（**不要**再加入）：阿里妈妈刀隶体、三极隶书、临海隶书等「免费商用」字体，',
    '其法律声明明文禁止「拆分、转换、修改或二次创作」，也未授予再分发权；',
    '微软/中易 SimKai、SimLi 与华文 STKaiti、STLiti 等专有字体同样禁止自托管。',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(OUT_ROOT, 'README.md'), readme);
}

// ---------- 主流程 ----------
ensureTooling();
ensureNativeLib();

const generated = [];
for (const font of FONTS) {
  console.log(`\n▶ ${font.label}（${font.family}）`);
  const ttf = await fetchSource(font);
  const { outDir, css } = splitFont(font, ttf);
  const stats = dirStats(outDir);
  console.log(`  ✓ 切出 ${stats.count} 个分片，合计 ${mb(stats.bytes)}`);
  generated.push({ ...font, css, ...stats, outDir });
}

await writeNotices(generated);

const header = [
  '/* ==========================================================================',
  '   自动生成，请勿手改 —— 由 scripts/gen-fonts.mjs 生成（重新生成：npm run fonts:gen）',
  '   自托管中文字体分片：@font-face 全部带 unicode-range，浏览器按需下载；',
  '   中文字符命中下列字体，英文/数字/半角符号因字体栈顺序（--font-en 在前）走默认字体。',
  '   ========================================================================== */',
  ''
].join('\n');

const blocks = generated.map(
  (f) =>
    `/* ---- ${f.label} · font-family:"${f.family}" · weight ${f.cssWeight} · ${f.count} 片 / ${mb(f.bytes)} ---- */\n${f.css}`
);

fs.writeFileSync(CSS_OUT, `${header}\n${blocks.join('\n\n')}\n`);
console.log(`\n✓ 已写出 ${rel(CSS_OUT)}（${kb(fs.statSync(CSS_OUT).size)}）`);

// ---------- 覆盖率自检 ----------
console.log('\n▶ 覆盖率自检');
const fontkit = await loadFontkit(TOOLS_DIR);
const gb2312 = gb2312Hanzi();
const levels = tongyongLevels(DATA_DIR);
let failed = 0;
for (const font of FONTS) {
  const { set, fileCount, unreadable } = unionCodepoints(fontkit, path.join(OUT_ROOT, font.id));
  const report = { ...analyzeCoverage(set, gb2312, levels), unreadable, fileCount };
  const problems = evaluate(font, report);
  console.log(
    `  ${problems.length ? '✗' : '✓'} ${font.label}：GB2312 缺 ${report.gb2312.missedCount}，` +
      `通用规范汉字表 缺 ${report.tongyong.missedCount}` +
      `（一级 ${report.tongyong.levels[0].missedCount}／二级 ${report.tongyong.levels[1].missedCount}／三级 ${report.tongyong.levels[2].missedCount}）`
  );
  for (const p of problems) {
    failed++;
    console.log(`      ✗ ${p}`);
  }
}

if (failed) {
  console.error('\n✗ 覆盖率自检未通过，请检查字体版本或 scripts/lib/font-spec.mjs 中的基线。');
  process.exit(1);
}
console.log('\n✓ 字体分片生成完成，覆盖率自检通过。');
