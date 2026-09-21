#!/usr/bin/env node
/**
 * 覆盖率自检：读 web/public/fonts 里已入库的分片产物，与两个权威字表逐一比对，离线可跑。
 *   - GB2312 汉字表（6763 字）
 *   - 《通用规范汉字表》8105 字（一级 3500 / 二级 3000 / 三级 1605）
 *
 * 用法：npm run fonts:check
 * 退出码：任一字体缺字数偏离 scripts/lib/font-spec.mjs 的基线即返回 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { FONTS, OUT_ROOT, TOOLS_DIR, DATA_DIR } from './lib/font-spec.mjs';
import {
  loadFontkit,
  gb2312Hanzi,
  tongyongLevels,
  unionCodepoints,
  analyzeCoverage,
  evaluate
} from './lib/font-coverage.mjs';

const fontkit = await loadFontkit(TOOLS_DIR);
const gb2312 = gb2312Hanzi();
const levels = tongyongLevels(DATA_DIR);

console.log('字体包覆盖率自检');
console.log(`  · GB2312 汉字表：${gb2312.size} 字`);
console.log(`  · 通用规范汉字表：${levels.reduce((a, l) => a + l.chars.size, 0)} 字`);
console.log('');

let failed = 0;
for (const font of FONTS) {
  const dir = path.join(OUT_ROOT, font.id);
  if (!fs.existsSync(dir)) {
    console.log(`✗ ${font.label}（${font.id}）：未找到产物目录 ${dir}`);
    failed++;
    continue;
  }
  const { set, fileCount, unreadable } = unionCodepoints(fontkit, dir);
  const report = { ...analyzeCoverage(set, gb2312, levels), unreadable, fileCount };
  const problems = evaluate(font, report);

  console.log(`${problems.length ? '✗' : '✓'} ${font.label}（${font.family} · weight ${font.cssWeight}）`);
  console.log(`    分片 ${fileCount} 个 · 码位并集 ${report.totalCodepoints}`);
  console.log(
    `    GB2312 缺 ${report.gb2312.missedCount}／${report.gb2312.total}` +
      (report.gb2312.missedCount ? `（例：${report.gb2312.sample}）` : '')
  );
  console.log(
    `    通用规范汉字表 缺 ${report.tongyong.missedCount}／${report.tongyong.total}` +
      `（一级 ${report.tongyong.levels[0].missedCount}／二级 ${report.tongyong.levels[1].missedCount}／三级 ${report.tongyong.levels[2].missedCount}）`
  );
  const sample = report.tongyong.levels.flatMap((l) => l.sample).slice(0, 20).join('');
  if (sample) console.log(`    缺字样例：${sample}`);
  if (report.tongyong.missedCount) {
    console.log('    说明：缺字由字体栈回退到下一个字体（默认字体）渲染，不会出现豆腐块。');
  }
  if (problems.length) {
    failed++;
    for (const p of problems) console.log(`    ✗ ${p}`);
  }
  console.log('');
}

if (failed) {
  console.log(`自检未通过：${failed} 个字体不符合预期基线。`);
  process.exit(1);
}
console.log('自检通过：所有字体覆盖度符合基线。');
