# PopClip 快速笔记 · 接入设计（计划，未落地）

> 状态：**M1 已完成**（后端 `/api/quickin`：JSON 与表单、tags 数组/字符串、空/超长 400、令牌 403↔201、入库可检索）。**M2 已完成核心**：PopClip snippet（Shell+curl）已提供（`extensions/popclip/`），脚本逻辑本地实测 201 并入库；**待真机端到端验证**（macOS+PopClip 双击安装、选中文本点按）。M3 起待做。

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
- 新增 `POST /api/quickin`，body：`{ text: string, tags?: string[], source?: string }`（source 默认 `popclip`）。
- 行为：把 `text` 按行转 `<p>` 生成一条**纯文本时间点**（走既有"净化 HTML + plain"链路），tags 可选附加；返回 `{ id, created_at }`。
- 安全：服务默认绑定 `127.0.0.1` 天然限本机；预留可选 `X-QuickNote-Token` 头 + 服务端令牌配置，为将来开放局域网时兜底。不触发 AI/嵌入/附件。
- 校验：空文本 400；单次长度上限（如 8000 字符）；频率不做特殊限制（单用户）。

### B. PopClip 扩展（Shell Script 动作）
建议随仓库提供源码目录（供安装/分发），并附 README 说明：

- Config（package：`identifier`、`name: 记入快记`、`requirements:[text]`、options）：
  - `base url`：默认 `http://127.0.0.1:3987`；
  - `tags`：可选，逗号分隔的默认标签；
  - `access token`（secret，可选，留空则不发送）。
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
1. **M1** 后端 `POST /api/quickin`：手测（curl）→ 时间轴出现该时间点；空/超长校验；token 可选生效。
2. **M2** 最小 snippet：任意 app 选中文本 → PopClip「记入快记」→ 时间点生成、对勾。
3. **M3** package 化：图标/选项(base/tags/token)/多行文本验证/失败反馈；仓库内置安装说明。
4. **M4（可选）**：提交 PopClip 目录（需签名与 shell rationale）；否则保持自用免发布。

## 四、风险与对策
| 风险 | 对策 |
| --- | --- |
| Shell 注入/多行换行破坏命令 | 正文用 `--data-urlencode "text@-"`（stdin）传参，其余字段受控引用 |
| 未签名安装提示 | 文档说明 `LoadUnsignedExtensions`；自用可接受 |
| ATS 限制 JS 直连 http | 采用 Shell Script（无 ATS） |
| 端口被占用/服务未开 | 扩展报错提示"请先启动快记服务"（curl 非 2xx 即红 X） |
| 局域网开放后被乱写 | 预留 token 头；默认仅 127.0.0.1 |
