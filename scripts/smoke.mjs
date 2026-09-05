// QuickNote 冒烟测试：真实无头浏览器，覆盖新交互（录入→时间点→时间轴→全屏→随览/去年今时→主题）
// 用法：node scripts/smoke.mjs [baseUrl]
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = process.argv[2] || 'http://127.0.0.1:3987';
const results = [];

// 清空已有记录，保证断言确定性（curl --noproxy 直连本机，避免沙箱代理劫持）
function cleanAll() {
  try {
    const list = execSync(`curl -s --noproxy '*' ${BASE}/api/notes`).toString() || '[]';
    const ids = JSON.parse(list).map((n) => n.id);
    for (const id of ids) {
      execSync(`curl -s --noproxy '*' -X DELETE ${BASE}/api/notes/${id} >/dev/null`);
    }
  } catch {
    /* ignore */
  }
}
cleanAll();

function check(name, ok, extra = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
}

const browser = await chromium.launch();

async function watchErrors(page, label) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  await page.goto(BASE + '/#/write', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(500);
  if (errors.length) check(`${label}：无 JS 报错`, false, errors.join(' | '));
  else check(`${label}：无 JS 报错`, true);
  return errors;
}

// ---------------- 桌面 ----------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = await watchErrors(page, '桌面');
  const logErr = (e) => errors.push(e);

  page.on('pageerror', (e) => logErr('late: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') logErr('late console: ' + m.text());
  });

  // 首屏录入：实时时间
  const timeTxt = (await page.locator('.now-line .t').innerText()).trim();
  check('桌面：首屏显示实时时间', /^\d{2}:\d{2}(:\d{2})?$/.test(timeTxt), timeTxt);
  const dateTxt = await page.locator('.now-line .meta').innerText();
  check('桌面：时间头含日期与星期', /年\d{1,2}月\d{1,2}日|周[一二三四五六日天]/.test(dateTxt), dateTxt.slice(0, 40));

  // 录入
  await page.waitForSelector('.md-host .ProseMirror', { timeout: 8000 });
  await page.waitForTimeout(1200);
  await page.locator('.md-host .ProseMirror').click();
  await page.keyboard.type('周末去爬山，天气很好，风也温柔。');
  await page.locator('.write-tags .tag-edit input').click();
  await page.keyboard.type('备忘');
  await page.keyboard.press('Enter');
  check('桌面：快捷/手动标签可添加', (await page.locator('.write-tags .tag-edit .chip').count()) >= 1, '');
  await page.locator('.save-btn').click();
  await page.waitForSelector('.toast.show', { timeout: 6000 });
  check('桌面：保存后出现轻提示', true, (await page.locator('.toast').innerText()).trim());
  await page.waitForTimeout(2400);

  // 时间轴
  await page.locator('.side .nav-item[data-nav="timeline"]').click();
  await page.waitForSelector('.tl-marker', { timeout: 6000 });
  check('桌面：新记录化作时间点', (await page.locator('.tl-marker').count()) === 1, '');
  const stats = await page.locator('.tl-stats').innerText();
  check('桌面：时间轴统计文案', stats.includes('1 个时间点'), stats.trim());

  // 悬浮预览
  await page.locator('.tl-marker').hover();
  await page.waitForSelector('.tl-tip', { timeout: 3000 });
  const tipText = await page.locator('.tl-tip').innerText();
  check('桌面：悬浮预览时间点内容', tipText.includes('爬山'), tipText.slice(0, 60).replace(/\n/g, ' '));

  // 点击 → 全屏查看/编辑
  await page.locator('.tl-marker').click();
  await page.waitForSelector('.full-note', { timeout: 6000 });
  const viewText = await page.locator('.view-page').innerText();
  check('桌面：全屏查看内容', viewText.includes('爬山'), '');
  await page.locator('.full-note-bar .btn.primary', { hasText: '编辑' }).click();
  await page.locator('.edit-page .md-host-md').waitFor({ timeout: 6000 });
  await page.waitForSelector('.edit-page .md-host-md .ProseMirror', { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.locator('.edit-page .md-host-md .ProseMirror').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' 傍晚还看了日落。');
  await page.locator('.full-note-bar .btn.primary', { hasText: '保存' }).click();
  await page.waitForSelector('.view-page', { timeout: 6000 });
  const edited = await page.locator('.view-page').innerText();
  check('桌面：编辑保存生效', edited.includes('日落'), '');

  // 随览
  await page.locator('.full-note-bar .icon-btn').first().click();
  await page.locator('.side .nav-item[data-ov="random"]').click();
  await page.waitForSelector('.overlay-card', { timeout: 6000 });
  const rnd = await page.locator('.overlay-card').innerText();
  check('桌面：随览浮层出现且含内容', rnd.includes('爬山') || rnd.includes('日落'), rnd.slice(0, 50).replace(/\n/g, ' '));
  await page.locator('.overlay-head .icon-btn').click();

  // 回响（历史上的此刻）
  await page.locator('.side .nav-item[data-ov="lastyear"]').click();
  await page.waitForSelector('.overlay-card', { timeout: 6000 });
  const ly = await page.locator('.overlay-card').innerText();
  check('桌面：回响浮层（标题+今日记录）', ly.includes('回响') && (ly.includes('此刻') || ly.includes('·')), ly.slice(0, 60).replace(/\n/g, ' '));
  await page.locator('.overlay-head .icon-btn').click();

  // 主题切换
  const themeBtn = page.locator('.side .mode-row .icon-btn[data-theme-toggle]');
  let dark = false;
  for (let i = 0; i < 4; i++) {
    await themeBtn.click();
    await page.waitForTimeout(120);
    if ((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark') {
      dark = true;
      break;
    }
  }
  check('桌面：主题可切至深色', dark, '');
  const theme2 = await page.evaluate(() => document.documentElement.dataset.theme);
  check('桌面：主题状态持久到 DOM', theme2 === 'dark' || theme2 === 'light', theme2);
  // 恢复浅色，便于后续断言
  while ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'light') {
    await themeBtn.click();
    await page.waitForTimeout(100);
  }

  // 删除清理（进入时间点 → 删除）
  await page.locator('.side .nav-item[data-nav="timeline"]').click();
  await page.waitForSelector('.tl-marker', { timeout: 6000 });
  page.once('dialog', (d) => d.accept());
  await page.locator('.tl-marker').click();
  await page.waitForSelector('.full-note', { timeout: 6000 });
  await page.locator('.full-note-bar .btn.danger-soft').click();
  await page.waitForTimeout(1200);
  const empty = await page.locator('.tl-empty').count();
  check('桌面：删除后时间轴空态', empty >= 1, '');

  // 录入草稿防丢失：输入后跳走再回应能恢复
  {
    await page.goto(BASE + '/#/write', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('.md-host .ProseMirror').click();
    await page.waitForTimeout(200);
    await page.keyboard.type('草稿防丢失测试XYZ');
    await page.waitForTimeout(800); // 等草稿写入
    await page.locator('.side .nav-item[data-nav="timeline"]').click();
    await page.waitForTimeout(600);
    await page.locator('.side .nav-item[data-nav="write"]').click();
    await page.waitForSelector('.md-host .ProseMirror', { timeout: 8000 });
    await page.waitForTimeout(1400);
    const draftTxt = await page.locator('.md-host .ProseMirror').innerText();
    check('桌面：未保存草稿可恢复', draftTxt.includes('草稿防丢失测试XYZ'), draftTxt.slice(0, 30));
    // 清空草稿
    await page.locator('.md-host .ProseMirror').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
  }

  if (errors.length) check('桌面：全程无 JS 报错', false, errors.join(' | '));
  else check('桌面：全程无 JS 报错', true);
  await page.close();
}

// ---------------- 移动 390x844 ----------------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = await watchErrors(page, '移动');
  page.on('pageerror', (e) => errors.push('late: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('late console: ' + m.text());
  });

  check('移动：底部三 Tab 可见', (await page.locator('.tabbar .tb').count()) === 3, '');
  check('移动：桌面侧栏隐藏', !(await page.locator('.side').isVisible()), '');

  // 移动端录入 → 保存
  await page.waitForSelector('.md-host .ProseMirror', { timeout: 8000 });
  await page.waitForTimeout(1200);
  await page.locator('.md-host .ProseMirror').click();
  await page.keyboard.type('手机上的随手记。');
  await page.locator('.save-btn').click();
  await page.waitForSelector('.toast.show', { timeout: 6000 });
  await page.waitForTimeout(1500);

  // 切到时间轴查看并删除
  await page.locator('.tabbar .tb', { hasText: '时间轴' }).click();
  await page.waitForSelector('.tl-marker', { timeout: 6000 });
  check('移动：时间点出现在时间轴', (await page.locator('.tl-marker').count()) >= 1, '');
  page.once('dialog', (d) => d.accept());
  await page.locator('.tl-marker').click();
  await page.waitForSelector('.full-note', { timeout: 6000 });
  await page.locator('.full-note-bar .btn.danger-soft').click();
  await page.waitForTimeout(1200);

  if (errors.length) check('移动：全程无 JS 报错', false, errors.join(' | '));
  else check('移动：全程无 JS 报错', true);
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n结果：${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
