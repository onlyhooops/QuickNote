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
- **随览 & 回响**：随览随机拾取一个时间点；回响展示**往年**「同月同日 / 历史上的今天」时刻并按年份分组（当年/当天新写的记录不会进入回响）
- **日期增强**：公历节日 / 农历日期与节日 / 节气（`lunar-javascript`）
- **明暗主题**：浅色 / 深色 / 跟随系统；**3 套字体方案**（中英文成对）+ 实时预览
- **标签与检索**：输入即默认入库，聚焦「＋标签」弹出<strong>曾用标签</strong>点选复用（无需重复手打），胶囊 ✕ 移除未使用的孤儿标签；时间轴/侧栏筛选；纯文本关键字检索
- **备份**：单向 WebDAV（手动 + 定时），本地保留最近 5 份快照
- **PopClip 快捷写入（macOS）**：选中文字一键「记入快记」；设置页可生成/复制/清除访问令牌，并**直接下载内置令牌与当前服务地址的 `QuickNote.popclipextz`** 安装即用
- **设置**：外观与字体、「说明」安全提示（网络 / AI Key / 个人开发者勿生产部署）与「关于」（开发背景与声明、版本与运行信息、编译时间、协作开发工具、仓库链接、只读“检查更新”）
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
- **时间轴**：中心线交替节点悬浮预览、点击时间点或文字条目全屏查看；**随览**随机拾取；**回响**看历史上的今天（往年同月同日的记录）
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
| 升级 | `git pull && sudo bash deploy/update.sh --yes`（推荐；仅首次部署用 `install.sh`） |
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
cd /opt/quicknote && git pull
sudo bash deploy/update.sh          # 交互确认
sudo bash deploy/update.sh --yes    # 免确认
sudo bash deploy/update.sh --force  # 本地有未提交/领先时强制覆盖（谨慎）
```

脚本主流程（与 `install.sh` 分工：install=首次全量部署，update=增量更新，不触碰数据/用户/unit）：

1. **检测运行与版本**：服务是否在跑 + 本地 git 版本；
2. **拉取远端**并比对：落后/领先提交数、是否有未提交改动；
3. 非最新则校验后**停止服务** → `git merge --ff-only` 更新源码 → 按需构建重启；
4. 依赖变更时用 **`npm ci`**（严格按 `package-lock.json` 安装，**不会改写锁文件**，避免制造未提交改动）；
5. 源码变更时 `npm run build`，无变更自动跳过；
6. **代码已最新**时也会复查：若 `web/dist` 落后于源码（例如先 `git pull` 再跑本脚本）或进程仍是旧版，自动补构建并重启——杜绝“代码新、页面旧”；
7. 重启后**健康检查**，输出新版本与状态。

> 提示：本机被 `npm install` 回写过 `package-lock.json` 导致“未提交 有”时，先 `git checkout -- package-lock.json` 恢复即可。

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
│       ├── auth.js         # 敏感接口门控（本机回环 / QuickNote 令牌）
│       ├── db.js           # node:sqlite；content(净化HTML)+plain(纯文本) 双列存储
│       ├── routes/         # notes / tags / images / attachments / unfurl / ai / quickin / backup / update
│       └── backup/         # 本地快照 zip + WebDAV 上传
├── web/               # Vue 3 前端
│   ├── public/             # PWA 图标 / manifest
│   └── src/
│       ├── views/          # WriteView(录入) / TimelineView(时间轴) / SettingsView(设置)
│       ├── components/     # TipTapEditor / TagPicker / TimelineItem / MomentCard / FullNoteModal / AiExplore / RandomOverlay(随览) / LastYearOverlay(回响)
│       ├── embed.js        # 链接→嵌入组件（YouTube/Bilibili/Apple/网页卡）
│       ├── datecn.js       # 公历/农历/节日/节气 格式化
│       └── rich.js         # 净化与统计（DOMPurify）
├── extensions/popclip/ # PopClip 扩展（Config.yaml + 脚本 + .popclipextz 模板）
├── scripts/smoke.mjs  # Playwright 冒烟测试（桌面+移动）
├── deploy/            # install.sh 首次部署 / update.sh 智能更新 + systemd 单元示例
└── LICENSE            # MIT
```

## 📡 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notes?q=&tag=&sort=&order=&from=&to=` | 列表（`q` 对纯文本检索；`from/to` 为 YYYY-MM-DD 按创建日过滤） |
| POST | `/api/notes` | 新建 `{content: 净化 HTML, plain: 纯文本, tags[]}` |
| GET/PUT/DELETE | `/api/notes/:id` | 单条记录（PUT 同 POST 载荷） |
| GET | `/api/tags` | 标签与使用次数 |
| POST | `/api/tags` | 新增标签（录入页“＋标签”输入即默认入库），返回 `{name, created}` |
| DELETE | `/api/tags/:name` | 删除孤儿标签（未被任何笔记引用时才删除） |
| POST | `/api/images` | 图片上传（字段 `file`），返回 `/images/xxx` |
| POST | `/api/attachments` | 附件上传（任意格式、不限大小），返回 `{url,name,size}` |
| GET | `/api/unfurl?url=` | 抓取网页 Open Graph 元信息（标题/描述/封面），供链接卡片 |
| GET/PUT | `/api/ai/config` | AI 配置（Key 不回传，仅 `hasKey`） |
| GET | `/api/ai/key` | 读回已存 API Key（仅本机/有效令牌，供设置页核对） |
| POST | `/api/ai/test` | 测试 DeepSeek 连通性（可携带未保存的 `apiKey` 先行测试） |
| POST | `/api/ai/explore` | 纯文本溯源/扩展（`{text}` → `{content, reasoning}`，免责声明恒置末尾） |
| GET/PUT | `/api/quickin/config` | 快捷写入开关状态 |
| GET/POST/DELETE | `/api/quickin/token` | 查看 / 生成轮换 / 清除访问令牌（生成与清除需本机或有效令牌） |
| GET | `/api/quickin/extension` | 下载 `QuickNote.popclipextz`（按当前服务地址与令牌现场打包） |
| POST | `/api/quickin` | 快捷写入（PopClip 等外部工具）：`{text, tags?, source?}`（也支持表单）；可选令牌头 `X-QuickNote-Token` |
| GET/PUT | `/api/backup/config` | 备份配置 |
| POST | `/api/backup/run` | 立即备份（本地 zip + WebDAV 上传） |
| GET | `/api/update/meta` | 版本与运行信息（含各框架版本，供“关于”） |
| GET | `/api/update/status` | 本地 git 版本与环境能力（不访问网络） |
| POST | `/api/update/check` | 只读“检查更新”：`git fetch` 后比对本地/远端差异（不拉代码、不构建、不重启） |
| GET | `/api/health` | 健康检查 |

## 📄 许可

[<img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT" />](LICENSE)

## 🗺 开发计划

**已完成（含本期优化）**：

- 核心链路：所见即所得编辑器、图形化时间轴（时间点/文字均可点击打开）、随览、**回响（往年同月同日 / 历史上的今天）**
- 富内容：YouTube/Bilibili/Apple Music 内嵌与网页链接卡、图片与附件上传（任意格式/大小）
- 标签：新增即默认入库、曾用标签点选复用、孤儿标签清理
- AI 助手（可选）：DeepSeek 接入（`/api/ai/*`），编辑器「✨ AI 探索」做**溯源与扩展**、免责声明置尾、Key 本机保存可核对
- 草稿：输入即存，仅真正编辑且有内容才保存/恢复，同会话只提醒一次
- PopClip 快捷写入（[docs/popclip-plan.md](docs/popclip-plan.md)）：M1 `/api/quickin` 接收（JSON/表单、可选令牌）→ M2 snippet → M3 `.popclipextz` 打包；设置页可生成/复制/清除令牌并下载内置令牌的插件包
- 部署与运维：`install.sh` 全量部署 / `update.sh` 智能更新（npm ci + 按需构建、代码最新但产物落后时自动补构建重启、healthcheck）
- 设置页：「说明」安全提示与免责声明、「关于」开发背景与版本/运行信息、只读“检查更新”

**待办**：

- 多图批量上传、孤儿图片/附件清理
- 从备份恢复入口
- **规划：记录导出（图片 / PDF）** —— 单条或所选时间点导出为长图（微信/相册友好）或 A4 文稿（分页/页边距/字号），拟评估无头渲染与 `html2canvas + jsPDF` 的图文混排保真度
- 远端网页图片抓取到本地（当前仅存链接）
- 更多平台嵌入（腾讯视频 / 网易云 / Spotify 等）
- 法定节假日调休表、字体文件上传
- 一键更新“执行”（设置页直接拉取/构建/重启）——可行性已论证，检测接口已就绪，按安全策略暂只提供只读检测

## 🤝 致谢

本项目的需求梳理、设计与开发由开发者结合自身使用需求完成，并借助以下 AI 协作完成编码、测试与文档：

- **DeepSeek（deepseek-v4-flash / deepseek-v4-pro）** —— 产品方案、前端视觉与交互迭代、后端 API 与数据模型、自动化测试与部署脚本。
- **DeepSeek Harness** —— 提供开发运行的 Agent 环境与工具链，支撑从需求澄清、研发治理到仓库托管（GitHub）的完整流程。

---

<p align="center">本地优先的个人记录工具</p>
