// 主题 × 字体 实测：无头浏览器验证纸纹层、夜色版、字体分片按需加载与西文回退
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3988';
const OUT = process.env.SHOT_DIR || "/tmp/qn-shots";
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
};

const THEMES = ['light', 'dark', 'xuan', 'sangpi'];
const browser = await chromium.launch();

// 字体分片总量（用于“按需加载”比例的断言）
const FONT_DIR = new URL('../web/public/fonts/', import.meta.url).pathname;
let TOTAL_FONT_BYTES = 0;
for (const dir of fs.readdirSync(FONT_DIR)) {
  const p = FONT_DIR + dir;
  if (!fs.statSync(p).isDirectory()) continue;
  for (const f of fs.readdirSync(p)) if (f.endsWith('.woff2')) TOTAL_FONT_BYTES += fs.statSync(p + '/' + f).size;
}

async function setPrefs(page, { theme, scheme, dark }) {
  await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
  await page.addInitScript(
    ([t, s]) => {
      if (t) localStorage.setItem('quicknote.theme', t);
      if (s) localStorage.setItem('quicknote.font.scheme', s);
    },
    [theme, scheme]
  );
}

// ---------- 0. 静态校验：纸纹的三层背景列表必须等长 ----------
// CSS 的 background-* 列表不足时会「从头循环」，层数写错会把云絮层的混合模式挪到别层，
// 表现为纸面突然出现大片脏斑（本项目踩过）。这里按位校验，防止回归。
{
  const css = fs.readFileSync(new URL('../web/src/themes-paper.css', import.meta.url), 'utf8');
  const splitTop = (s) => {
    const out = [];
    let depth = 0;
    let cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  const blocks = [...css.matchAll(/html\[data-theme='([^']+)'\] \.paper-tex \{([\s\S]*?)\n\}/g)];
  check('纸纹 CSS：共 4 套纸主题（宣纸/桑皮纸 × 日夜）', blocks.length === 4, `实际 ${blocks.length}`);
  for (const [, theme, body] of blocks) {
    const count = (prop) => {
      const m = body.match(new RegExp(`${prop}:([\\s\\S]*?);`));
      return m ? splitTop(m[1]).length : 0;
    };
    const n = {
      image: count('background-image'),
      size: count('background-size'),
      blend: count('background-blend-mode')
    };
    check(
      `纸纹 CSS ${theme}：image/size/blend 层数一致`,
      n.image === n.size && n.image === n.blend,
      `${n.image}/${n.size}/${n.blend}`
    );
  }
}

// ---------- 1. 主题 ----------
for (const theme of THEMES) {
  for (const dark of theme === 'light' || theme === 'dark' ? [null] : [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    await setPrefs(page, { theme, scheme: 'sans', dark: !!dark });
    await page.goto(BASE + '/#/timeline', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const tex = document.querySelector('.paper-tex');
      const cs = tex ? getComputedStyle(tex) : null;
      const body = getComputedStyle(document.body);
      return {
        theme: document.documentElement.dataset.theme,
        texDisplay: cs?.display ?? 'none',
        texImage: (cs?.backgroundImage ?? '').slice(0, 60),
        meta: document.querySelector('meta[name="theme-color"]')?.content,
        bodyBg: body.backgroundColor,
        bodyColor: body.color
      };
    });
    const label = `${theme}${dark ? '(系统深色)' : ''}`;
    const expectPaper = theme === 'xuan' || theme === 'sangpi';
    check(`主题 ${label} → data-theme=${info.theme}`, info.theme === (dark ? `${theme}-dark` : theme));
    check(`  纸纹层 ${expectPaper ? '启用' : '关闭'}`, expectPaper ? info.texDisplay === 'block' : info.texDisplay === 'none');
    check(`  theme-color=${info.meta}`, !!info.meta);
    const shot = `${OUT}/theme-${theme}${dark ? '-dark' : ''}.png`;
    await page.screenshot({ path: shot });
    await page.close();
  }
}

// ---------- 2. 字体 ----------
// 字形归属用 CDP 的 CSS.getPlatformFontsForNode 判定（唯一权威口径）：
// document.fonts.check() 对「家族已注册但无该字形」也返回 true；canvas 测宽对 CJK 无效（都是 1em）。
const WEBFONTS = ['LXGW WenKai'];
for (const scheme of ['sans', 'kai']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const fontReqs = [];
  page.on('request', (r) => {
    if (r.url().includes('/fonts/')) fontReqs.push(r.url().split('/fonts/')[1]);
  });
  await setPrefs(page, { theme: 'xuan', scheme, dark: false });
  await page.goto(BASE + '/#/write', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const platformFonts = async () => {
    const { root } = await client.send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.ProseMirror' });
    const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts.map((f) => ({ family: f.familyName, glyphs: f.glyphCount, custom: !!f.isCustomFont }));
  };
  const webfontUsed = (fonts) =>
    fonts.filter((f) => WEBFONTS.includes(f.family) && f.glyphs > 0).map((f) => `${f.family}(${f.glyphs})`);

  const editor = page.locator('.ProseMirror');
  const reset = async () => {
    await editor.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(150);
  };

  // 阶段 A：只输入西文 / 数字 / 半角符号
  await editor.click();
  const beforeA = fontReqs.length;
  await page.keyboard.type('QuickNote 2026 v1.522 (test) #7 - 100%');
  await page.waitForTimeout(900);
  const latinReqs = fontReqs.length - beforeA;
  const fontsA = await platformFonts();

  // 阶段 B：只输入中文
  await reset();
  const beforeB = fontReqs.length;
  await page.keyboard.type('永和九年岁在癸丑暮春之初会于会稽山阴之兰亭');
  await page.waitForTimeout(1500);
  const cjkReqs = fontReqs.length - beforeB;
  const fontsB = await platformFonts();

  // 阶段 C：只输入全角中文标点
  await reset();
  await page.keyboard.type('，。、：「」《》');
  await page.waitForTimeout(1200);
  const fontsC = await platformFonts();

  const uniq = [...new Set(fontReqs)];
  let bytes = 0;
  for (const u of uniq) bytes += (await (await page.request.get(BASE + '/fonts/' + u)).body()).length;
  const isWebfont = scheme !== 'sans';
  const usedA = webfontUsed(fontsA);
  const usedB = webfontUsed(fontsB);
  const usedC = webfontUsed(fontsC);
  const expectFamily = scheme === 'kai' ? 'LXGW WenKai' : null;

  const fam = await page.evaluate(
    () => getComputedStyle(document.querySelector('.ProseMirror')).fontFamily
  );
  console.log(`\n[字体方案 ${scheme}]`);
  console.log(`  font-family = ${fam}`);
  console.log(
    `  分片请求：西文阶段 ${latinReqs} 个；中文阶段 ${cjkReqs} 个；累计去重 ${uniq.length} 个 / ${(bytes / 1024).toFixed(0)}KB`
  );
  console.log(`  实际字形来源：西文[${fontsA.map((f) => f.family).join('/')}]`);
  console.log(`                中文[${fontsB.map((f) => f.family).join('/')}]`);
  console.log(`                标点[${fontsC.map((f) => f.family).join('/')}]`);

  check(`${scheme}：西文/数字/半角符号不触发中文字体下载`, latinReqs === 0, `实际 ${latinReqs}`);
  check(
    `${scheme}：中文${isWebfont ? '命中自托管分片' : '不下载分片'}`,
    isWebfont ? cjkReqs > 0 : cjkReqs === 0,
    `实际 ${cjkReqs}`
  );
  if (isWebfont) {
    check(`${scheme}：西文阶段字形由默认字体提供（未用中文字体）`, usedA.length === 0, usedA.join(','));
    check(`${scheme}：中文阶段字形确由 ${expectFamily} 提供`, usedB.some((u) => u.startsWith(expectFamily)), usedB.join(','));
    check(`${scheme}：全角中文标点随中文字体`, usedC.some((u) => u.startsWith(expectFamily)), usedC.join(',') || '（无）');
  }
  check(
    `${scheme}：按需加载（首屏取用 < 5% 字体总量）`,
    !isWebfont || bytes < TOTAL_FONT_BYTES * 0.05,
    `${(bytes / 1024).toFixed(0)}KB / 总量 ${(TOTAL_FONT_BYTES / 1048576).toFixed(1)}MB`
  );
  check(`${scheme}：字体栈含中文字体族`, /LXGW WenKai|Alimama DaoLiTi|PingFang SC/.test(fam));

  await page.screenshot({ path: `${OUT}/font-${scheme}.png` });
  await page.close();
}

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n通过 ${results.length - bad.length}/${results.length}`);
if (bad.length) {
  console.log('失败项：\n' + bad.map((b) => ' - ' + b.name).join('\n'));
  process.exit(1);
}
