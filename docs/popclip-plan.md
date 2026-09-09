# PopClip 快速笔记 · 接入设计与落地记录

> 状态：**M1–M4 已完成**。M1 后端 `/api/quickin`（JSON 与表单、tags、空/超长 400、令牌 403↔201）；M2 snippet（`.popcliptxt`）；M3 package（`QuickNote.popclipext/` + `.popclipextz`，含图标、baseurl/tags/secret 令牌/排版方式选项）；**M4 排版保留**（`captureHtml` 捕获网页 HTML，服务端 `sanitize-html` 白名单净化，保留标题/列表/引用/代码块/**表格**，去图片与网页样式；Markdown 源码可选；HTML ≤ 200KB / Markdown ≤ 100KB 超限回退）。M5（发布到 PopClip 目录，需签名+shell rationale）可选。

## 一、调研结论：PopClip 扩展如何开发

来源：[PopClip Developer Docs](https://www.popclip.app/dev)（含 Markdown 镜像 `/dev/*.md`）、
[extensions 目录](https://www.popclip.app/extensions/categories/notes-and-knowledge-management)。

- **扩展形态**：两种
  - *snippet*：纯 YAML 文本（`# popclip` 头注释），可直接"从文本加载"，适合自用/极简；
  - *package*：`.popclipext` 目录（`Contents/Config.plist`/JSON + 图标 + 源码），可 `.popclipextz` 压缩、可签名发布。
- **动作类型**：JavaScript（推荐）/ AppleScript / Shell Script / URL / Key Press / Service / Shortcut。
- **JS 环境**：JavaScriptCore + 内置 `axios`/`XMLHttpRequest`/`Buffer` 等；`require()` 可加载包内文件或内置库；支持 TS（`@popclip/types`、npm `popclip`）；可本地测试：`/Applications/PopClip.app/Contents/MacOS/PopClip run file.js`。
- **输入**：选中文本经全局 `popclip` 对象或脚本变量获得；Shell/AppleScript 用 `POPCLIP_TEXT`、`POPCLIP_URLENCODED_TEXT`、`POPCLIP_BROWSER_URL`、`POPCLIP_APP_NAME`、`POPCLIP_OPTION_*` 等。

### 对本项目最关键的两条约束
1. **JS 网络仅限 `https:`**：macOS ATS 限制，`XMLHttpRequest`/`axios` 访问 `http://127.0.0.1` 会抛网络错误（需 `entitlements:[network]` 才能用网络，且仍只放行 https）。
2. **Shell Script 无 ATS 限制**：可用 `curl` 直连本地 `http://127.0.0.1:3987`，并拿到 `POPCLIP_TEXT` 等变量。
   → 本地 http 服务最适合用 **Shell Script 动作 + curl**，而非 JS。

> 参考：目录里的笔记类扩展多为连 SaaS(https)（Notion/Drafts/Day One/Obsidian 等）；Obsidian 类走本地 URI/唤起 app。我们没有本地原生 app，因此"Shell→curl→本地 API"是最直接路径。
> 自用注意：含 Shell 动作的**未签名**扩展安装时 PopClip 会提示；可执行 `defaults write com.pilotmoon.popclip LoadUnsignedExtensions -bool YES` 关闭（自用可接受）。

## 二、选定方案

### A. 快记侧（后端小接口，先做）
- 新增 `POST /api/quickin`，body：`{ text, html?, markdown?, tags?, source?, url?, title? }`（source 默认 `popclip`）。
- 行为：排版优先级 **html → markdown → text**；净化后入库（`plain` 由净化 HTML 派生），tags 可选附加；返回 `{ id, format, created_at }`。
- 来源：`url`/`title` 合法（http(s)）时在记录末尾追加「来源 · 标题」超链接；非网页来源不标记。
- 安全：服务默认绑定 `127.0.0.1` 天然限本机；可选 `X-QuickNote-Token` 头 + 服务端令牌配置；HTML/Markdown 一律经服务端白名单净化（见 M4）。不触发 AI/嵌入/附件。
- 校验：无内容 400；纯文本 8000 字符、HTML 200KB、Markdown 100KB，超限自动回退纯文本。

### B. PopClip 扩展（Shell Script 动作）
建议随仓库提供源码目录（供安装/分发），并附 README 说明：

- Config（package：`identifier`、`name: 记入快记`、`requirements:[text]`、`captureHtml: true`、options）：
  - `baseurl`：默认 `http://127.0.0.1:3987`；
  - `tags`：可选，逗号分隔的默认标签；
  - `token`（secret，可选，留空则不发送）；
  - `format`（multiple：`html` / `markdown`，默认网页富文本）：选 Markdown 源码时解析 `POPCLIP_MARKDOWN`。
- 动作类型：`shell script`；脚本核心（注意防注入/多行）：
  ```sh
  # 用 stdin 传正文，避免 shell 元字符/换行破坏参数
  code="$(printf '%s' "$POPCLIP_TEXT" \
    | /usr/bin/curl -s -o /dev/null -w '%{http_code}' -X POST \
        "$POPCLIP_OPTION_BASE_URL/api/quickin" \
        --data-urlencode "text@-" \
        --data-urlencode "tags=$POPCLIP_OPTION_TAGS")"
  [ "$code" = "201" ] || [ "$code" = "200" ] || exit 1
  ```
- 成功后 PopClip 显示对勾；失败红色 X。
- 分发：本地 `QuickNote.popclipext`（或 `.popcliptxt` snippet）双击/粘贴安装；文档说明未签名提示处理。

## 三、验收里程碑
1. **M1 ✅** 后端 `POST /api/quickin`：手测（curl）→ 时间轴出现该时间点；空/超长校验；token 可选生效。
2. **M2 ✅** 最小 snippet：任意 app 选中文本 → PopClip「记入快记」→ 时间点生成、对勾。
3. **M3 ✅** package 化：图标/选项(base/tags/token)/多行文本验证/失败反馈；仓库内置安装说明；设置页可下载内置令牌的 `.popclipextz`。
4. **M4 ✅ 排版保留**：`captureHtml: true` → 发送 `POPCLIP_HTML`；服务端白名单净化（`sanitize-html`）保留标题/加粗斜体/列表/引用/代码块/表格/链接，丢弃图片、内联样式、class、脚本、iframe、复制按钮；`div` 包装保留、空壳清理、相对链接按页面 URL 补全；Markdown 源码走 `format` 选项（`marked` GFM）；HTML ≤ 200KB / Markdown ≤ 100KB 超限回退纯文本；表格已加入前端 DOMPurify 白名单与 Tiptap 表格扩展。
5. **M5（可选）**：提交 PopClip 目录（需签名与 shell rationale）；否则保持自用免发布。

## 四、风险与对策
| 风险 | 对策 |
| --- | --- |
| Shell 注入/多行换行破坏命令 | 正文用 `--data-urlencode "text@-"`（stdin）；HTML/Markdown 走临时文件 `--data-urlencode "html@文件"` |
| 网页 HTML 携带 XSS（脚本/事件/iframe） | 服务端 `sanitize-html` 白名单二次净化；`nonTextTags` 丢弃 script/style/button/iframe 等；链接仅 http(s)/mailto |
| 网页样式/class 串入快记 | 净化时剥离 `style`/`class`/`data-*`/`on*`；图片按需求直接丢弃 |
| 超长内容撑爆记录/编辑器 | HTML ≤ 200KB、Markdown ≤ 100KB，超限自动回退纯文本（8000 字符） |
| 未签名安装提示 | 文档说明 `LoadUnsignedExtensions`；自用可接受 |
| ATS 限制 JS 直连 http | 采用 Shell Script（无 ATS） |
| 端口被占用/服务未开 | 扩展报错提示"请先启动快记服务"（curl 非 2xx 即红 X） |
| 局域网开放后被乱写 | 预留 token 头；默认仅 127.0.0.1 |
