/**
 * 字体来源与分包规格（scripts/gen-fonts.mjs 与 scripts/check-fonts.mjs 共用）
 *
 * 设计要点：
 * - 字体文件不通过 npm 依赖分发，而是由脚本从「官方渠道」下载 → cn-font-split 切片 → 入库 web/public/fonts。
 *   这样既保证分片完整（现成的第三方预切包实测会丢字），也保证来源可复现。
 * - 每个字体都钉死 sha256：换版本必须显式改这里，避免悄悄换字形。
 * - 只收录「许可明确允许再分发 + 允许子集化」的字体（见 docs/font-selfhost-research.md）：
 *   OFL 的霞鹜文楷可用；阿里妈妈刀隶体等「免费商用」字体明文禁止拆分/转换，故不收录。
 * - expect 记录「可接受的缺字数」基线：楷体要求对 GB2312 与《通用规范汉字表》都 0 缺字；
 *   将来若引入覆盖不全的字体，必须在此显式写下基线（缺字由字体栈回退，不会出现豆腐块）。
 */

import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
export const TOOLS_DIR = `${ROOT}/tools/fonts`;
export const CACHE_DIR = `${TOOLS_DIR}/cache`;
export const OUT_ROOT = `${ROOT}/web/public/fonts`;
export const CSS_OUT = `${ROOT}/web/src/fonts.generated.css`;
export const DATA_DIR = `${ROOT}/scripts/data`;

/** GitHub 直连不稳时的镜像前缀（可用环境变量 FONT_GH_MIRROR 覆盖） */
export const GH_MIRROR = process.env.FONT_GH_MIRROR ?? 'https://ghfast.top/';

export const FONTS = [
  {
    id: 'wenkai-regular',
    label: '霞鹜文楷 Regular',
    family: 'LXGW WenKai',
    cssWeight: '400',
    role: '楷体 · 正文',
    license: 'SIL Open Font License 1.1（OFL-1.1）',
    copyright:
      'Copyright 2021-2026 LXGW (https://github.com/lxgw/LxgwWenKai)，基于 Fontworks Klee One（The Klee Project Authors）',
    homepage: 'https://github.com/lxgw/LxgwWenKai',
    // 覆盖率要求（scripts/check-fonts.mjs 强校验）
    expect: { gb2312Missing: 0, tongyongMissing: 0 },
    // 随字体分发的许可原文（本地副本优先：离线且确定，URL 仅作兜底）
    licenseLocalFile: 'lxgw-wenkai-OFL.txt',
    licenseUrl: 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt',
    source: {
      kind: 'url',
      file: 'LXGWWenKai-Regular.ttf',
      url: 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf',
      sha256: '39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009'
    }
  },
  {
    id: 'wenkai-medium',
    label: '霞鹜文楷 Medium',
    family: 'LXGW WenKai',
    cssWeight: '700',
    role: '楷体 · 粗体/标题（真实 Medium 字重，非浏览器合成粗体）',
    license: 'SIL Open Font License 1.1（OFL-1.1）',
    copyright:
      'Copyright 2021-2026 LXGW (https://github.com/lxgw/LxgwWenKai)，基于 Fontworks Klee One（The Klee Project Authors）',
    homepage: 'https://github.com/lxgw/LxgwWenKai',
    expect: { gb2312Missing: 0, tongyongMissing: 0 },
    licenseLocalFile: 'lxgw-wenkai-OFL.txt',
    licenseUrl: 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt',
    source: {
      kind: 'url',
      file: 'LXGWWenKai-Medium.ttf',
      url: 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Medium.ttf',
      sha256: 'd4bdeb38a39151d74d084cba5090f8cb7d20bf83eedb78c35939ae70b9f4e3f6'
    }
  },
];
