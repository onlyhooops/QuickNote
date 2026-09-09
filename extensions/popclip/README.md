# PopClip「记入快记」扩展（M3 · package）

把选中文本一键写入本地「快记」服务并生成时间点。

## 安装（推荐 package）
1. 确保已安装 [PopClip](https://www.popclip.app/)（macOS）；
2. 双击 `QuickNote.popclipextz`（由 `QuickNote.popclipext/` 打包）→ PopClip 安装。

> 备选：snippet `QuickNote-记入快记.popcliptxt`（把内容全选，PopClip 提示安装）。
> 注意：snippet 是**极简纯文本版**（无排版/来源/令牌）；需要保留排版、自动附来源与令牌，请使用 package（`.popclipextz`）。

> 含 Shell 动作的扩展未签名，PopClip 安装时可能弹提示；自用可运行一次关闭：
> `defaults write com.pilotmoon.popclip LoadUnsignedExtensions -bool YES`（然后退出重启 PopClip）。

## 使用
任意应用中选中文本 → 点 PopClip 栏的「记入快记」→ 成功打勾，时间轴随即出现该时间点。

## 排版保留（网页富文本）
- 扩展开启了 PopClip 的 `captureHtml`：从网页摘抄时脚本会发送 `POPCLIP_HTML`（网页富文本），
  服务端白名单净化后保留**标题 / 加粗斜体 / 有序无序列表 / 引用 / 代码块 / 表格 / 链接**；
- 自动丢弃：图片、内联样式、网页 class/data 属性、脚本、iframe、复制按钮等噪音；
- 若你复制到的是 **Markdown 源码**（例如 GitHub 原文视图、Markdown 编辑器），在扩展设置里勾选
  「保留 Markdown 排版」，脚本改发 `POPCLIP_MARKDOWN`，服务端按 GFM 解析（含表格、代码块）；
- 上限：HTML ≤ 200KB、Markdown ≤ 100KB，超出自动回退为纯文本。

## 来源标注（网页摘抄自动附来源）
- 在**受支持的浏览器**（Safari / Chrome / Firefox / Edge 等）网页里摘抄时，PopClip 会提供
  `POPCLIP_BROWSER_URL` 与 `POPCLIP_BROWSER_TITLE`，脚本自动把它们发给 `/api/quickin`，
  记录末尾生成「来源 · 网页标题」**超链接**，便于回溯原文；
- 若内容来自**非网页**（邮件、App、桌面应用等），PopClip 不会提供网页 URL → **不标注来源**，
  只记录文本。

## 设置（可选）
PopClip → Extensions → 记入快记 → 齿轮：
- **服务地址**：默认 `http://127.0.0.1:3987`；
- **默认标签**：逗号分隔，如 `PopClip,摘抄`（可留空）；
- **访问令牌**（可选 secret）：若服务端配置了 `quickin.token`，填入以通过校验（发送 `X-QuickNote-Token`）；
- **保留 Markdown 排版**（开关，默认关）：关闭时保留网页富文本排版（推荐）；开启时按 Markdown 语法解析。

## 前置条件
- 「快记」服务已在本机运行（默认仅监听 `127.0.0.1`）。
- 服务默认仅监听 `127.0.0.1`；开放局域网前请在服务端 `server/data/config.json` 配置 `quickin.token`，并在本扩展填入「访问令牌」。

## 原理
- 动作类型：Shell Script（PopClip 的 JS 网络受 ATS 限制只能访问 `https:`，本地 http 需 shell + curl）。
- 调用：`POST /api/quickin`，正文经 stdin `--data-urlencode "text@-"` 传递（规避换行/转义问题）；
  排版字段 `html` / `markdown` 经临时文件 `--data-urlencode "html@文件"` 传递（含换行/引号也安全）；
  网页来源另附 `url`（页面地址）与 `title`（页面标题）；HTTP 2xx 即成功。
