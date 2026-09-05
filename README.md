# 快记 QuickNote

极简「随手记 + 时光轴」。第一屏即录入，保存即化作时间线上的光点；支持**所见即所得富文本**、图形化时间轴、随览、回响、明暗主题、字体方案、WebDAV 单向备份。

- **前端**：Vue 3 + Vite（含 `@vueuse/core` 用于滚动动画）；**单栏所见即所得富文本编辑器（Tiptap）** + **Lucide 图标**。工具栏颜色全部走主站 CSS 变量（明暗一致）；支持标题/加粗/斜体/删除线/列表/引用/链接/图片 + **附件按钮**（任意格式、不限大小，存 `server/data/attachments`）；**拖拽/粘贴图片**一键插入；**粘贴 URL 自动识别为嵌入组件**（YouTube/Bilibili/Apple Music → 内嵌 iframe，Apple Music 用官方 `embed.music.apple.com/{song|album|playlist}/{id}?theme=light`，单曲 175px、专辑/歌单 450px、宽 660px；普通网页 → Nothing 风链接卡：favicon + 标题/描述 + 缩略图 + 域名，复用后端 `/api/unfurl` 抓 OG，解析与属性顺序无关；嵌入卡片以 `data-embed` 序列化、保存/查看后仍是卡片（DOMPurify 放行 iframe 与 data-*））；内容以净化后 HTML 存储
- **字体**：3 套预设方案（现代无衬线 / 人文衬线 / 极客等宽，中文英文成对），设置页一键切换并**实时预览**，存 localStorage
- **结构**：桌面为「左侧常驻导航 + 右侧工作区」，移动端为「顶部操作条 + 底部 Tab」；扁平化、以明暗图层区分区域、软过渡，减少引导文案
- **后端**：Node.js（≥ 23.4，推荐 24 LTS）+ Express + 内置 `node:sqlite`（零原生编译依赖）；`POST /api/images` 图片、`POST /api/attachments` 任意附件
- **日期增强**：`lunar-javascript` —— 自动呈现 公历节日 / 农历日期与节日 / 节气
- **存储**：SQLite 单文件（`server/data/quicknote.db`）；图片 `server/data/images/`；附件 `server/data/attachments/`
- **访问**：默认仅监听 `127.0.0.1`；可开放局域网给手机（README 下有说明），无用户体系
- **移动端**：底部三 Tab（录入 / 时间轴 / 设置）、PWA 可添加到主屏幕
- **主题**：浅色 / 深色 / 跟随系统，侧栏一键循环切换或设置页三选，localStorage 记忆

## 目录结构

```
├── server/            # Node 后端
│   └── src/
│       ├── index.js        # 入口：API + 静态托管 + 定时备份调度
│       ├── config.js       # 目录/端口/配置读写（server/data/config.json）
│       ├── db.js           # node:sqlite；content(净化HTML)+plain(纯文本)双列存储
│       ├── routes/         # notes / tags / images / attachments / unfurl / backup
│       └── backup/         # 本地快照 zip + WebDAV 上传
├── web/               # Vue 3 前端
│   └── src/
│       ├── views/          # WriteView(录入) / TimelineView(时间轴) / SettingsView(设置)
│       ├── components/     # TipTapEditor / MomentCard / FullNoteModal / 随览 / 回响
│       ├── datecn.js       # 公历/农历/节日/节气 格式化
│       ├── rich.js         # 富文本净化与统计
│       └── theme.js        # 明暗主题
├── scripts/smoke.mjs  # Playwright 冒烟测试（桌面+移动）
├── deploy/            # systemd 单元示例
└── REQUIREMENTS.md    # 需求与技术方案
```

## 交互速览

- **录入**（首屏/index=右侧工作区即编辑窗）：实时时间头（日期 · 星期 · 节日/农历 · 时:分）→ **单栏富文本（Tiptap）**编辑器书写 → 点「保存」；空内容轻提示；⌘/Ctrl+Enter 快速保存。**输入即自动存草稿**（localStorage），误触跳转/刷新回来原样恢复，保存后清除
- **时间轴**：**中心线 + 左右交替节点**（组件化 `TimelineItem`，伪元素画线、Flex/Grid 交替排版，VueUse 滚动入场动画；移动端自动切换为靠左单列）。按日分组、最新在上；悬浮即预览（桌面），点击进入全屏
- **随览**：侧栏（或移动端顶部图标）随机拾取一个时间点，可再拾取、可进入详情
- **回响**：展示**所有年份**中“同月今日”时刻的记录（按年份分组），无记录时出现随机留白文案
- **标签**：仅在编辑时点选（输入回车/快捷胶囊），时间轴与侧栏里可筛可选

## 开发（macOS / Linux）

```bash
npm install          # 根目录 workspaces 一次装齐
npm run dev          # 后端(3987) + Vite(5173)
```

浏览器打开 http://127.0.0.1:5173。

## 生产部署（Linux，单进程）

```bash
npm install
npm run build        # 产出 web/dist，后端自动托管
node server/src/index.js
# → http://127.0.0.1:3987
```

systemd：`sudo cp deploy/quicknote.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now quicknote`；日志 `journalctl -u quicknote -f`。

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `QUICKNOTE_HOST` | `127.0.0.1` | 监听地址（`0.0.0.0` = 开放局域网） |
| `QUICKNOTE_PORT` | `3987` | 端口 |
| `QUICKNOTE_DATA` | `<项目>/server/data` | 数据目录 |

### 冒烟测试

```bash
npx playwright install chromium   # 首次（约 80MB）
npm run build
node server/src/index.js          # 或 npm run dev -w server
npm run smoke                     # 桌面 + 移动关键路径 21 项断言
```

## API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/notes?q=&tag=&sort=&order=&from=&to=` | 列表（`q` 对纯文本检索；`from/to` 为 YYYY-MM-DD 按创建日过滤） |
| POST | `/api/notes` | 新建 `{content: 净化 HTML, plain: 纯文本, tags[]}` |
| GET/PUT/DELETE | `/api/notes/:id` | 单条记录（PUT 同 POST 载荷） |
| GET | `/api/tags` | 标签与计数 |
| POST | `/api/images` | 图片上传（字段 `file`），返回 `/images/xxx` |
| POST | `/api/attachments` | 附件上传（任意格式、不限大小），返回 `{url,name,size}` |
| GET | `/api/unfurl?url=` | 抓取网页 Open Graph 元信息（标题/描述/封面），供链接卡片 |
| GET/PUT | `/api/backup/config` | 备份配置 |
| POST | `/api/backup/run` | 立即备份（本地 zip + WebDAV 上传） |

## 字体个性化

- **方案**：3 套主流预设（中文/英文成对），设置页一键切换，**下方实时预览**效果：
  1. **现代无衬线**（系统默认）：EN 系统无衬线 / CN 苹方·微软雅黑·思源黑体
  2. **人文衬线**（博客/阅读）：EN Georgia / CN 宋体·思源宋体
  3. **极客等宽**（数字/代码感）：EN 等宽字体族 / CN 无衬线兜底
- **实现**：经 CSS 变量 `--font-en`/`--font-cn` 接入全局字体栈，改动即生效并记忆于 localStorage；无外网依赖、零风险。
- **进阶（可选，暂未做）**：让用户**上传字体文件**（.woff2 存本地 + 动态 `@font-face`）实现"自带字体库"。可行但需处理字体授权/缓存/跨端一致，建议后续专项评估。

## 设计取向（调研参考）

扁平化 + 明暗图层分区 + 软过渡，减少引导文案，做"安静克制"的个人记录工具——参考自以下方向的共性：
[最小化日志应用 samjourn.al（dark · calm · intentional）](https://github.com/cedrugs/samjourn.al/#1)、[QuietPage（calm reflective space）](https://github.com/tomasmach/QuietPage#1)、[journalfor.me（UX/离线优先）](https://github.com/brennanbrown/journalfor.me#1)、["简单到有点无聊最好" 实践](https://www.xda-developers.com/ditched-fancy-notes-apps-for-simple-system-that-feels-boring/#1)。

## 移动端访问（局域网，风险自知）

无账号体系：开放局域网后，同网任何能访问该端口者均可读写。仅限可信 WiFi。

```bash
QUICKNOTE_HOST=0.0.0.0 node server/src/index.js   # 启动日志会打印局域网地址
```

systemd 里取消 `Environment=QUICKNOTE_HOST=0.0.0.0` 注释并重启；放行防火墙 `3987/tcp`（firewalld/ufw）。手机开 `http://<电脑IP>:3987`，浏览器「添加到主屏幕」即 PWA 全屏。

## 已知边界 / Roadmap

- 富文本/图片：Tiptap 所见即所得，复杂嵌套样式不保证；图片/附件删除不清理孤儿文件
- 全屏编辑仅改内容与标签，时间点停留在原创建时刻（不挪位、不重排）
- 回响 = 同月同日跨年度 ±2 小时优先展示（“约今时”标记）；公历节日与农历节日由库内置（不含法定调休）
- 备份为单向 WebDAV，恢复入口未做（解包 zip 替换 `server/data` 即可）

### 开发计划（暂缓项）

- **网页抓取与卡片嵌入（#8，暂缓）**：后续专项设计，目标——粘贴链接自动识别为卡片，支持
  - Web 图片抓取（把远端图片拉到本地 `/images` 或走代理）
  - Apple Music 嵌入（iframe/Web Player 卡片）
  - YouTube / Bilibili 视频嵌入（oEmbed / 分享链接转 iframe）
  - 拟结合 Tiptap 自定义节点 / 扩展语法实现（如 `:::embed`）
- 期间其他待办：从备份恢复入口、孤儿图片/附件清理、多图上传、法定节假日调休表
