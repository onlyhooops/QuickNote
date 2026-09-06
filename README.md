<p align="center">
  <img src="web/public/icons/icon-192.png" alt="快记 logo" width="96" height="96" />
</p>

<h1 align="center">快记 · QuickNote</h1>

<p align="center">极简「随手记 + 时光轴」，本地优先。第一屏即录入，保存即化作时间线上的光点。</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/Node-%E2%89%A523.4-339933.svg" alt="Node >= 23.4" />
  <img src="https://img.shields.io/badge/Vue-3.5-42b883.svg" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Vite-build-646cff.svg" alt="Vite" />
</p>

---

## ✨ 特性

- **首屏即录入**：右侧工作区即编辑窗，所见即所得（Tiptap 富文本），⌘/Ctrl+Enter 快速保存；**输入即存草稿**（仅真正编辑过且有内容时保存；同一份草稿会话内只提醒恢复一次，避免反复弹窗）
- **图形化时间轴**：中心线 + 左右交替节点（组件化 `TimelineItem`，VueUse 滚动入场），移动端自动切靠左单列；**点击时间点或文字条目均可打开**该记录
- **粘贴 URL 自动嵌入**：YouTube / Bilibili / Apple Music → 内嵌播放器；普通网页 → Nothing 风链接卡（favicon + 标题/描述 + 缩略图 + 域名）
- **图片 / 附件**：拖拽、粘贴、按钮上传；附件**任意格式、不限大小**
- **AI 助手（可选）**：设置页启用并填入 DeepSeek Key 后，编辑器可一键「✨ AI 探索」——对<strong>纯文字</strong>做「溯源」与「扩展」；输出末尾自动附 AI 免责声明；审核后以「✨ AI 补全」区块插入、与原文排版区分（自动剔除图片/网页卡/音乐/视频卡片，不参与分析）。Key 仅存本机服务端，设置页可明文核对（仅本机/令牌可读回）
- **随览 & 回响**：随机拾取一个时间点；回响展示**所有年份**「同月今日」时刻，按年份分组
- **日期增强**：公历节日 / 农历日期与节日 / 节气（`lunar-javascript`）
- **明暗主题**：浅色 / 深色 / 跟随系统；**3 套字体方案**（中英文成对）+ 实时预览
- **标签与检索**：输入即默认入库，聚焦「＋标签」弹出<strong>曾用标签</strong>点选复用（无需重复手打），胶囊 ✕ 移除未使用的孤儿标签；时间轴/侧栏筛选；纯文本关键字检索
- **备份**：单向 WebDAV（手动 + 定时），本地保留最近 5 份快照
- **PopClip 快捷写入（macOS）**：选中文字一键「记入快记」；设置页可生成/复制/清除访问令牌，并**直接下载内置令牌与当前服务地址的 `QuickNote.popclipextz`** 安装即用
- **设置**：含「说明」安全提示（网络 / AI Key / 个人开发者勿生产部署）与「关于」（项目背景、版本、编译时间、开发工具、AI 模型、仓库链接，附只读“检查更新”）
- **本地 & PWA**：无账号、单机运行；移动端（顶条 + 底 Tab）与「添加到主屏幕」

## 🖼 截屏

| 录入 | 时间轴 |
| --- | --- |
| <img src="docs/screenshot-write.png" alt="录入" width="480" /> | <img src="docs/screenshot-timeline.png" alt="时间轴" width="480" /> |

## 🚀 从拉取到使用（Linux 服务器）

### 1️⃣ 获取源码（在服务器上）

```bash
# 方式 A：git 克隆（推荐；如服务器没有 git，deploy 脚本会自动安装）
git clone https://github.com/onlyhooops/QuickNote.git /opt/quicknote
cd /opt/quicknote

# 方式 B：手动上传 —— 把仓库目录（含 server/、web/、deploy/、package.json 等）拷贝到服务器任意位置
```

### 2️⃣ 一键部署

```bash
sudo bash deploy/install.sh
```

脚本会自动：

- **识别发行版/包管理器**：Debian/Ubuntu(apt)、Fedora/RHEL(dnf/yum)、Arch(pacman)、Alpine(apk)、openSUSE(zypper)、macOS(brew 本机)
- 安装系统依赖（curl/tar/xz/ca-certificates），并**自带现代 Node(≥23.4，内置 node:sqlite)**，避免系统 Node 过旧
- `npm install` + `npm run build`（产出前端静态包）
- 创建运行用户与数据目录，生成并启用 **systemd 服务**，打印访问地址

**自定义路径/端口/监听**（用环境变量传给脚本）：

```bash
sudo QUICKNOTE_DIR=/opt/quicknote \
     QUICKNOTE_HOST=0.0.0.0 QUICKNOTE_PORT=3987 \
     QUICKNOTE_DATA=/var/lib/quicknote \
     QUICKNOTE_IMAGES_DIR=/data/qn/images \
     QUICKNOTE_ATTACHMENTS_DIR=/data/qn/attachments \
     QUICKNOTE_BACKUP_DIR=/data/qn/backups \
     QUICKNOTE_USER=quicknote QUICKNOTE_NODE_VERSION=v24.4.0 \
     bash deploy/install.sh
```

### 3️⃣ 访问与使用

- 浏览器打开 `http://127.0.0.1:3987`（若绑定了 `0.0.0.0`，手机/平板同网访问 `http://<电脑IP>:3987`）
- **录入**：首屏即编辑窗，所见即所得；⌘/Ctrl+Enter 或点「保存」化作时间点；输入自动存草稿
- **时间轴**：中心线交替节点悬浮预览、点击全屏；**随览**随机拾取；**回响**看历史上的此刻（跨年度同月同日）
- **嵌入**：粘贴 YouTube/Bilibili/Apple Music 链接自动变播放器，普通网页变链接卡
- **标签**：编辑时点选，时间轴/侧栏筛选
- **设置**：明暗主题、3 套字体方案、WebDAV 备份（单向 + 定时）与本地快照
- **PWA**：手机浏览器「添加到主屏幕」全屏使用

### 4️⃣ 日常运维

| 操作 | 命令 |
| --- | --- |
| 看日志 | `journalctl -u quicknote -f` |
| 重启服务 | `sudo systemctl restart quicknote` |
| 开放局域网 | 编辑 `/etc/systemd/system/quicknote.service` 的 `QUICKNOTE_HOST=0.0.0.0` 后 `sudo systemctl restart quicknote`（并按需放行端口，firewalld/ufw） |
| 升级 | `git pull && sudo bash deploy/install.sh`（脚本幂等，安全重跑） |
| 数据位置 | 数据/图片/附件/备份均在可配置目录；备份 = 本地 zip + WebDAV 上传 |

---

## 🛠 常见问题（排障）

**Q1 打开 `http://<服务器IP>:3987` 空白 / 连不上**
- 服务默认只监听 `127.0.0.1`（仅本机）。**局域网访问需改为 `QUICKNOTE_HOST=0.0.0.0`**：
  ```bash
  # 方式一（推荐）：带环境变量重跑部署脚本（幂等）
  sudo QUICKNOTE_HOST=0.0.0.0 bash deploy/install.sh
  # 方式二：手动改 unit 并重启
  sudo sed -i 's#^Environment=QUICKNOTE_HOST=.*#Environment=QUICKNOTE_HOST=0.0.0.0#' /etc/systemd/system/quicknote.service
  sudo systemctl daemon-reload && sudo systemctl restart quicknote
  ```
- 确认在监听：`ss -ltnp | grep 3987`（应绑定 `0.0.0.0`）。
- **容器/LXC**：改绑定后一般即可；**非容器**还需放行端口：`firewall-cmd --add-port=3987/tcp` 或 `ufw allow 3987`。

**Q2 本机 `curl http://127.0.0.1:3987/` 返回 502**
- 多为终端/容器设置了 **http 代理**，把 loopback 也转发给代理所致（**非应用故障**）。用 `--noproxy '*'` 复核：
  ```bash
  curl -s --noproxy '*' http://127.0.0.1:3987/api/health
  ```
  返回 `{"ok":true,...}` 即正常。

**Q3 日志出现 `ExperimentalWarning: SQLite is an experimental feature`**
- Node 内置 `node:sqlite` 的提示，功能正常，可忽略。

**Q4 系统 `node -v` 版本较旧 / 提示需 ≥ 23.4**
- 服务使用的是部署脚本自带的**便携 Node**（`.node/bin/node`，默认 `v24.4.0`），无需升级系统 Node；版本过低时脚本会自动下载现代 Node。

**Q5 单机、无账号体系**
- 应用无用户/权限体系；开放局域网后，同网任何能访问该端口者均可读写——请仅在可信网络使用。

---

## 🚀 快速开始（macOS / Linux）

```bash
npm install        # 根目录 npm workspaces，一次装齐前后端
npm run dev        # 后端(3987) + Vite(5173)
```

浏览器打开 http://127.0.0.1:5173 （Vite 已代理 `/api` 与 `/images` 到后端）。

## 🖥 生产部署（Linux）

### 方式一：通用一键脚本（推荐）

```bash
sudo bash deploy/install.sh
```

脚本会自动识别发行版/包管理器（Debian/Ubuntu·apt、Fedora/RHEL·dnf/yum、Arch·pacman、Alpine·apk、openSUSE·zypper，macOS·brew 自用）、安装系统依赖、**自带现代 Node(≥23.4，内置 node:sqlite)**、构建前端、创建运行用户与数据目录、生成并启用 systemd 服务。

**可自定义所有路径**（用环境变量传给脚本，示例）：

```bash
sudo QUICKNOTE_DIR=/opt/quicknote \
     QUICKNOTE_HOST=0.0.0.0 QUICKNOTE_PORT=3987 \
     QUICKNOTE_DATA=/var/lib/quicknote \
     QUICKNOTE_IMAGES_DIR=/data/qn/images \
     QUICKNOTE_ATTACHMENTS_DIR=/data/qn/attachments \
     QUICKNOTE_BACKUP_DIR=/data/qn/backups \
     QUICKNOTE_USER=quicknote \
     QUICKNOTE_NODE_VERSION=v24.4.0 \
     bash deploy/install.sh
```

### 更新到新版本（智能脚本，推荐）

```bash
sudo bash deploy/update.sh          # 交互确认
sudo bash deploy/update.sh --yes    # 免确认
sudo bash deploy/update.sh --force  # 本地有未提交/领先时强制覆盖（谨慎）
```

脚本主流程（与 `install.sh` 分工：install=首次全量部署，update=增量更新，不触碰数据/用户/unit）：

1. **检测运行与版本**：服务是否在跑 + 本地 git 版本；
2. **拉取远端**并比对：落后/领先提交数、是否有未提交改动；
3. 校验通过后**停止服务** → `git merge --ff-only` 更新源码；
4. **按需** `npm install`（依赖变更时）与 `npm run build`（源码变更时），无变更自动跳过，更新快；
5. 重启服务并**健康检查**，输出新版本与状态。

环境变量（可选）：`QUICKNOTE_DIR`、`QUICKNOTE_BRANCH`、`QUICKNOTE_SERVICE`。

### 方式二：手动（可选）

```bash
npm install
npm run build      # 产出 web/dist，后端自动托管
node server/src/index.js
# → http://127.0.0.1:3987
```

常驻运行用 systemd：`sudo cp deploy/quicknote.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now quicknote`；日志 `journalctl -u quicknote -f`。

| 环境变量 | 默认 | 说明 |
| --- | --- | --- |
| `QUICKNOTE_HOST` | `127.0.0.1` | 监听地址（`0.0.0.0` = 开放局域网） |
| `QUICKNOTE_PORT` | `3987` | 端口 |
| `QUICKNOTE_DATA` | `<项目>/server/data` | 数据目录根 |
| `QUICKNOTE_IMAGES_DIR` | `<DATA>/images` | 图片落盘目录 |
| `QUICKNOTE_ATTACHMENTS_DIR` | `<DATA>/attachments` | 附件落盘目录 |
| `QUICKNOTE_BACKUP_DIR` | `<DATA>/backups` | 本地备份目录 |

### 冒烟测试

```bash
npx playwright install chromium   # 首次（约 80MB）
npm run build
node server/src/index.js          # 或 npm run dev -w server
npm run smoke                     # 桌面 + 移动关键路径 22 项断言
```

## 📱 移动端访问（局域网，风险自知）

无账号体系：开放局域网后，同网任何能访问该端口者均可读写。仅限可信 WiFi。

```bash
QUICKNOTE_HOST=0.0.0.0 node server/src/index.js   # 启动日志会打印局域网地址
```

systemd 里取消 `Environment=QUICKNOTE_HOST=0.0.0.0` 注释并重启；放行防火墙 `3987/tcp`（firewalld/ufw）。手机开 `http://<电脑IP>:3987`，浏览器「添加到主屏幕」即 PWA 全屏。

## 🧱 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 · Vite · Tiptap（所见即所得富文本）· Lucide 图标 · VueUse（滚动动画） |
| 后端 | Node.js（≥ 23.4，推荐 24 LTS）· Express · 内置 `node:sqlite`（零原生编译依赖） |
| 日期 | `lunar-javascript`（公历/农历节日、节气） |
| 存储 | SQLite 单文件 `server/data/quicknote.db`；图片 `server/data/images/`；附件 `server/data/attachments/` |

## 📁 目录结构

```
├── server/            # Node 后端
│   └── src/
│       ├── index.js        # 入口：API + 静态托管 + 定时备份调度
│       ├── config.js       # 目录/端口/配置读写（server/data/config.json）
│       ├── db.js           # node:sqlite；content(净化HTML)+plain(纯文本) 双列存储
│       ├── routes/         # notes / tags / images / attachments / unfurl / backup
│       └── backup/         # 本地快照 zip + WebDAV 上传
├── web/               # Vue 3 前端
│   ├── public/             # PWA 图标 / manifest
│   └── src/
│       ├── views/          # WriteView(录入) / TimelineView(时间轴) / SettingsView(设置)
│       ├── components/     # TipTapEditor / TimelineItem / MomentCard / FullNoteModal / 随览 / 回响
│       ├── embed.js        # 链接→嵌入组件（YouTube/Bilibili/Apple/网页卡）
│       ├── datecn.js       # 公历/农历/节日/节气 格式化
│       └── rich.js         # 净化与统计（DOMPurify）
├── scripts/smoke.mjs  # Playwright 冒烟测试（桌面+移动）
├── deploy/            # install.sh 首次部署 / update.sh 智能更新 + systemd 单元示例
└── LICENSE            # MIT
```

## 📡 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notes?q=&tag=&sort=&order=&from=&to=` | 列表（`q` 对纯文本检索；`from/to` 为 YYYY-MM-DD 按创建日过滤） |
| POST | `/api/quickin` | 快捷写入（PopClip 等外部工具）：`{text, tags?, source?}` → 生成时间点；可选令牌头 `X-QuickNote-Token` |
| POST | `/api/notes` | 新建 `{content: 净化 HTML, plain: 纯文本, tags[]}` |
| GET/PUT/DELETE | `/api/notes/:id` | 单条记录（PUT 同 POST 载荷） |
| GET | `/api/tags` | 标签与计数 |
| POST | `/api/images` | 图片上传（字段 `file`），返回 `/images/xxx` |
| POST | `/api/attachments` | 附件上传（任意格式、不限大小），返回 `{url,name,size}` |
| GET | `/api/unfurl?url=` | 抓取网页 Open Graph 元信息（标题/描述/封面），供链接卡片 |
| GET/PUT | `/api/backup/config` | 备份配置 |
| POST | `/api/backup/run` | 立即备份（本地 zip + WebDAV 上传） |

## 📄 许可

[<img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT" />](LICENSE)

## 🗺 开发计划

**本期已完成**：所见即所得编辑器、图形化时间轴、随览/回响、嵌入组件（YouTube/Bilibili/Apple Music + 网页链接卡）、图片/附件上传、明暗主题与字体方案、WebDAV 备份。

**待办**：

- 多图上传、孤儿图片/附件清理
- **规划：记录导出（图片 / PDF）** —— 把单条或所选时间点导出为图片与 PDF 文稿，服务于分享与打印：
  - **长图模式**：按时间点内容拼接成竖版长图（微信/相册友好）；
  - **A4 文稿模式**：按 A4 分页、可设页边距/页眉页脚/字号，正文宽度与分页智能处理（避免图片/卡片/代码被截断，嵌入组件按需包含或折叠）；
  - 拟实现：服务端无头渲染（如 Puppeteer/Playwright）或前端 `html2canvas + jsPDF`，先评估中/长图文混排与嵌入卡片的保真度。
- **规划：PopClip 快速笔记** —— 接入 PopClip（macOS，https://www.popclip.app/dev/ ），实现「选中文本 → 「记入快记」→ 生成时间点」。**调研已完成**（详见 [docs/popclip-plan.md](docs/popclip-plan.md)）：PopClip JS 网络受 ATS 限制仅 https，本地 http 需走 Shell Script + curl；故扩展用 Shell 动作调本地 `POST /api/quickin`，后端预留本机校验/令牌：
  - PopClip 扩展：Shell Script 动作，把选中文本（可含多段与换行）经 curl 发往本地服务；
  - 快记侧：新增极简接收接口 `POST /api/quickin`（文本/可选标签/来源），校验仅本机来源（预留访问令牌），立即生成时间点并在本机轻提示；
  - 依赖既有"纯文本录入 + 标签"能力，不触碰图片/卡片；计划拆分为 M1 后端接口 → M2 最小 snippet → M3 package 化。
- 从备份恢复入口
- 远端网页图片抓取到本地
- 更多平台嵌入（腾讯视频 / 网易云 / Spotify 等）
- 法定节假日调休表、字体文件上传

## 🤝 致谢

本项目的设计与开发由以下协作完成：

- **DeepSeek v4 Flash-Vision-Exp** —— 负责产品方案、前端视觉与交互迭代（含界面截图审校）、后端 API 与数据模型、自动化测试与部署脚本。
- **DeepSeek Harness** —— 提供开发运行的 Agent 环境与工具链，支撑从需求澄清、研发治理到仓库托管（GitHub）的完整流程。

---

<p align="center">本地优先的个人记录工具</p>
