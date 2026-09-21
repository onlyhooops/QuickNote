# 自托管字体分片（自动生成，请勿手改）

这些目录由 `npm run fonts:gen`（见 `scripts/gen-fonts.mjs`）生成，随仓库入库，
部署时由 Node 静态托管（`/fonts/*`，带长期缓存），**不依赖用户系统字体、不依赖网络**。

| 目录 | 字体 | 字重 | 分片 | 体积 | 用途 |
| --- | --- | --- | --- | --- | --- |
| `wenkai-regular/` | 霞鹜文楷 Regular | 400 | 318 | 12.5MB | 楷体 · 正文 |
| `wenkai-medium/` | 霞鹜文楷 Medium | 700 | 326 | 12.9MB | 楷体 · 粗体/标题（真实 Medium 字重，非浏览器合成粗体） |

## 为什么要整字体自己切，而不是用现成的预切包

第三方预切字体包（如 `lxgw-wenkai-webfont`、`@hanzi.pro/webfonts-lxgw-wenkai`）实测会丢字：
对 GB2312 缺 33 字（劐、阢、坶、塥…）。本项目直接从官方字体切片并用 `npm run fonts:check`
做覆盖率硬校验，保证不出现缺字导致的显示异常。

## 许可

只收录「许可明确允许再分发 **且** 允许子集化/转格式」的字体，逐条核实记录见
[`docs/font-selfhost-research.md`](../../../docs/font-selfhost-research.md)。

- 霞鹜文楷 Regular：SIL Open Font License 1.1（OFL-1.1）；各目录附 `LICENSE.txt` 许可原文。
- 霞鹜文楷 Medium：SIL Open Font License 1.1（OFL-1.1）；各目录附 `LICENSE.txt` 许可原文。

⚠️ 反例（**不要**再加入）：阿里妈妈刀隶体、三极隶书、临海隶书等「免费商用」字体，
其法律声明明文禁止「拆分、转换、修改或二次创作」，也未授予再分发权；
微软/中易 SimKai、SimLi 与华文 STKaiti、STLiti 等专有字体同样禁止自托管。
