# PopClip「记入快记」扩展（M3 · package）

把选中文本一键写入本地「快记」服务并生成时间点。

## 安装（推荐 package）
1. 确保已安装 [PopClip](https://www.popclip.app/)（macOS）；
2. 双击 `QuickNote.popclipextz`（由 `QuickNote.popclipext/` 打包）→ PopClip 安装。

> 备选：snippet `QuickNote-记入快记.popcliptxt`（把内容全选，PopClip 提示安装）。

> 含 Shell 动作的扩展未签名，PopClip 安装时可能弹提示；自用可运行一次关闭：
> `defaults write com.pilotmoon.popclip LoadUnsignedExtensions -bool YES`（然后退出重启 PopClip）。

## 使用
任意应用中选中文本 → 点 PopClip 栏的「记入快记」→ 成功打勾，时间轴随即出现该时间点。

## 设置（可选）
PopClip → Extensions → 记入快记 → 齿轮：
- **服务地址**：默认 `http://127.0.0.1:3987`；
- **默认标签**：逗号分隔，如 `PopClip,摘抄`（可留空）；
- **访问令牌**（可选 secret）：若服务端配置了 `quickin.token`，填入以通过校验（发送 `X-QuickNote-Token`）。

## 前置条件
- 「快记」服务已在本机运行（默认仅监听 `127.0.0.1`）。
- 服务默认仅监听 `127.0.0.1`；开放局域网前请在服务端 `server/data/config.json` 配置 `quickin.token`，并在本扩展填入「访问令牌」。

## 原理
- 动作类型：Shell Script（PopClip 的 JS 网络受 ATS 限制只能访问 `https:`，本地 http 需 shell + curl）。
- 调用：`POST /api/quickin`，正文经 stdin `--data-urlencode "text@-"` 传递（规避换行/转义问题），HTTP 2xx 即成功。
