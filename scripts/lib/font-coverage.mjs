/**
 * 字体覆盖率自检（scripts/check-fonts.mjs / scripts/gen-fonts.mjs 共用）
 *
 * 目的：回答「后台封装的字体包是否真的完整、会不会出现字符显示错误」。
 * 做法：把分片 woff2 的全部码位求并集，与两个权威字表逐一比对：
 *   - GB2312 汉字表（6763 字，按字节区间程序化生成，不依赖外部文件）
 *   - 《通用规范汉字表》8105 字（一级 3500 / 二级 3000 / 三级 1605，见 scripts/data/）
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/** 从 tools/fonts 的依赖里加载 fontkit（保持应用本身零依赖增长） */
export async function loadFontkit(toolsDir) {
  const req = createRequire(path.join(toolsDir, 'package.json'));
  const entry = req.resolve('fontkit');
  const mod = await import(pathToFileURL(entry).href);
  return mod.default ?? mod;
}

/** GB2312 汉字集合（6763 字）：字节区 0xB0-0xF7 × 0xA1-0xFE，用 Node 内置 ICU 解码 */
export function gb2312Hanzi() {
  const dec = new TextDecoder('gbk');
  const set = new Set();
  for (let b1 = 0xb0; b1 <= 0xf7; b1++) {
    for (let b2 = 0xa1; b2 <= 0xfe; b2++) {
      const s = dec.decode(new Uint8Array([b1, b2]));
      if (/^[\u4e00-\u9fff]$/.test(s)) set.add(s);
    }
  }
  return set;
}

/** 《通用规范汉字表》三级字表（用 Array.from 正确保留扩展 B 区的代理对） */
export function tongyongLevels(dataDir) {
  return [1, 2, 3].map((level) => {
    const txt = fs.readFileSync(path.join(dataDir, `tongyong-${level}.txt`), 'utf8');
    const chars = new Set(Array.from(txt).filter((c) => c.trim() !== ''));
    return { level, chars };
  });
}

/** 把一个字体目录下所有 woff2 分片的码位取并集 */
export function unionCodepoints(fontkit, dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.woff2'));
  const set = new Set();
  const unreadable = [];
  for (const f of files) {
    try {
      for (const cp of fontkit.openSync(path.join(dir, f)).characterSet) set.add(cp);
    } catch (err) {
      unreadable.push(`${f}: ${err.message}`);
    }
  }
  return { set, fileCount: files.length, unreadable };
}

/** 比对并给出结构化的缺失明细 */
export function analyzeCoverage(codepoints, gb2312, levels) {
  const missing = (chars) => {
    const out = [];
    for (const ch of chars) if (!codepoints.has(ch.codePointAt(0))) out.push(ch);
    return out;
  };
  const perLevel = levels.map(({ level, chars }) => {
    const missed = missing(chars);
    return { level, total: chars.size, missedCount: missed.length, sample: missed.slice(0, 20).join('') };
  });
  const gbMissed = missing(gb2312);
  return {
    totalCodepoints: codepoints.size,
    gb2312: { total: gb2312.size, missedCount: gbMissed.length, sample: gbMissed.slice(0, 20).join('') },
    tongyong: {
      total: perLevel.reduce((a, l) => a + l.total, 0),
      missedCount: perLevel.reduce((a, l) => a + l.missedCount, 0),
      levels: perLevel
    }
  };
}

/** 按 spec 里的 expect 基线判定是否通过 */
export function evaluate(font, report) {
  const problems = [];
  if (report.unreadable.length) problems.push(`${report.unreadable.length} 个分片无法读取`);
  if (report.gb2312.missedCount !== font.expect.gb2312Missing) {
    problems.push(`GB2312 缺字 ${report.gb2312.missedCount}（基线 ${font.expect.gb2312Missing}）`);
  }
  if (report.tongyong.missedCount !== font.expect.tongyongMissing) {
    problems.push(`通用规范汉字表 缺字 ${report.tongyong.missedCount}（基线 ${font.expect.tongyongMissing}）`);
  }
  return problems;
}
