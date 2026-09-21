# 中文字体授权与技术调研报告：自托管「楷体 / 隶书」选项

> 调研对象：自托管中文笔记 Web 应用（Vue3 + Node/Express，`dist` 由 Node 静态托管，离线/PWA）
> 目标：新增**楷体**与**隶书**两个字体选项，**完整字体包随应用自托管**（不依赖用户系统字体），中文用该字体、英文/数字/符号保持默认字体，macOS / Windows / Linux / 移动端渲染一致。
> 调研日期：2026-09（所有版本号、体积、覆盖数据均为本次实测或官方页面核对结果；标注「实测」的数据由本报告作者下载字体文件后用自写 cmap 解析器逐字统计得出。）

---

## 0. 结论摘要（TL;DR）

| 结论 | 说明 |
|---|---|
| 楷体：**有干净的 OFL 方案** | 首选 **霞鹜文楷 GB / LXGW WenKai GB**（SIL OFL 1.1），含《通用规范汉字表》8105 字、覆盖 GB18030-2022 实现级别 2；次选 **全字庫正楷體 TW-Kai**（OGDL 1.0，与 CC-BY-4.0 兼容），覆盖 39,186 码位、GB2312/GBK 与 CJK 扩展 A 全部命中，但字形为台湾标准、单字重。 |
| 隶书：**截至 2026-09，不存在覆盖 8105 字的开源/可再分发隶书** | 全字库系列只有正楷体/正宋体，没有隶书；文鼎（Arphic）免费 PL 系列 6 款全无隶书；Google Fonts 无隶书；中文网字计划 cn-fontsource 收录的 **80 款字体里 0 款隶书**；GitHub 上的隶书项目要么无 LICENSE 文件，要么仅 1,000 字。 |
| 隶书：真正可合法随应用打包的只有 2 款，且都有硬伤 | **青柳隷書しも**（© SIMO，官方说明明文允许免费再分发，但简体仅覆盖 GB2312 的 4,402/6,763）与 **教育部隸書 v3.0**（CC BY-ND 3.0 TW，**禁止改作 → 不能子集化**，且简体仅 3,074/6,763）。 |
| 所有系统自带「楷体/隶书」**一律不可打包** | 微软官方 FAQ 明文禁止把 Windows 字体自托管到 Web 服务器、禁止转换为 WOFF/WOFF2、禁止嵌入 App。SimKai（中易楷体）、SimLi（中易隶书）、STKaiti/STLiti（华文楷体/隶书）、方正、汉仪、三极同属此类。 |
| 体积优化：**cn-font-split 按 unicode-range 分片是唯一可行路线** | 实测 12.5 MB 中文字体切成 **222 片 WOFF2**（合计 7.69 MB，中位 38.3 KB/片）；浏览器只下载页面实际用到的字符所在分片，一页 500 个不同汉字约需 5–8 片 ≈ 250–350 KB。整包 WOFF2（不分片）为 4.65–7.14 MB，首屏不可接受。 |
| Node 端有纯 JS/WASM 方案 | `cn-font-split` 支持 `wasm32-wasip1` 模式；`subset-font` 基于 harfbuzzjs（WASM）纯 JS 可跑；`fontmin` 为纯 JS。**只有 `glyphhanger` 依赖 Python 的 pyftsubset**。 |

---

## 1. 候选字体清单

### 1.1 楷体候选

所有体积为实测下载文件字节数（MiB）；「覆盖」列中 GB2312/GBK 为本报告作者用字体 cmap 逐字比对结果。

| # | 字体名（中/英） | 来源 / 作者 | 官网 / 下载 | 许可证 | 覆盖（实测） | 字重 | 格式 / 体积 | 已知问题 |
|---|---|---|---|---|---|---|---|---|
| K1 | **霞鹜文楷 GB** / LXGW WenKai GB（及 LXGW WenKai / Lite / TC / Screen） | LXGW 落霞孤鹜；衍生自 FONTWORKS（今 Monotype KK）**Klee One** | [GitHub](https://github.com/lxgw/LxgwWenKai) · [GB 版](https://github.com/lxgw/LxgwWenkaiGB) · [猫啃网](https://www.maoken.com/freefonts/9704.html) | **SIL OFL 1.1**（GNOME/OFL 标准文本） | 完整版覆盖 CJK 基本区 20992 + 扩展 A 6592；GB 版含 GB18030-2022 实现级别 2 全部汉字，[网络仓库 README](https://github.com/CMBill/lxgw-wenkai-web) 明确写「包含《通用规范汉字表》8105 个汉字」。实测 **TC 版**：22,401 码位，GB2312 **6763/6763**、GBK 15,428/20,902、扩展 A 740、扩展 B 811 | 3（Light / Regular / Medium，另有 Mono 与 Bold 映射） | TTF / WOFF2；完整版 Regular **24.39 MB**、Light 26.96 MB；**Lite 版 Regular 13.23 MB**；GB 版 Regular 24.62 MB | 非专业设计师作品：Medium 字重部分字轮廓有毛刺、Light 有飞点、部件拼接生硬；**加字通道已关闭**；OFL 保留名称「霞鹜/LXGW」，衍生改名受限（但**官方明文允许为 Web 渲染目的做子集化/格式转换且无需改名的特例**，见 [README 授权章节](https://github.com/lxgw/LxgwWenKai)） |
| K2 | **全字庫正楷體** / TW-Kai（CNS11643） | 台湾行政院（RDEC/国发会）全字库项目 | [cns11643.gov.tw](https://www.cns11643.gov.tw/) · [Debian 包](https://packages.debian.org/sid/fonts-cns11643-kai)（`fonts-cns11643-kai`） | **OGDL-TW-1.0**（政府資料開放授權條款第 1 版，Debian 版权文件注明 *compatible with CC-BY-4.0*） | 实测 `TW-Kai-98_1.ttf`：**39,186 码位**，CJK 基本区 20,920、扩展 A 6,582、**GB2312 6763/6763、GBK 20,902/20,902**；`TW-Kai-Ext-B` 另含 **42,711 个扩展 B 字**；`TW-Kai-Plus` 24,529 码位 | 1 | TTF；主文件 **35.12 MB**、Ext-B **43.62 MB**、Plus **23.72 MB** | 字形为**台湾教育部标准（繁体字形习惯）**，简体字以台湾写法呈现（如「骨」「温」「直」等），与大陆规范字形有观感差异；单字重；原始体积巨大（依赖子集化）；使用须署名「国家发展委员会」 |
| K3 | **芫荽** / Iansui | ButTaiwan（基于 Klee One 改造的台湾教育标准字形） | [GitHub](https://github.com/ButTaiwan/iansui) · [Google Fonts](https://fonts.google.com/specimen/Iansui) | **SIL OFL 1.1** | 实测：12,639 码位，CJK 基本区 9,992、**GB2312 仅 4,463/6,763（缺 2,300）** | 1 | TTF **8.98 MB**（发布 zip 4.58 MB）/ WOFF2 | **面向繁体**，简体缺字严重，不适合简体笔记正文；可由 Google Fonts CDN 直接取用 |
| K4 | **Klee One**（クレー One） | FONTWORKS | [GitHub](https://github.com/fontworks-fonts/Klee) | **SIL OFL 1.1** | 日文教科书体，JIS 为主；简体字基本不含 | 2（Regular / SemiBold） | TTF 8.32 / 8.49 MB | 日文字形，简体中文会大面积 tofu；作为上游血统参考 |
| K5 | **馬善政毛筆楷書** / Ma Shan Zheng | 钟齐字库（Google Fonts 收录） | [Google Fonts](https://fonts.google.com/specimen/Ma+Shan+Zheng) · [google/fonts](https://github.com/google/fonts/tree/main/ofl/mashanzheng) | **SIL OFL 1.1** | 实测：7,015 码位，**GB2312 6763/6763**，**扩展 A 0/31、繁体 0/17** | 1 | TTF **5.59 MB** / WOFF2 | 毛笔楷书风格，**无繁体、无生僻字**；作正文可读性差，适合标题 |
| K6 | **ZCOOL 小薇 / ZCOOL XiaoWei** | 站酷（Google Fonts） | [google/fonts](https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei) | **SIL OFL 1.1** | 实测：7,016 码位，GB2312 6763/6763，扩展 A 0，繁体 0 | 1 | TTF **6.02 MB** | 宋楷之间，非纯楷；无繁体无生僻字 |
| K7 | **悠哉字体 / Yozai**、**小赖字体 / Xiaolai**、**玄冬楷书**、**程荣光刻楷**、**月星楷**、**原俠正楷** | 多位独立作者 | [中文网字计划字体库](https://chinese-font.netlify.app/)（cn-fontsource，各字体 id：`yozai`、`xiaolai`、`xuandongkaishu`、`crgkk`、`moon-stars-kai`、`GuanKiapTsingKhai`） | 多为 OFL 1.1 或「作者声明」（需逐款核对上游仓库） | 未逐一实测；均以常用字为主，繁体/生僻字覆盖不一 | 1 | 已有现成 WOFF2 分片包（可直接取 CDN 或自建镜像） | 授权信息在 cn-fontsource 索引里为 `null`，**上架前必须逐款回到作者仓库核对 LICENSE** |
| K8 | **文鼎 PL 中楷 / AR PL KaitiM GB / UKai** | 文鼎科技（Arphic） | [Debian `fonts-arphic-gkai00mp` / `ukai`](https://packages.debian.org/sid/fonts-arphic-ukai) | **Arphic Public License（APL）** | 仅 GB（早期 GB2312 量级）或 Big5；年代久远 | 1 | TTF | 字形陈旧、hinting 差、笔形粗糙；但 **APL 明确允许修改与再分发**（见 §3.5），是唯一「可作为自研隶书法律底座」的楷体字源 |
| ❌ | **教育部標準楷書** | 台湾教育部 | [官方页](https://language.moe.gov.tw/material/info?m=9fe3fe82-8bbf-44c0-961d-873ea079e284) | **CC BY-ND 3.0 TW（姓名標示-禁止改作）** | 官方称 13,084 字 | 1 | TTF（zip 8.08 MB） | **禁止改作 → 子集化属改作，不能用于 unicode-range 分片方案**；Debian 因此把它放在 [non-free](https://packages.debian.org/sid/fonts-moe-standard-kai) |

### 1.2 隶书候选

| # | 字体名（中/英） | 来源 / 作者 | 官网 / 下载 | 许可证 | 覆盖（实测） | 字重 | 格式 / 体积 | 能否随应用打包 |
|---|---|---|---|---|---|---|---|---|
| L1 | **青柳隷書しも** / Aoyagi Reisho Shimo | 书法：青柳衡山；字体化：**SIMO** | [opentype.jp/aoyagireisho.htm](http://opentype.jp/aoyagireisho.htm) | 随包《フォントの使用方法.txt》原文：*「無料フォントです。使用にあたっての条件は何もありません。商用使用もＯＫです」*；*「無料でどこにでも配布することができます。ただし、再配布にあたって有料とすることはできません」*；再分发须随附「フォントの使用方法」与「フォントの解説」 | 实测：14,963 码位，CJK 基本区 12,204，**GB2312 仅 4,402/6,763（缺 2,361）**，扩展 A/B = 0，繁体样例 15/16 | 1 | TTF **4.21 MB**（官方 zip 3.19 MB）/ 另有 OTF | ✅ **可（免费再分发，不得就再分发收费）**；⚠️ 简体缺字率约 35%，且修订/子集化未被条文明确允许 |
| L2 | **教育部隸書 v3.0** | 台湾教育部 | [官方页](https://language.moe.gov.tw/material/info?m=9fe3fb11-c3d5-41f2-b029-6d18a2c2fd0d) | **CC BY-ND 3.0 TW（姓名標示-禁止改作）** | 官方称 4,808 字；实测 **5,594 码位**，CJK 基本区 4,827，**GB2312 仅 3,074/6,763（缺 3,689，如「万丌与专业丛东丝两严丧…」）**，扩展 A/B = 0，繁体样例 16/17 | 1 | TTF **5.00 MB**（zip 3.22 MB） | ❌ **不可**：禁止改作 → 不能子集化/不能转 WOFF2 后改造；且简体几乎不可用（Debian 判为 [non-free](https://packages.debian.org/sid/fonts-moe-standard-kai)） |
| L3 | **清骨隸 / Qinggu Li** | IIzzaya 等（2026-09 新项目） | [GitHub](https://github.com/IIzzaya/project-qing-font) | **Arphic Public License** | 仅 **1,000 个不重复汉字**（繁体）/ 994（简体），含《千字文》全文 | 1 | TTF + WOFF2 | ⚠️ 法理上允许（APL 允许修改与再分发），但**只有 1000 字**，当笔记正文＝大面积 tofu，只能当标题装饰 |
| L4 | **曺全碑隸 / CoQuBeLi** | MY1L | [GitHub](https://github.com/MY1L/CoQuBeLi) | ⚠️ **仓库无任何 LICENSE 文件**（GitHub API `license: null`） | 仅曹全碑出现字，约千字量级 | 1 | TTF / OTF | ❌ **不可**：作者自称「开源」但未附许可证，默认「保留所有权利」；法律上等同于专有字体 |
| L5 | **阿里妈妈刀隶体** | 淘宝（中国）软件有限公司 | [iconfont](https://www.iconfont.cn/) · [fonts.alibabagroup.com](https://fonts.alibabagroup.com/) | 「永久免费正版商用」声明 | 官方说明：**6,763 汉字（GB2312）+ 52 西文 + 227 标点 = 7,042 字符** | 1 | OTF / TTF，包 **约 14.6 MB** | ❌ **不可**：许可明文禁止「新增、**拆分**、修改或以其他方式进行二次创作」，且只授权使用、**未授予再分发权**；子集化 + 分发给浏览器用户属于高风险 |
| L6 | **三极隶书简体 / 三极曹全碑隶书简** | 广州三极信息科技 | [sjtype.com](https://www.sjtype.com/) · [字体网页面](https://www.mianfeiziti.com/fontlists-967978.htm) | 三极字库用户许可协议 | 未公开逐字覆盖 | 1 | TTF | ❌ **不可**：协议 4.2/4.3/4.4 明文「不得…向公众发行或通过…网络传播本字库软件」「未经书面许可不得使用于网络及多用户环境」 |
| L7 | **临海隶书** | 临海市社发集团 × 乡立方 | [猫啃网](https://www.maoken.com/freefonts/20208.html) | 「作者声明」（企业、个人均可免费商用） | 未公开逐字覆盖 | 1 | TTF | ❌ **不建议**：作者声明只覆盖「使用」，未授予再分发/嵌入/子集化权利 |
| L8 | **猫啃云昭隶书** | 猫啃网 | [猫啃网](https://www.maoken.com/gratuity/%e7%8c%ab%e5%95%83%e4%ba%91%e6%98%ad%e9%9a%b6%e4%b9%a6) | 收费（59 元下载费）+「免费商用」 | 未公开 | 1 | TTF | ❌ **不可**：付费获取 + 无再分发条款 |
| ❌ | **中易隶书 LiSu（SIMLI.TTF）** | 北京中易电子（ZYEC） | 随 Windows / Office 分发 | 专有，**All rights reserved** | GB2312 量级 | 1 | TTF | ❌ 见 §1.3 |
| ❌ | **华文隶书 STLiti / 华文楷体 STKaiti** | 常州华文（Changzhou SinoType） | 随 macOS / Office 分发 | 专有，`Copyright (c) 1991-1998, Changzhou SinoType Technology Co., Ltd. All rights reserved.`（[MS Typography](https://learn.microsoft.com/en-us/typography/font-list/stkaiti)） | — | 1 | TTF | ❌ 见 §1.3 |
| ❌ | **方正隶书 / 方正楷体**、**汉仪中隶书 / 汉仪中楷**、**白舟隷書** | 各字库厂商 | — | 商业授权（免费试用版仅限个人非商业） | — | — | — | ❌ 见 §1.3 |

### 1.3 专有字体「可否随应用打包」结论表（**结论：全部不可**）

| 字体 | 权利人 | 官方依据 | 结论 |
|---|---|---|---|
| SimKai / KaiTi（楷体） | 北京中易电子（ZYEC） | [MS Typography KaiTi](https://learn.microsoft.com/en-us/typography/font-list/kaiti)：`Copyright © Beijing ZhongYi Electronics Co., 1995-2005, All rights reserved`，font vendor = ZYEC | ❌ 不可打包 |
| SimLi / LiSu（隶书） | 北京中易电子（ZYEC） | 随 Windows/Office 分发；[MS Font FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)：「**You do not have rights to: copy fonts from a Windows installation to a web server, a process known as web font 'self-hosting'; convert the font to the formats typically associated with web fonts, such as the WOFF or WOFF2 format**」 | ❌ 不可打包 |
| STKaiti（华文楷体）、STLiti（华文隶书） | 常州华文 SinoType（经 Microsoft/Apple 分发） | 同上；且 FAQ 明确：「**If I convert the font into a bitmap font can I include that in my game or app? No, converting Windows fonts to other formats does not change the rules around embedding or redistribution, and format conversion itself is not allowed**」 | ❌ 不可打包 |
| 方正楷体 / 方正隶书 | 北京北大方正电子 | [方正字库知识产权用户许可协议](https://www.foundertype.com/index.php/about/powerAllowPro.html)；[个人非商业版](https://www.foundertype.com/index.php/About/powerPer) 仅授权「个人、非商业目的使用」 | ❌ 不可打包（须购买嵌入式/网页字体授权） |
| 汉仪楷体 / 汉仪中隶书 | 北京汉仪创新科技 | [《汉仪字库个人非商用须知》](https://www.hanyi.com.cn/coupon/faq-doc-1)：不得「将许可字库或其中的字体加载到您或第三方经营的产品中」 | ❌ 不可打包 |
| 三极隶书 / 三极曹全碑隶书 | 广州三极信息科技 | [用户许可协议](https://www.sjtype.com/grxy.html) 第 4.1–4.4 条 | ❌ 不可打包 |

> **一句话**：所有「系统自带/字库厂商的楷体、隶书」都只授权**在其被授权的载体上使用**，没有任何一款允许你把字体文件（或它的子集/WOFF2）复制到自己的服务器再分发给浏览器。要合规只有两条路：**用 OFL/OGDL/APL 等自由许可字体**，或**向厂商购买网页字体（Web Font）/嵌入式授权**。

---

## 2. 隶书专项结论与替代策略

### 2.1 逐条核实结果：开源隶书到底有没有？

| 渠道 | 核实结果 | 证据 |
|---|---|---|
| **全字库系列（CNS11643）** | ❌ 无隶书。只有**正楷體 TW-Kai**、**正宋體 TW-Sung**、点阵字型 | [全字庫授權页](https://www.cns11643.gov.tw/pageView.jsp?ID=59)、[Debian `fonts-cns11643`](https://packages.debian.org/sid/fonts-cns11643-kai) 文件清单只有 TW-Kai / Ext-B / Plus |
| **教育部字体（楷書/隸書/宋體）** | ⚠️ 有隶书，但 **CC BY-ND 3.0 TW（禁止改作）**，简体覆盖 3,074/6,763 | [教育部隸書字型檔](https://language.moe.gov.tw/material/info?m=9fe3fb11-c3d5-41f2-b029-6d18a2c2fd0d)；Debian 归入 non-free |
| **Arphic / 文鼎系列** | ❌ 无隶书。免费 PL 系列共 6 款：AR PL Mingti2L Big5、KaitiM Big5、SungtiL GB、KaitiM GB、UKai、UMing | Debian 包 `fonts-arphic-{bkai00mp,bsmi00lp,gbsn00lp,gkai00mp,ukai,uming}`，无隶书 |
| **Google Fonts CJK 书法字体** | ❌ 无隶书。书法类只有 Ma Shan Zheng（毛笔楷）、Zhi Mang Xing / Long Cang（行书）、Liu Jian Mao Cao（草书）、ZCOOL XiaoWei / QingKe HuangYou | 逐款核对 [google/fonts `ofl/`](https://github.com/google/fonts/tree/main/ofl)，并实测其 cmap |
| **中文网字计划 cn-fontsource** | ❌ **80 款字体中 0 款隶书**。最接近的书法体只有「峄山碑篆体」（小篆） | 解析 [index.json](https://github.com/KonghaYao/chinese-free-web-font-storage) 全量字体名单 |
| **GitHub 开源隶书项目** | ❌ 几乎为零。搜索 `隶书 font`、`lishu font`、`clerical script font` 命中仓库数 ≤ 3，唯一相关的 `CoQuBeLi` **无 LICENSE 文件**，`project-qing-font`（清骨隸）用 APL 但只有 1,000 字 | GitHub Search API 结果 + 两个仓库的 LICENSE 检查 |
| **猫啃网免费商用字体的 OFL 标签** | ❌ OFL 标签下无隶书 | [猫啃网 OFL 标签页](https://www.maoken.com/tag/ofl) |
| **日文免费隶书** | ⚠️ 只有「青柳隷書しも」明文允许免费再分发（简体缺字 35%）；白舟書体（白舟隷書）等商业厂商的免费字体授权范围限于个人使用、商用与嵌入需另行购买，**其具体条款以其官网「使用許諾」页为准** | [opentype.jp](http://opentype.jp/aoyagireisho.htm) 随包授权说明（`フォントの使用方法.txt`）；[白舟書体 使用許諾](https://hakusyu.com/licensing.htm)（本次未能抓取正文，使用前须自行核对） |
| **DejaVu / GNU FreeFont / Noto / 思源 / 花园字体 / IPA / Takao** | ❌ 均无隶书字面 | 各项目字面清单 |

**结论：截至 2026-09，不存在任何采用 OFL / OGDL / APL 等自由许可、且覆盖《通用规范汉字表》8105 字（或至少 GB2312 全量）的隶书字体。** 这不是「没找到」，而是「确实不存在」——上面 9 条渠道已覆盖中文开源字体生态的全部主要来源。

### 2.2 可行的替代策略（按推荐度排序）

| 方案 | 做法 | 缺字风险 | 跨平台一致性 | 授权风险 |
|---|---|---|---|---|
| **方案 A（推荐）：自托管「青柳隷書しも」+ 隶书选项标注为「繁/常用字优先」，缺字回退到自托管楷体** | `font-family` 栈：`"AoyagiReishoShimo", "LXGW WenKai GB", <默认西文/黑体>`。隶书只铺简体常用的 4,402 个字，其余字落到**自托管的 LXGW WenKai GB**（而不是系统字体） | 中：简体 GB2312 缺 2,361 字（约 35%）、三级字/生僻字全缺；但回退目标在同一台服务器上、跨平台一致，不会出现「有的机器是隶书有的机器是黑体」的观感断裂（而是「有的字是隶书有的字是楷体」） | ✅ 一致（回退字体也自托管） | 低-中：官方说明允许免费再分发；须①随包附带「フォントの使用方法」「フォントの解説」两份文档，②不得就字体再分发收费（免费自托管笔记应用满足）。子集化未被明文允许也未被禁止，**建议保留完整 TTF/WOFF2 不做裁剪以最小化风险** |
| **方案 B：系统隶书优先 + 自托管楷体回退（混合）** | `font-family: "STLiti", "LiSu", "隶书", "LXGW WenKai GB", …`——装了系统隶书的机器用真隶书，其余用自托管楷体 | 低（Windows/macOS 有隶书） | ❌ **不一致**：macOS 得华文隶书、Windows 得中易隶书、Linux/Android/iOS 完全无隶书 → 落到楷体。**与本项目「三端一致渲染」的硬要求直接冲突**，只适合作为「用户可选、且能接受差异」的妥协方案 |
| **方案 C：只上「常用 3500 / 6763 字子集」的隶书** | 用 L1 或 L5 做 3500/6763 子集 | 高：即使用最全的 L1，其本身就是简体缺字，子集化只会更差；L5 授权禁止拆分 | ✅（若可自托管） | L1 尚可；**L5/L6/L7/L8 授权不允许拆分或再分发 → 不可行** |
| **方案 D：把「隶书」选项改为「楷书 / 行楷」** | 隶书入口改名为「楷体（书法）」，用 K1/K5/K6 实现 | 无 | ✅ | 无 | 最稳妥，但**不满足用户对「隶书」的诉求** |
| **方案 E（长期）：基于 APL 字源自制/委托制作开源隶书** | 以 Arphic PL 的 AR PL KaitiM GB / UKai 为骨架（APL §2 明确允许「modifying glyph, reordering glyph, converting format, changing font name, or adding/deleting some characters」），用 `fontTools`/`fontmake` 做骨架形变，产出 OFL 或 APL 隶书并开源 | 取决于补字量 | ✅ | ✅ (APL 要求修改版「Freely Available」，把它开源即满足；参考 [清骨隸](https://github.com/IIzzaya/project-qing-font) 的工程做法) | 成本最高，但这是唯一能同时满足「8105 全覆盖 + 自托管 + 一致渲染」的终局方案 |
| **方案 F：向方正/汉仪购买 Web Font / 嵌入式授权** | 商业授权后随应用分发 | 无 | ✅ | 💰 需付费；且授权通常按域名/装机量计费，自托管分发需专门谈判 | 适合有预算的商业项目 |

> **不建议**：用 CSS `transform: skew()` / `scaleX()` 模拟隶书扁平感来「伪造隶书」——会破坏字重、标点位置与字形结构，且在不同引擎下渲染差异极大。

---

## 3. 自托管与体积优化技术方案

### 3.1 工具对比

| 工具 | 最新版本（本报告实测 npm registry） | 许可 | 引擎 | Node 端纯 JS/WASM？ | 自动 unicode-range 分片？ | 说明 |
|---|---|---|---|---|---|---|
| **cn-font-split** | **7.4.3**（2026-06-12） | Apache-2.0 | Rust（原生 FFI 动态库，或 `wasm32-wasip1`） | ✅ 有 Wasm 模式 | ✅ **开箱即用** | 中文网字计划的官方分包引擎；实测构建极快（5–35 MB 字体 1.5–5 秒）；默认会去 GitHub 下载原生动态库，国内可用环境变量 `CN_FONT_SPLIT_GH_HOST` 走代理；CLI 名 `cn-font-split` |
| **vite-plugin-font** | **5.1.2**（2025-06-07） | Apache-2.0 | 同上（封装 cn-font-split） | ✅ | ✅ | 官方 Vite/Nuxt/Next/Webpack/Rspack 插件；`scanFiles` 可扫描源码里用到的字符做「首屏极小化」子集；支持 `?subsets&key=` 按页面维度分区 |
| **fontmin** | **1.1.1**（2025-08-13） | MIT | fonteditor-core（纯 JS）+ ttf2woff2 | ✅ | ❌（需自己按 unicode-range 写循环） | 百度 EFE 出品；`Fontmin.glyph({text})` 做单次子集，`ttf2woff2()` 转 WOFF2；适合「代码里固定文案」的静态子集 |
| **subset-font** | **2.9.0**（2026-09-20） | BSD-3-Clause | **harfbuzzjs（HarfBuzz 的 WASM 构建）** | ✅ 纯 JS/WASM，无原生依赖 | ❌（单次调用出一个子集，需自己分片） | 能力最接近 `hb-subset`：支持可变字体轴裁剪、`keepFeatures`、`preserveNameIds`；**适合自建分片流水线** |
| **glyphhanger** | **6.0.0**（2026-06-05） | MIT | **依赖 `pyftsubset`（Python fonttools）+ brotli** | ❌ **必须装 Python** | 部分（可读页面 unicode-range 再子集） | 更适合「审计线上页面用了哪些字符」；本项目是自托管构建流水线，可不用 |

> **「Node 端是否有纯 JS 方案」的答案**：**有**。`cn-font-split` 提供 `wasm32-wasip1` 构建（`cn-font-split i wasm32-wasip1` + `dist/wasm/index.js`），`subset-font` 直接用 HarfBuzz 的 WASM 构建，`fontmin` 是纯 JS。只有 `glyphhanger` 必须依赖 Python 的 `pyftsubset`，可以排除在构建链之外。

### 3.2 实测：分片效果（本报告作者在 macOS 上用 cn-font-split 7.4.3 默认参数跑出）

| 源字体 | 源 TTF | **分片数** | WOFF2 **合计** | 单片中位 | 单片最大 | 生成的 `result.css` | 构建耗时 |
|---|---|---|---|---|---|---|---|
| Ma Shan Zheng（楷） | 5.59 MB | **88** | 3.73 MB | 48.5 KB | 73.6 KB | 65 KB | **1.46 s** |
| LXGW WenKai TC Regular（楷） | 12.50 MB | **222** | 7.69 MB | 38.3 KB | 73.1 KB | 165 KB | **2.38 s** |
| 全字庫正楷體 TW-Kai（楷） | 35.12 MB | **504** | 19.37 MB | 41.1 KB | 107.7 KB | 212 KB | **4.97 s** |

**对照实验（同样本报告实测）**

| 对照方式 | 结果 | 含义 |
|---|---|---|
| `subset-font` 整字重转 WOFF2（不分片） | 12.50 MB TTF → **4.65 MB WOFF2**（耗时 36.8 s） | 整包 WOFF2 体积比「分片合计」小（4.65 MB vs 7.69 MB），因为每片都要重复 cmap/name/度量等表结构；**但整包意味着用户为一个字也要下 4.65 MB** |
| `subset-font` 100 字子集 | **22.5 KB**（101 ms） | 极小的按需子集能力（适合固定 UI 文案） |
| Google Fonts CDN 分片（参考业界做法） | LXGW WenKai TC：115 片 / 4.53 MB；Ma Shan Zheng：92 片 / 3.48 MB；Noto Serif SC：101 片 / 3.11 MB | Google 用**字频**而非等体积分片，片数略少、单片略大 |
| `@fontsource/lxgw-wenkai` 5.3.0（npm） | **不分片**：单字重整包 WOFF2 = 6.90 MB（Regular）/ 8.40 MB（Light） | ⚠️ Fontsource 的 CJK 包是「整字体一个 woff2」，**首屏等于全量下载，不适用于本项目** |
| `cn-font-split` 的 `fontFeature: false` | 7.69 MB → 7.67 MB（几乎无差异） | OpenType 特性保留与否不是体积主因，无需为省体积牺牲特性 |

**容量规则（可用于估算）**：默认参数下约 **100 个码位/片、约 40 KB/片**。即一页出现 **500 个不同汉字 ≈ 加载 5–8 片 ≈ 250–350 KB**；1000 个不同汉字 ≈ 10–15 片 ≈ 500–700 KB。相比整包 4.65–7.14 MB，首屏流量下降一个数量级。

### 3.3 生成的 `@font-face` CSS 结构（实测输出，`result.css` 片段）

```css
/* Generated By cn-font-split@7.4.3 https://www.npmjs.com/package/cn-font-split
Origin File Name Table:
fontFamily: LXGW WenKai
license: This Font Software is licensed under the SIL Open Font License, Version 1.1.
 */
@font-face {
  font-family: "LXGW WenKai";
  src: local("LXGW WenKai"), url("./219.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  unicode-range: U+370-377, U+37a-37f, ... ;
}
/* …每个分片一条 @font-face，共 221 条，重复同一 font-family / weight … */
@font-face {
  font-family: "LXGW WenKai";
  src: local("LXGW WenKai"), url("./2.woff2") format("woff2");
  font-style: normal; font-weight: 400; font-display: swap;
  unicode-range: U+400-45f, U+462-463, ... ;
}
```

要点：
1. **每个分片一条 `@font-face`，`font-family`/`font-weight` 完全相同，靠 `unicode-range` 分流**——浏览器渲染某个字符时只请求「范围包含该码位」的那一片，这是纯 CSS 的按需加载，不需要任何运行时 JS。
2. 默认会写 `src: local("字体名"), url(...)`——若用户本机装了同名字体就优先用本地的。**本项目要求三端一致渲染，建议用 `css.localFamily: []`（或置空）去掉 `local()`**，避免 macOS 用户落到本地字体、Linux 用户落到 WOFF2 的差异。
3. 默认 `font-display: swap`（可用 `css.fontDisplay` 改）。
4. 文件名为 6 位短哈希或 `[index].[ext]`（`renameOutputFont` 控制）；`result.css` 有 65–212 KB，**必须开启服务端 gzip/brotli**（Express 用 `compression` 中间件即可）。
5. 输出还包含 `reporter.bin`/`index.proto`（分片索引，可用于自己生成更小的 CSS），生产环境不必发布。

### 3.4 Vite 构建 / 静态托管集成

**推荐做法（构建期一次性分包，产物随 `dist` 一起被 Node 静态托管）：**

```bash
# 1) 安装（版本为本次实测最新）
npm i -D cn-font-split@7.4.3
# 或直接用官方 Vite 插件（内部调用同一引擎，自动接入构建）
npm i -D vite-plugin-font@5.1.2
```

```bash
# 2) 命令行分包（无需写代码，Node 端即可执行）
#    CN_FONT_SPLIT_GH_HOST 用于国内网络环境下代理其原生动态库下载
export CN_FONT_SPLIT_GH_HOST=https://ik.imagekit.io/github
# 首次安装原生 FFI 动态库（约 6 MB）
npx cn-font-split i default
# 若环境无法使用原生动态库，改用官方 WASM 构建（纯 WASM，无原生依赖）
npx cn-font-split i wasm32-wasip1
```

```js
// 3) 脚本方式（Node 端；这是官方 README 的最小用法，输出到 Vite 的 public/ 或 dist/）
import { fontSplit } from 'cn-font-split';
import fs from 'node:fs';

await fontSplit({
  input: new Uint8Array(fs.readFileSync('fonts/LXGWWenKaiGB-Regular.ttf')),
  outDir: 'public/fonts/lxgw-wenkai-gb-regular',
  css: {
    fontFamily: 'LXGW WenKai GB',
    fontWeight: '400',
    fontDisplay: 'swap',
    localFamily: [],      // 关键：不写 local()，保证跨平台一致
    compress: true,
  },
  // 只保留中文相关分片（不要西文/希腊/西里尔分片）→ 交给 §3.6 的 unicode-range 策略
  testHtml: false,
  reporter: false,
  renameOutputFont: '[index].[ext]',
  silent: true,
});
```

**Vite 插件方式（可自动按项目源码用字做「首屏极小化」子集）：**

```js
// vite.config.js
import { defineConfig } from 'vite';
import Font from 'vite-plugin-font';

export default defineConfig({
  plugins: [
    Font.vite({
      // 扫描项目源码，收集实际用到的字符 → 首屏只需 1–2 片
      scanFiles: ['src/**/*.{vue,ts,tsx,js,jsx,json}'],
    }),
  ],
});
```

```js
// 组件里 import 字体，插件自动注入 CSS（?subsets 触发按源码用字子集）
import { css, fontFamilyFallback } from '@/assets/fonts/LXGWWenKaiGB-Regular.ttf?subsets';
```

**与 Node/Express 静态托管的配合要点**

- 分片产物放 `dist/fonts/**`（Vite 的 `public/` 会在构建时原样拷到 `dist`），由现有的 `express.static('dist')` 直接服务。
- 必须给 `.woff2` 设置长缓存 + 不可变：`Cache-Control: public, max-age=31536000, immutable`（分片文件名含哈希/索引，内容不可变）。
- 必须开启 `Content-Encoding: br/gzip` 响应 `result.css`（65–212 KB → brotli 后通常 <30 KB）。
- **离线/PWA**：把 `.woff2` 纳入 Service Worker 预缓存会一次性拉全量（19 MB 级不可行）。推荐策略：**运行时缓存（stale-while-revalidate）** `.woff2`，只缓存用户实际访问过的分片；`result.css` 与首屏 1–2 片做预缓存。
- 若应用本身希望「下载后永久离线可用」，可另提供「下载完整字体包」的可选操作。

### 3.5 预加载（preload）与 FOUT/FOIT

| 手段 | 建议 | 理由 |
|---|---|---|
| `font-display` | **`swap`**（cn-font-split 默认） | 中文分片即使只加载 2–3 片也有 100–200 ms 延迟，`swap` 先用回退字体显示、字体就绪后替换，避免白屏；`block` 会造成最长 3 s 不可见文字 |
| `font-display: optional` | 可选 | 彻底消除 FOUT/CLS（浏览器认为字体「不可用」就不再替换），但弱网/首访下用户可能整页看不到该字体；更适合「装饰性字体」 |
| `<link rel="preload">` | **只对首屏 1–2 个分片**使用，且要写 `crossorigin` | 全量 preload 会退化成整包下载；分片按 unicode-range 请求时浏览器发现时机较晚，preload 首页固定文案所在片可显著减少 FOUT |
| 首屏极小化 | 用 `vite-plugin-font` 的 `scanFiles` | 把 UI 固定文案（菜单、按钮、「设置/笔记/标签」等）单独打成 1–2 片并 preload，正文用全量分片按需加载 |
| CLS | 给 `body` 设定稳定的 `font-size`/`line-height` | 中文字体度量差异会带来轻微换行位移；`font-display: swap` + 固定行高可基本消除 |
| 兜底回退栈 | `font-family: "LXGW WenKai GB", -apple-system, "Segoe UI", "Noto Sans CJK SC", sans-serif` | 分片缺失/网络失败时不出现豆腐块 |

### 3.6 让英文/数字/符号保持默认字体的两种做法

**做法 1（推荐，跨平台最稳）：用 `unicode-range` 把自托管字体限制在中文码位。**

```css
/* 只声明覆盖中文相关区块；西文/数字/常用符号不落在任何 unicode-range 内，
   浏览器会直接用 font-family 栈里的下一个字体渲染它们 */
@font-face {
  font-family: "Note CJK Kai";
  src: url("./fonts/kai/1.woff2") format("woff2");
  font-display: swap;
  unicode-range: U+2E80-2EFF,   /* CJK 部首补充 */
                 U+3000-303F,   /* CJK 符号和标点 */
                 U+31C0-31EF,   /* CJK 笔画 */
                 U+3200-32FF,   /* 带圈 CJK 字母及月份 */
                 U+3300-33FF,   /* CJK 兼容 */
                 U+3400-4DBF,   /* 扩展 A */
                 U+4E00-9FFF,   /* CJK 统一表意文字基本区 */
                 U+F900-FAFF,   /* CJK 兼容表意文字 */
                 U+FE30-FE4F,   /* CJK 兼容形式 */
                 U+FF00-FFEF;   /* 全角形式 */
  /* 注意：CJK 扩展 B 及以上（U+20000+）用 U+20000-2FA1F 时，
     unicode-range 属主需为包含这些码位的分片单独声明 */
}
```

实现方式：分包时把「不含中文码位的分片」连同其 `@font-face` 一并删除（或先用 `subset-font` 把源字体裁到中文码位再交给 `cn-font-split`），这样 CSS 里根本不会出现西文范围，**西文天然使用默认字体，且在 macOS/Windows/Linux/移动端完全一致**。

**做法 2（辅助）：把默认西文字体放在 `font-family` 栈前面。**

```css
font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Note CJK Kai", sans-serif;
```

> 字体栈是「逐字符」匹配的：浏览器对每个字符从栈首往后找第一个**包含该字形**的字体。所以做法 2 也能让西文走系统字体，但**西文的最终字形取决于各平台系统字体（不一致）**；而做法 1 由 `unicode-range` 精确切分，**行为在所有平台完全一致**。**结论：用做法 1 满足「中文用自托管字体、西文用默认字体」；做法 2 只作为兜底。**

---

## 4. 风险清单

| 风险类别 | 一句话结论 |
|---|---|
| **授权风险** | 楷体有 OFL/OGDL 干净方案可放心打包；隶书只有「青柳隷書しも」（允许免费再分发但有附带条件）与「教育部隸書」（CC BY-ND 禁改作）两条窄路，其余「免费商用」字体（阿里妈妈、三极、临海、猫啃云昭）**只授权使用、不授权再分发/子集化**，误用会在分发环节构成侵权。 |
| **体积与首屏风险** | 不分片时单个中文字重 WOFF2 达 4.65–7.14 MB，首屏不可接受；采用 cn-font-split 分片后一页约 250–350 KB，但分片总文件数可达 222–504 个，**必须配合长缓存 + brotli + Service Worker 运行时缓存**，否则请求数与 CSS 体积本身会成为新瓶颈。 |
| **缺字风险** | 楷体：LXGW WenKai GB / TW-Kai 可覆盖 8105 字甚至扩展 B/C 生僻字，风险低；Google Fonts 系书法字体（Ma Shan Zheng 等）**只有 GB2312 的 6763 字、无繁体无扩展 A**，约 1,600 个三级字必然 tofu。隶书：青柳隷書しも 简体缺 2,361/6,763，教育部隸書 缺 3,689/6,763，**隶书选项必然存在明显 tofu 或字形回退**。 |
| **跨平台渲染差异** | 自托管 + `unicode-range` 分片本身在所有现代浏览器一致；差异来自三点：①`src: local()` 未关闭会导致装了字体的机器走本地文件；②隶书的「系统字体优先」混合方案会让 macOS/Windows/Linux/移动端显示不同字体；③字体 hinting 与 subpixel 设置在 Windows ClearType 下会让细笔画楷体比 macOS 更「糊」或更「锐」。 |
| **维护成本** | 上游字体更新（LXGW WenKai 仍在迭代，v1.522 于 2026-03 发布）需要重新分包并让哈希文件名失效；`cn-font-split` 首次安装需联网下载原生动态库（约 6 MB，国内需配代理，或改用 WASM 模式）；CN 字体生态许可证多为「作者声明」且可能随时变更，**每引入一款都要留档许可证原文与快照**。 |

---

## 5. 建议的落地方案（分档）

| 档位 | 楷体 | 隶书 | 说明 |
|---|---|---|---|
| **保守稳健（推荐起步）** | **霞鹜文楷 GB / LXGW WenKai GB（OFL 1.1）**，仅 Regular + Medium 两字重 | **暂不上隶书**，先把入口留成「楷体」；隶书作为 roadmap | 0 授权风险、8105 全覆盖、跨平台一致；先把分包与缓存链路跑通 |
| **满足需求（推荐交付）** | 同上 | **青柳隷書しも** 作为「隶书」选项，缺字回退到**自托管的 LXGW WenKai GB**；选项文案注明「隶书（繁体/常用字）」；随包附官方两份说明文档，且不因字体单独收费 | 唯一能同时做到「可打包 + 可自托管 + 跨平台一致」的隶书；缺字有回退、观感是「隶/楷混排」而非豆腐块 |
| **极致覆盖（探索）** | **全字庫正楷體 TW-Kai（OGDL 1.0）**，接受台湾字形与单字重 | — | 覆盖 39,186 码位 + 扩展 B 42,711 字，适合「生僻字不豆腐」优先的场景；需处理繁体字形观感问题 |
| **长期终局** | LXGW WenKai GB / TW-Kai | **基于 Arphic Public License 字源自研或委托制作开源隶书**（APL §2 明确允许改字形、换格式、改字体名、增删字符），产出 8105 字覆盖、OFL/APL 授权的隶书并开源 | 唯一能同时满足「8105 + 自托管 + 一致」的方案；可参照 [清骨隷](https://github.com/IIzzaya/project-qing-font) 的工程路径（其已用 APL 完成 1,000 字） |

---

## 附录 A：本报告所有数据来源

**字体与许可**
- [lxgw/LxgwWenKai（霞鹜文楷）README + 授权章节](https://github.com/lxgw/LxgwWenKai)｜[GB 版](https://github.com/lxgw/LxgwWenkaiGB)｜[Lite 版](https://github.com/lxgw/LxgwWenKai-Lite)｜[网络字体仓库（8105 字说明）](https://github.com/CMBill/lxgw-wenkai-web)
- [中易楷体 - 维基百科](https://zh.wikipedia.org/zh-hans/%E4%B8%AD%E6%98%93%E6%A5%B7%E4%BD%93)｜[MS Typography: KaiTi](https://learn.microsoft.com/en-us/typography/font-list/kaiti)｜[MS Typography: STKaiti](https://learn.microsoft.com/en-us/typography/font-list/stkaiti)｜[MS Typography: SimSun](https://learn.microsoft.com/en-us/typography/font-list/simsun)｜[MS Typography: Microsoft YaHei](https://learn.microsoft.com/en-us/typography/font-list/microsoft-yahei)
- [Microsoft Font redistribution FAQ（禁止 web font self-hosting / 禁止转 WOFF2 / 禁止嵌入 App）](https://learn.microsoft.com/en-us/typography/fonts/font-faq)
- [全字庫授權](https://www.cns11643.gov.tw/pageView.jsp?ID=59)｜[「全字庫字型」開放授權公告](https://www.cns11643.gov.tw/newsList.jsp?ID=2&ID2=200)
- [Debian `fonts-cns11643-kai`（TW-Kai，main/DFSG-free）](https://packages.debian.org/sid/fonts-cns11643-kai)｜[Debian `fonts-cns11643` 版权文件（OGDL-TW-1.0，注明 compatible with CC-BY-4.0）](https://sources.debian.org/data/main/f/fonts-cns11643/11403.01%2B20250325-3/debian/copyright)
- [Debian `fonts-moe-standard-kai`（non-free）](https://packages.debian.org/sid/fonts-moe-standard-kai)｜[教育部標準楷書字型檔](https://language.moe.gov.tw/material/info?m=9fe3fe82-8bbf-44c0-961d-873ea079e284)｜[教育部隸書字型檔](https://language.moe.gov.tw/material/info?m=9fe3fb11-c3d5-41f2-b029-6d18a2c2fd0d)
- [Arphic Public License 全文（ARPHICPL.TXT）](https://sources.debian.org/data/main/f/fonts-arphic-uming/0.2.20080216.2-11/license/english/ARPHICPL.TXT)｜[Debian `fonts-arphic-ukai`](https://packages.debian.org/sid/fonts-arphic-ukai)｜[Debian `fonts-aoyagi-kouzan-t` 版权（青柳衡山 5 款为 Public Domain）](https://sources.debian.org/data/main/f/fonts-aoyagi-kouzan-t/20160404-6/debian/copyright)
- [青柳隷書しも 官方页](http://opentype.jp/aoyagireisho.htm)（授权条款取自官方 zip 内《フォントの使用方法.txt》原文）｜[青柳隶书 - 猫啃网](https://www.maoken.com/freefonts/2508.html)｜[青柳隷書しも - ZSFT](https://fonts.zeoseven.com/items/2204/)
- [曺全碑隸 CoQuBeLi（无 LICENSE）](https://github.com/MY1L/CoQuBeLi)｜[清骨隸 Qinggu Li（Arphic Public License）](https://github.com/IIzzaya/project-qing-font)
- [阿里妈妈刀隶体（免费商用声明全文）](https://www.xiusheji.com/freebies/7673.html)｜[阿里妈妈刀隶体 - 猫啃网](https://www.maoken.com/freefonts/19059.html)
- [临海隶书 - 猫啃网](https://www.maoken.com/freefonts/20208.html)｜[猫啃云昭隶书（收费）](https://www.maoken.com/gratuity/%e7%8c%ab%e5%95%83%e4%ba%91%e6%98%ad%e9%9a%b6%e4%b9%a6)｜[青柳隶书页](https://www.maoken.com/freefonts/2508.html)
- [三极字库用户许可协议](https://www.sjtype.com/grxy.html)｜[三极隶书系列页面](https://www.mianfeiziti.com/fontlists-967978.htm)
- [方正字库知识产权用户许可协议](https://www.foundertype.com/index.php/about/powerAllowPro.html)｜[方正字库家庭版/个人非商业](https://www.foundertype.com/index.php/About/powerPer)｜[汉仪字库个人非商用须知](https://www.hanyi.com.cn/coupon/faq-doc-1)｜[白舟書体 使用許諾](https://hakusyu.com/licensing.htm)
- [Google Fonts: Ma Shan Zheng](https://fonts.google.com/specimen/Ma+Shan+Zheng)｜[Liu Jian Mao Cao](https://fonts.google.com/specimen/Liu+Jian+Mao+Cao)｜[LXGW WenKai TC](https://fonts.google.com/specimen/LXGW+WenKai+TC)｜[Iansui](https://fonts.google.com/specimen/Iansui)｜[google/fonts `ofl/` 目录](https://github.com/google/fonts/tree/main/ofl)
- [中文网字计划（字体列表 / 在线分包）](https://chinese-font.netlify.app/zh-cn/)｜[chinese-free-web-font-storage（cn-fontsource，80 款字体 index.json）](https://github.com/KonghaYao/chinese-free-web-font-storage)

**工具与工程**
- [cn-font-split（README 7.4.1/7.4.3，Apache-2.0）](https://www.npmjs.com/package/cn-font-split)｜[GitHub](https://github.com/KonghaYao/cn-font-split)｜[npm registry 元数据](https://registry.npmjs.org/cn-font-split)
- [vite-plugin-font 5.1.2 README](https://www.npmjs.com/package/vite-plugin-font)
- [fontmin 1.1.1 README（插件含 ttf2woff2）](https://www.npmjs.com/package/fontmin)
- [subset-font 2.9.0 README（harfbuzzjs WASM）](https://www.npmjs.com/package/subset-font)
- [glyphhanger 6.0.0 README（Prerequisite: pyftsubset，需 Python fonttools + brotli）](https://www.npmjs.com/package/glyphhanger)
- [MDN: `@font-face/font-display`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [@callmebill/lxgw-wenkai-web（cn-font-split 已分包产物，本报告用于核对分片数与 CSS 结构）](https://www.npmjs.com/package/@callmebill/lxgw-wenkai-web)｜[@fontsource/lxgw-wenkai（整包不分片对照）](https://www.npmjs.com/package/@fontsource/lxgw-wenkai)

## 附录 B：本报告的实测方法与原始数据

- **覆盖统计**：下载字体文件后，自写 Python 脚本解析 SFNT 表目录与 `cmap`（format 4 / format 12），展开为完整码位集合；GB2312/GBK 汉字集合由 Python `gb2312`/`gbk` 编解码器穷举生成（GB2312 = 6,763 字；GBK BMP 汉字 = 20,902 字），逐字求交集与差集。繁体/扩展 A 样例为人工选取的常用字形表。
- **分片实测**：macOS + Node v24.18.0 + `cn-font-split@7.4.3`（原生 FFI 动态库 `libffi-x86_64-apple-darwin.dylib`，5.94 MB），全部使用官方默认参数（仅显式设置 `fontFamily`/`fontWeight`/`fontDisplay`，以及对照实验中的 `fontFeature`），统计输出目录内 `*.woff2` 的个数、总字节、最小值、中位数、最大值与 `result.css` 字节数。
- **对照实测**：`subset-font@2.9.0`（harfbuzzjs WASM），`keepAllGlyphs: true` 得整字重 WOFF2；100 个常用汉字子集得单文件子集体积；Google Fonts CSS2 接口解析 unicode-range 分片并按 `HEAD` 请求统计各片字节；`@fontsource`、`@callmebill` 的分片/文件清单来自 unpkg `?meta` 接口。
- **说明**：本报告只做调研与建议，不含应用侧代码实现。所有「体积」以 MiB（1,048,576 字节）表示，与下载页显示的十进制 MB 可能略有差异。
