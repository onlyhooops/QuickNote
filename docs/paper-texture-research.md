# 中国传统手工纸调研报告：宣纸 × 桑皮纸的视觉特征与 CSS 纹理复刻

> 目标：为中文笔记 Web 应用提供两套「纸张主题背景」（宣纸 / 桑皮纸）的事实依据与工程参数。
> 范围：原料与工艺 → 分类 → 外观手感（颜色 / 纤维 / 帘纹 / 透光 / 光泽 / 老化） → 可落地 HEX 区间 → CSS/SVG 复刻技法 → 性能 / 可读性 / 暗色模式。
> 版本：2026-09；所有关键事实均附来源链接；标注「设计建议」的数值是本文综合后的工程取值，不是文献原文。

---

## 0. 速查表（TL;DR）

### 0.1 两套主题的核心视觉参数

| 维度 | 宣纸（Xuan paper） | 桑皮纸（Mulberry paper） |
| --- | --- | --- |
| 原料 | 青檀树韧皮纤维 + 沙田稻草纤维 | 桑树枝内皮（韧皮纤维），部分产地加构皮 |
| 纤维性格 | 檀皮长而韧 → 长纤维网络；稻草短而细 → 绵软 | 粗长纤维束，纤维结节、疙瘩明显 |
| 浅色主题底色（设计建议） | `#F3EEE0`（典型）｜区间 `#EFE7D3`–`#FAF7EE` | `#E0CBA2`（典型）｜区间 `#C8AE85`–`#EFE4C8` |
| 暖度指标 R−B（设计建议） | 12–20（弱暖） | 40–65（明显土黄） |
| 帘纹尺度（设计建议） | 1–2 mm ≈ 4–8 px @96dpi，细密均匀 | 4–10 mm ≈ 15–38 px，更粗、间距不匀 |
| 表面颗粒 | 均匀细腻，无明显疙瘩 | 疏密不均，可见纤维束、杂点、植物残渣 |
| 光泽 | 哑光，转光时有极轻微丝光 | 粗糙哑光，有绒感 |
| 暗色主题底色（设计建议） | `#1A1811`（夜色宣纸 / 墨纸） | `#1B1710`（更暖更深） |
| 主题性格 | 干净、文雅、留白 | 粗粝、手作、野、有土气 |

### 0.2 一句话结论

- **「越白越好」是误解**：国标对宣纸白度的要求只是 ≥75%（ISO）级别，且过度漂白损伤纤维寿命；传统宣纸的观感是**暖白 / 象牙白 / 米白**，旧纸会因光氧化持续泛黄。([GB/T 18739-2008 检测解读](https://www.baijiantest.info/cljczs/106457.html)、[故宫藏品描述](https://www.dpm.org.cn/collection/studie/230767.html))
- **宣纸与桑皮纸的差异不只是颜色深浅**：桑皮纸的黄度（R−B）通常是宣纸的 3 倍以上，纤维尺度大一个数量级，帘纹更粗且不规则，纸面**厚度不均、边缘毛糙**。
- **CSS 上最稳的架构**：底色（含色斑）→ 大尺度纤维团（多层 `radial-gradient`）→ 帘纹（`repeating-linear-gradient`）→ 细颗粒噪点（data-URI SVG `feTurbulence`）→ 暗角/书页明暗（`linear-gradient` 叠加），全部放在一个 `position: fixed` 的**装饰层**里，正文层绝不参与 `filter`。

---

## 1. 宣纸（Xuan paper / 泾县宣纸）

### 1.1 原料与配比

| 项目 | 内容 |
| --- | --- |
| 皮料 | **青檀**（*Pteroceltis tatarinowii*）树韧皮纤维：长而韧，给纸以拉力与寿命（"骨"） |
| 草料 | **沙田稻草**纤维：短而细，带来绵软与吸墨性（"肉"） |
| 工艺逻辑 | 二者按比例调配，形成**特净皮 / 净皮 / 棉料**三大类；老技师按年份、山场、霜降前后收割差异"看料做纸" |
| 经典配方 | 明清以来"七皮三草"被视为黄金配比；文中亦提到"六皮四草"等 |

来源：[中国传统文化促进会《宣纸（五）皮草配比中的经验与传承》](https://www.tcpc.org.cn/22738.html)（该文引清《宣城县志》"纸之精者，必皮与草相得"）。

### 1.2 分类：两条线索

**线索 A — 皮草配比（官方商品口径）**

| 等级 | 皮料含量 | 手感 / 用途 |
| --- | --- | --- |
| 特皮 / 特种净皮 | **约 80%**（可至 90%） | 纸质坚韧、纤维绵长、薄而韧；大写意、需长期保存的书画 |
| 净皮 | **约 60%**（有资料称 60–80%，常引"75% 左右"） | 刚柔相济、最通用；明清以来书画主流 |
| 棉料 | **约 40%**（有资料称 50–60%，"皮不过三成"） | 绵软如棉、吸墨爽利但层次略"灰"、韧性低；日课、练习、应酬 |

- 80/60/40 的口径来自中国宣纸股份有限公司（红星）产品分类路径：`特皮类(皮含量80)`、`净皮类(皮含量60)`、`棉料类(皮含量40)`。见[红星特皮类](http://www.hongxingxuanpaper.com.cn/index.php/products/tepileihepihanliang80/)、[红星净皮类](http://www.hongxingxuanpaper.com.cn/index.php/products/jingpileitanpihanliang60/)、[红星棉料类](http://www.hongxingxuanpaper.com.cn/index.php/products/mianliaoleitanpihanliang40/)。
- 百分比区间与"七皮三草"等经验表述见[中国传统文化促进会《宣纸（九）》](https://www.tcpc.org.cn/23063.html) 与[《宣纸（五）》](https://www.tcpc.org.cn/22738.html)。**注意：不同来源对"净皮/棉料"的百分比口径不一致（60 vs 75、40 vs 50–60），工程上不必纠结，把它理解为"皮料递减的三个梯次"即可。**

**线索 B — 加工工艺**

| 类型 | 工艺 | 渗墨行为 | 典型用途 |
| --- | --- | --- | --- |
| 生宣 | 捞纸后不做处理 | 强吸水、迅速洇散，墨分五色 | 写意、行草 |
| 熟宣 | 刷/浸明矾（硫酸铝钾）或矾胶液，封闭纤维孔隙 | 不洇，笔触边界清晰 | 工笔、小楷、白描 |
| 半熟宣 | 轻施薄矾，或豆浆汁、米汤等天然物表层处理 | 可控渗化，兼工带写 | 小写意、没骨、中楷行楷 |

来源：[中国传统文化促进会《宣纸（九）特净净皮棉料与生宣熟宣的各自门道》](https://www.tcpc.org.cn/23063.html)。
补充：故宫对宣纸的定义强调"明清时期以青檀树皮及**少许稻草**为原料…纸质洁白细腻，不易虫蛀，色泽经久不变"，分生宣/熟宣两种。见[故宫博物院·罗纹洒金纸](https://www.dpm.org.cn/collection/studie/230767.html)。

**规格（四尺/六尺…）**：官方《纸帘、帘床》规格表给出的是**纸帘**尺寸（单位 cm，宽度为参照数）：

| 帘名 | 长 | 宽 | 篾丝距 | 根/寸 |
| --- | --- | --- | --- | --- |
| 四尺 | 161 | 85 | 1.95–2.06 | 30–31 |
| 五尺 | 174 | 100 | 2.0–2.1 | 25–26 |
| 六尺 | 206 | 112 | 2.0–2.1 | 24 |
| 八尺 | 282 | 143 | 2.0–2.1 | 20 |
| 丈二 | 400 | 162 | 2.0–2.1 | 19 |
| 丈六 | 530 | 219 | 2.0–2.1 | 17–18 |

同页另给**帘床**规格：床面铺穿芒杆，**芒杆间距 1.3–1.5 cm**（四尺至六尺），八尺以上 1.8–2.0 cm。
来源：[中国宣纸股份有限公司《第一百一十一篇：宣纸制作工具之：纸帘、帘床》](http://www.hongxingxuanpaper.com.cn/index.php/hongixngdangjian/xianzaidajiangtang/1289.html)。
（成品常见规格如四尺 138×69 cm、六尺 180×97 cm 属商品惯例，与"帘"尺寸不同，勿混用。）

### 1.3 外观与手感

| 特征 | 事实与来源 |
| --- | --- |
| **颜色** | 不是纯白。故宫对宣纸的用词是"纸质洁白细腻"，但实物与照片普遍呈现**暖白 / 象牙白 / 米白 / 淡黄**。故宫藏清雍正**罗纹洒金纸**（宣纸的一种）明确描述为"**纸色淡黄**"。([故宫](https://www.dpm.org.cn/collection/studie/230767.html)) |
| **白度指标** | GB/T 18739-2008《宣纸》相关解读给出：**白度 ≥75%（ISO）**、定量 40–150 g/m²、pH 7.0–8.5（中性偏碱，利于长期保存）、灰分 ≤1.5%、耐折度（MIT）纵向 ≥200 次（生宣）。([检测机构标准解读](https://www.baijiantest.info/cljczs/106457.html)) |
| **纤维特征** | 檀皮长纤维构成骨架，稻草短纤维填充 → 迎光看呈**云絮状、团块状的纤维匀度**；优质宣纸"纤维均匀无杂质"（同前检定解读；另见工艺文对"檀皮纤维长而韧、稻草短而细"的说明 [tcpc](https://www.tcpc.org.cn/22738.html)）。 |
| **帘纹** | 竹帘编织缝隙在阴干纸面留下规律细纹，即**帘纹**；另有**罗纹**——由细布/铜丝帘形成"横纵细线相交"的网状纹样，故宫明确区分二者："纸面有明显横纵细线相交的纹样，**但与帘纹不同**"。([故宫](https://www.dpm.org.cn/collection/studie/230767.html)) |
| **帘纹尺度** | 官方帘规格表给出篾丝距 1.95–2.1 与"根/寸 17–31"两组数（表中未注单位，二者互相不完全自洽）。按"根/寸"折算：33.3 mm ÷ 30 ≈ **1.1 mm/道**；按"篾丝距"读作毫米则为 **2 mm/道**。**结论：宣纸帘纹量级为 1–2 mm（每厘米 5–10 道）**，详见 §8 不确定度说明。([红星《纸帘、帘床》](http://www.hongxingxuanpaper.com.cn/index.php/hongixngdangjian/xianzaidajiangtang/1289.html)) |
| **透光** | 迎光可见纤维云絮与帘纹；薄型宣纸透光柔和、无云斑为佳；"通过透光观察纤维分布"是传统鉴别手段（[检测解读](https://www.baijiantest.info/cljczs/106457.html)）。 |
| **光泽** | 哑光。传统评语为"韧而能润、**光而不滑**"（[检测解读](https://www.baijiantest.info/cljczs/106457.html)）——即有一层极弱丝光，但整体不反光。**CSS 含义：高光几乎为零，只有 ±1–2% 的明暗起伏。** |
| **年代变化** | 光照下持续泛黄、荧光性能改变，属光降解/氧化过程（[ScienceDirect: *Fluorescence and photodegradation of Xuan paper*](https://www.sciencedirect.com/science/article/abs/pii/S1296207412001811)，注意该链接为期刊条目页）。同时 pH 偏碱、耐折度较高，是"纸寿千年"的物质基础。 |

### 1.4 宣纸可参考配色（HEX）

**方法说明（重要）**：纸张颜色的"绝对 HEX"高度依赖拍摄光源，因此下表把「文献描述 / 命名色」与「实测采样」分开列，并给出**设计建议区间**。

| 类型 | HEX | 依据 |
| --- | --- | --- |
| 命名色·象牙白 | `#FFFFF0` | 通用色名（[Canva 象牙白配色页](https://www.canva.cn/colors/color-meanings/ivory/)），作为"高白象牙"上限锚点 |
| 命名色·米白 / Beige | `#F5F5DC` | Web 标准色 beige，作为"米白"锚点 |
| 摄影采样·故宫藏 清雍正 罗纹洒金纸 | 中央区中位色 `#89837F`；p10 `#847F7B`、p90 `#8E8683` | 本文对故宫官方图 [`20055[1024].jpg`](https://img.dpm.org.cn/Uploads/Picture/dc/20055%5B1024%5D.jpg) 中央 60% 区域做像素中位数统计。**博物馆展柜暗光 + 后期偏灰，不可直接当底色**，仅说明"淡黄纸在低照度下呈中灰" |
| 摄影采样·宣纸博物馆展陈（Wikimedia Commons） | 纸面区域中位色 `#B09177`（折叠纸）、`#C4A189`（悬挂纸） | 对 [Making Xuan Paper (9974514453)](https://commons.wikimedia.org/wiki/File:Making_Xuan_Paper_(9974514453).jpg) 中纸面区域采样。**现场暖光，色偏明显** |
| **设计建议·新宣纸（高白偏暖）** | `#F8F5EC` | 综合：白度 ≥75% ISO（近中性高亮）+ 传统暖白观感 + 命名色 象牙白/米白 |
| **设计建议·常规净皮宣纸** | `#F3EEE0` | 同上，落在大众认知的"宣纸色"上（R−B = 19，弱暖） |
| **设计建议·陈宣 / 老纸** | `#E9DFC6` | 泛黄后的中间态（对应"纸色淡黄"） |
| **设计建议·旧纸（民国及更早）** | `#DCC9A5` | 强泛黄上限 |
| **设计建议·暗色模式墨纸** | `#1A1811`（底） + `#E8E2D4`（正文） | 见 §5.4；对比度 13.8:1 |

**宣纸底色区间（浅色主题推荐）：`#EFE7D3` – `#FAF7EE`；泛黄态：`#DCC9A5` – `#E9DFC6`。**

---

## 2. 桑皮纸（Mulberry paper）

### 2.1 原料、工艺与非遗地位

| 产地 / 类型 | 原料与工艺 | 非遗地位 |
| --- | --- | --- |
| **新疆（维吾尔族）桑皮纸** | 以**桑树枝内皮**为原料（"桑枝内皮有粘性，纤维光滑细腻，易于加工"），工序：剥削 → 浸泡 → 锅煮 → 捶捣 → 发酵 → 过滤 → 入模 → 晾晒 → 粗磨；成纸分**高、中、低三档**。清代新疆书册典籍主要用桑皮纸印刷，民国时期甚至用于印钞；中档用于茶叶草药包装，粗纸糊天窗或作衣靴辅料。至迟唐代已有此手工行业。 | **国家级非遗**：项目序号 420，编号 **Ⅷ-70**，**2006 年第一批**，申报地区**新疆维吾尔自治区吐鲁番地区**，保护单位新疆大漠土艺馆。([中国非物质文化遗产网](https://www.ihchina.cn/project_details/14386)) |
| **安徽潜山 / 岳西桑皮纸** | 据《潜山县志》汉代即产，又称「**汉皮纸**」；规格分**大汉、中汉、小汉**；工艺流程：选料 → 蒸煮 → 拣皮 → 制浆 → **帘捞** → 焙烤。成品"纸质柔软、拉力强、不断裂、不褪色、防蛀、无毒性、吸水力强"，用于书画、裱褙、**典籍修复**、包装、制伞。 | **国家级非遗（扩展项目）**：编号 Ⅷ-70，**2008 年第二批**，申报地区安徽省潜山县（另岳西县同批）；保护单位潜山市文化馆。([潜山项目页](https://www.ihchina.cn/project_details/14387)、[岳西项目页](https://www.ihchina.cn/project_details/14388)) |
| **故宫倦勤斋修复用纸** | 2004 年，潜山传承人刘同烟以纯桑皮手工特薄桑皮纸被北京档案馆、图书馆选为古书修复用纸；**2004 年该纸被故宫博物院选定为倦勤斋修复工程专业用纸**；2004–2005 年故宫大修中，潜山、岳西手工桑皮纸作为特选材料广泛应用。 | 传承人：刘同烟（第四批国家级非遗代表性传承人，项目编号 Ⅷ-70）。([传承人页](https://www.ihchina.cn/ccr_detail/3222.html)、[潜山项目页](https://www.ihchina.cn/project_details/14387)) |
| **山西高平桑皮纸** | 高平市"桑皮纸制作技艺"有省级代表性传承人 | **山西省级非遗**：第六批省级非遗代表性项目代表性传承人推荐名单中列有"桑皮纸制作技艺－王志宁"。([高平市政府信息公开](https://xxgk.sxgp.gov.cn/gzbm/gpwlj/fdzdgknr/ggwh/gknr/fwzwhyc_whlyj/202310/t20231009_1865258.shtml)) |
| **其他产地** | 山东（临沂／临朐桑皮纸，见[山东宣传网](http://sdxc.gov.cn/whql/whcc/201912/t20191216_11543990.htm)）等地亦有桑皮纸传统 | 多为省级 / 市级非遗 |

**桑皮纸与「Kozo（楮皮纸）」的关键区别（务必不要混为一谈）**

| | 桑皮纸 | Kozo / 楮皮纸系（日本楮纸、韩国韩纸、中国构皮纸） |
| --- | --- | --- |
| 植物 | **桑属** *Morus*（桑树）韧皮 | **构属** *Broussonetia papyrifera*（构树 / paper mulberry，日语 kozo、韩语 닥 dak） |
| 科 | 桑科 Moraceae | 桑科 Moraceae（同科不同属） |
| 纤维 | 相对"光滑细腻"（新疆桑皮纸原话），长纤维但束状明显 | 楮皮纤维**极长**、强度高，是韩纸/和纸"韧性 + 长纤维"的来源 |
| 典型成品气质 | 土黄、粗、手作感强 | 更白（可漂至很白）、纤维更长更"丝"，薄而强 |
| 韩国韩纸（Hanji） | — | 以楮皮（dak）为原料，纤维长、强度高、帘纹明显；学界对"韩纸/高丽纸"的原料有专门科学分析（[《古代高丽纸纤维原料科学分析与相关问题研究》，《中国造纸》](http://zgzz.cnjournals.com/zgzz/article/html/202410007)）；参考书级样本的定量表征见 [HAL: *Characterization of Korean handmade papers collected in a Hanji reference book*](https://hal.science/hal-03324594v1/document) |
| 泰国 Sa paper（กระดาษสา） | — | 名称与工艺接近"桑皮纸"路线：以桑科树皮手工抄造、纤维粗、常见自然色与染色（参见 [J-STAGE: *Preparation, Structure and Properties of Paper Sheets from Mulberry Bark*](https://www.jstage.jst.go.jp/article/fiber/68/11/68_304/_article/-char/en)） |

> 工程结论：**桑皮纸 ≠ 韩纸 ≠ 楮纸**。做视觉主题时，桑皮纸应当"更黄、更粗、更野"；若你要做的是韩纸/楮纸，则应偏"白 + 长纤维丝光"。

### 2.2 外观与手感（桑皮纸）

| 特征 | 描述 |
| --- | --- |
| **颜色** | **灰白 → 土黄 → 米褐 → 麻色**的连续谱。漂白/精细档偏灰白米白；常见成品为**米黄、浅麻色**；粗档（包装、糊窗）为土黄褐。新疆实拍照片采样中位色 `#E3CEA5`、`#E9D0A7`，暗部 `#C6AB8F`，高光 `#F1DDC2`（见 §2.3） |
| **纤维** | 粗长**纤维束**明显、有**纤维结节/疙瘩**、分布**疏密不均**、可见**植物残渣小点**（深色小点）。相较宣纸的"匀"，桑皮纸的关键词是"不匀"。 |
| **帘纹** | 手工"帘捞"（[潜山项目页](https://www.ihchina.cn/project_details/14387)）留下**更粗的帘纹**，叠加纸面本身的厚度起伏；**条纹间距不均、走向轻微波动**是"手作感"的主要来源。（"更粗/不均"为工艺推断 + 照片观察，见 §8） |
| **厚度 / 边缘** | 厚度不均（透光可见云斑与厚薄差）；**边缘毛糙**，常见手工撕边与纤维飞边 |
| **透光与光泽** | 透光时纤维束与云斑强烈；表面**粗糙哑光**，带**绒感**，几乎无镜面反射 |
| **强度卖点** | "拉力强、不断裂、不褪色、防蛀、无毒性、吸水力强"（[潜山项目页](https://www.ihchina.cn/project_details/14387)）——对应视觉上的"筋感/筋骨感" |

### 2.3 桑皮纸可参考配色（HEX）

| 类型 | HEX | 依据 |
| --- | --- | --- |
| 摄影采样·新疆桑皮纸成品与书画（央广网） | 纸面中位色 `#E3CEA5`；另一纸面 `#E9D0A7`；暗部 p10 `#9E8B72`；高光 p90 `#F1DDC2` | 本文对央广网《千年技艺一张纸》配图 [`d64279c3…jpg`](https://mediabluk.cnr.cn/img/cnr/CNRCDP/2025/0725/d64279c35164a175340904740235617211.jpg)（桑皮纸书法作品与桑皮纸笔记本）纸面区域做像素中位统计；原文页面：[央广网 2025-08-02](https://xj.cnr.cn/gstjxj/20250802/t20250802_527296066.shtml) |
| 摄影采样·新疆桑皮纸晾晒（央广网） | 桌面上纸叠中位 `#C6AB8F` | 对 [`a091ed63…jpg`](https://mediabluk.cnr.cn/img/cnr/CNRCDP/2025/0725/a091ed63f4d22175340801928676291711.jpg) 采样（室内混合光，偏暗） |
| **设计建议·精细/漂白桑皮纸** | `#EFE4C8` | 照片高光区校正 + 灰白档描述 |
| **设计建议·典型桑皮纸（推荐主色）** | `#E0CBA2` | 与照片中位色 `#E3CEA5` 高度一致，作为浅色主题底色（R−B = 62） |
| **设计建议·粗档 / 含杂** | `#C8AE85` | 照片暗部与土黄档描述 |
| **设计建议·最粗（包装/糊窗）** | `#B2946B` | 土黄褐档 |
| **设计建议·暗色模式** | 底 `#1B1710` + 正文 `#D8CFBB`（对比度 11.5:1） | 见 §5.4 |

**桑皮纸底色区间（浅色主题推荐）：`#C8AE85` – `#EFE4C8`；推荐主色 `#E0CBA2`。**

---

## 3. 宣纸 vs 桑皮纸：关键视觉差异（→ CSS 参数差异）

| 维度 | 宣纸 | 桑皮纸 | CSS 上的体现 |
| --- | --- | --- | --- |
| 色相 / 黄度 | 弱暖（R−B 12–20） | 明显黄褐（R−B 40–65） | 底色 + 纤维团的 `hsl()` 色相错开 10–15°，桑皮纸纤维团用更饱和的赭石色 |
| 明度 | 高（L* ≈ 92–96） | 中（L* ≈ 78–86） | 桑皮纸需相应压暗正文色或提高字重 |
| 纤维尺度 | 细：<2px 颗粒 + 40–120px 云絮 | 粗：1–3px 纤维丝 + 5–20px 可见纤维束 | 桑皮纸的 `radial-gradient` 椭圆更小更"散"，并用 `feDisplacementMap` 做长条拉伸 |
| 纤维均匀度 | 均匀 | 疏密不均、有结节/疙瘩/杂点 | 桑皮纸需**不均匀分布**（不同尺寸/不透明度随机化）+ 稀疏深色小点 |
| 帘纹 | 细密（1–2 mm ≈ 4–8 px @1x），间距稳定 | 粗（4–10 mm ≈ 15–38 px），间距不匀、走向抖 | 宣纸：单一 `repeating-linear-gradient`；桑皮纸：2–3 层不同周期叠加 + 轻微旋转/位移 |
| 厚度感 | 均一 | 厚薄不均（透光云斑） | 桑皮纸加一层大尺度低频明暗（`radial-gradient` 大面积 2–4% 明暗） |
| 边缘 | 干净 | 毛糙、飞边 | 桑皮纸可加 `mask-image` 撕边或内阴影模拟毛边 |
| 光泽 | 哑光微丝光 | 粗糙绒感 | 桑皮纸加 `filter: contrast(105%)` 级的微对比提升，宣纸不要 |
| 年代基调 | 可由暖白 → 米黄 | 天然就偏黄，老化后更深褐 | 宣纸主题建议提供"新纸 / 陈纸"两个预设 |

---

## 4. CSS / SVG 复刻技法清单

### 4.1 技法 → 用途 → 代价对照表

| 技法 | 复刻对象 | 优点 | 代价 / 风险 | 建议用法 |
| --- | --- | --- | --- | --- |
| 多层 `radial-gradient`（椭圆、低不透明度） | 纤维团 / 云絮 / 色斑 / 厚薄不均 | 纯 CSS，零额外请求，可动画（但没必要） | 层数多会增大绘制面积；层数 >8–10 后收益递减 | 4–8 层，尺寸 40–200px，`rgba` 不透明度 0.02–0.08 |
| `repeating-linear-gradient` | 帘纹 / 罗纹 / 竹帘条痕 | 极廉价，`background-repeat` 天然无缝 | 规律性太强会"塑料感" | 宣纸 1px 线 + 4–8px 周期；桑皮纸 2–3 层不同周期（如 14px/17px/23px）叠加去规律 |
| `repeating-linear-gradient(90deg, …)` + `0deg` | 罗纹（横纵细线相交） | 一次搞定交叉网格 | 交叉处会叠出更深的点，需降低各自透明度 | 故宫明确罗纹为"横纵细线相交"，交叉点变深正是其特征 |
| SVG `feTurbulence` + `feColorMatrix`（`type="fractalNoise"`） | 纸浆颗粒 / 细噪点 | 体积极小（≈1.2 KB 原始 SVG）；无缝拼接（`stitchTiles="stitch"`） | 高 `numOctaves` 时栅格化成本上升 | 用 data-URI 做 `background-image`，`baseFrequency` 0.6–0.9、`numOctaves` 2–4 做颗粒；0.01–0.05、`numOctaves` 5–9 做宏观纸浆起伏 |
| SVG `feTurbulence` + `feDisplacementMap` | 纤维抖动 / 毛边 / 纤维走向 | 唯一能做出"纤维被水冲歪"的有机感 | **性能最贵**；对 HTML 文字使用会导致文本位图化、模糊、可读性下降 | 只施加在**独立的纤维装饰层**（`aria-hidden`、`pointer-events:none`），`scale` 3–10，**永不施加在正文容器** |
| SVG `feTurbulence` + `feDiffuseLighting` / `feSpecularLighting` | 纸面凹凸 / 帘纹立体 / 折痕 | 光照模型让噪声变成"纸的表面"而非"噪点" | 需要滤镜，成本高于纯噪点；`surfaceScale` 过大会像砂纸 | 大面积纸面首选；参考 Obsidian 主题参数：`baseFrequency 0.02`、`numOctaves 9`、`surfaceScale ≈2.05`、`feDistantLight azimuth=75 elevation=50` |
| `mix-blend-mode` / `background-blend-mode` | 纹理与底色的融合、暗角、明暗主题切换 | 一行属性解决"脏"的问题；`multiply` 让纹理像印在纸上 | 会创建层叠上下文；`mix-blend-mode` 可能"漏"到不该混合的元素 | `background-blend-mode` 用于同一元素的背景层之间（最安全）；`mix-blend-mode` 配合 `isolation: isolate`；暗色模式把 `multiply` 换成 `screen` / `soft-light` / `color-dodge` |
| data-URI SVG 作为 `background-image` | 整体纸纹 | 无额外请求、可缓存、可控、不受 `filter` 重绘影响 | base64 体积 +33%；`#` 需转义为 `%23` | 首选。1.2 KB SVG → 1.57 KB base64（实测，见 §4.2） |
| `background-attachment: fixed` | 视差/固定纸纹 | 视觉稳定 | **移动端大坑**：iOS 上不生效；WebKit 曾专门加开关忽略固定背景以加速滚动 | **改用 `position: fixed` 的独立装饰层** |
| 外部位图 | 极真实纸纹 | 最像 | 请求体积、暗色模式需换图、缩放失真 | 本方案原则上不用；仅在"极致拟真"模式作为可选增强 |

### 4.2 体积实测（本报告实测）

对开源 Obsidian 纸纹方案 [Moyf 的 gist](https://gist.github.com/Moyf/4c2e91bc9622d4c8e528c848da1ae61e) 中的 data-URI 做解码测量：

| 指标 | 数值 |
| --- | --- |
| 原始 SVG | **1 174 bytes**（`<feTurbulence baseFrequency=0.02 numOctaves=9 seed=10 type=fractalNoise>` + `<feDiffuseLighting surfaceScale≈2.05>` + `<feDistantLight azimuth=75 elevation=50>`，`viewBox="0 0 508 285.75"`） |
| base64 后 | **1 568 字符**（+33.6%） |
| 整个样式文件 | 2 611 bytes（含明暗两套主题规则） |

**结论**：一张 `feTurbulence + feDiffuseLighting` 的纸纹 SVG 只有 1 KB 级，压缩后更小。**"SVG 滤镜噪声体积太大"是误解——大的是"给整个页面套 `filter: url(#…)"`，不是 data-URI 背景。**

---

## 5. 性能、兼容性、可读性、暗色模式

### 5.1 性能：什么时候贵、什么时候便宜

| 场景 | 成本 | 说明与来源 |
| --- | --- | --- |
| **静态** data-URI SVG 噪声作为 `background-image` | **低** | 浏览器在合成/栅格化阶段生成一次纹理（且可缓存 tile），滚动时通常只做合成。这是本方案推荐路线。 |
| **静态** `filter: url(#noise)` 施加在一个**大面积 DOM 元素**上 | 中–高 | 滤镜区域（filter region）越大、`numOctaves` 越高，一次性栅格化越贵；滤镜还会强制创建层叠上下文与包含块，并可能让后续变换触发重栅格化。([MDN `filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/filter)) |
| **动画/每帧变化**的 `feTurbulence`、`feDisplacementMap`（改 `baseFrequency`、`scale`、或让被滤镜元素随滚动/鼠标移动） | **很高，移动端尤其危险** | GSAP 官方（管理员 Cassie）原话：**"SVG filters are pretty horrific for performance"**，可以短时、小面积使用，**时长一长或面积一大绝对不行**；该帖作者在 iOS 上遇到明显卡顿，长时间运行会导致 Safari 刷新标签页甚至崩溃。([GSAP 论坛](https://gsap.com/community/forums/topic/33075-gsap-and-feturbulence-mobile-performance/)) |
| SVG 滤镜用于**大面积**内容（如整页地图/编辑器） | 高 | WebKit 有专门的性能缺陷记录：[Bug 287982（openstreetmap.org 编辑器因 SVG 滤镜变慢）](https://wiki.webkit.org/show_bug.cgi?id=287982)；另有 [Bug 15388](https://wiki.webkit.org/show_bug.cgi?id=15388) 指出带滤镜的 SVG 容器在边界变化时会重绘。 |
| Codrops 的结论 | — | "虽然 SVG 滤镜原则上可以动画，但**通常不建议过度使用，因为相当耗费资源**；动画尽量限制在小面积——面积越大越耗资源。"([Codrops](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)) |
| `background-attachment: fixed` | 移动端**不建议** | WebKit [Bug 33408](https://wiki.webkit.org/show_bug.cgi?id=33408)（新增 `IGNORE_FIXED_BACKGROUNDS` 开关，在低性能/移动设备上忽略固定背景以加速滚动）、[Bug 275247](https://wiki.webkit.org/show_bug.cgi?id=275247)（iOS 上 `background-attachment: fixed` 不生效）。**改用 `position: fixed` 装饰层。** |

**工程建议（移动端 / 低端设备降级链）**

1. 面积最大的那层只用**纯 CSS 渐变**（radial + repeating-linear），零滤镜成本。
2. 颗粒噪点用 **data-URI SVG `background-image`**，`background-repeat: repeat`，`background-size: 180–260px`（tile 越小，纹理越密但内存越低——注意过小会看出重复周期）。
3. **绝不动画**任何 `feTurbulence` 参数；不做"纸纹呼吸/飘动"效果。若坚持要动，用 `transform: translate3d` 平移整层（合成器动画，不重跑滤镜），而不是改滤镜参数。
4. 移动端或 `prefers-reduced-motion` / `prefers-contrast: more` / 低端设备探测下：去掉 displacement 层，`numOctaves` 降到 2，或整体关闭纸纹只留底色。
5. 给用户一个"纸质背景强度"滑块（0–100%），本质是调装饰层 `opacity`（建议上限 0.12）。
6. 不要给装饰层写 `will-change: filter`（会常驻显存），也不要给整个 `body` 加 `filter`。

### 5.2 兼容性

| 特性 | 支持情况 | 备注 |
| --- | --- | --- |
| `background-image` 引用 SVG | 所有现代浏览器（含老版本） | [CSS-Tricks 的兼容表](https://css-tricks.com/grainy-gradients/) |
| CSS `filter` | Chrome 18+/Edge 79+/Firefox 35+/Safari 6+ | 同上 |
| `feTurbulence` / `feDiffuseLighting` / `feDisplacementMap` | 主流现代浏览器均支持 | Safari 历史上对 SVG 滤镜渲染有过 bug（Codrops 文章提到按钮位移 demo 在当时 Safari 有 bug，Edge 不支持但不影响可用性）；**务必在 iOS Safari 实机验证** |
| `background-blend-mode` | 现代浏览器均支持 | 比 `mix-blend-mode` 更安全（不跨元素） |
| `mix-blend-mode` | 现代浏览器均支持 | Blink 与 WebKit 实现有细微差异，作者建议跨浏览器实测微调（[CSS-Tricks](https://css-tricks.com/grainy-gradients/)） |
| `color-mix()` | 现代浏览器（2023+） | Obsidian 方案用它从主题变量推导遮罩色；老环境需回退 |

### 5.3 可读性（这是笔记应用的红线）

**规则 1：纹理永不进入正文层的渲染路径。** 装饰层与内容层分离（见 §6 结构），正文容器不要有 `filter`、不要 `background-image` 纹理（除非把不透明度压到极低）。原因：`filter` 会把包含的文字一起栅格化，破坏子像素抗锯齿，缩放/变换时文字会糊。

**规则 2：用"最暗的那一像素"做对比度验收，而不是用平均底色。** WCAG 对正文要求对比度 ≥ 4.5:1（AA），大字 ≥ 3:1；AAA 为 7:1。([W3C WCAG 2.2 对比度最小要求](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html))

本报告实测（sRGB 相对亮度，标准公式）：

| 正文色 | 底色 | 对比度 |
| --- | --- | --- |
| `#2B2620` | 宣纸 `#F3EEE0` | **12.9 : 1** |
| `#2B2620` | 陈宣 `#E9DFC6` | 11.3 : 1 |
| `#2B2620` | 桑皮纸 `#E0CBA2` | **9.5 : 1** |
| `#E8E2D4` | 墨纸 `#1A1811` | 13.8 : 1 |
| `#D8CFBB` | 桑皮纸暗色 `#1B1710` | 11.5 : 1 |

**余量计算**（给出可操作的阈值）：

- 宣纸 + `#2B2620`：即使纹理把背景亮度压到原来的 **51%**，仍保持 7:1 以上；压到 **31%** 才跌破 4.5:1。
- 桑皮纸 + `#2B2620`：背景亮度可压到 **72%** 仍满足 7:1；压到 **43%** 才跌破 4.5:1。

**所以结论是：** 只要纹理是"亚像素级亮度抖动"（本文建议装饰层整体 `opacity ≤ 0.12`，且任何位置的等效亮度变化 ≤ ±4 sRGB 级 ≈ ±1.5% 相对亮度），对比度**几乎不可能**被破坏。真正的风险来自：
1. 用深色大斑/折痕压在正文下面（低频大对比）；
2. 暗色模式下用 `multiply` 混合（会越叠越黑）；
3. 用了原尺寸位图并整体 `opacity` 过高。

**规则 3：正文区加"纸面留白"遮罩。** 在正文容器（不是整个视口）叠加一层半透明的纸色（`rgba` 或 `color-mix`），把文字下面的纹理对比度再压一档。CSS-Tricks 关于"背景图上文字对比度"的做法（用渐变遮罩局部加深/提亮）可借鉴：<https://css-tricks.com/nailing-the-perfect-contrast-between-light-text-and-a-background-image/>

**规则 4：低频纹理用于"边框/页边"，高频纹理用于"纸面"。** 视觉上最讨喜的分工：视口四周 5–15% 区域可以有明显纸纹与暗角，正文所在的中栏只保留极弱的高频颗粒。

**建议参数上限**

| 参数 | 建议上限 |
| --- | --- |
| 装饰层整体 `opacity` | 0.12（移动端 0.08） |
| 单层 `radial-gradient` 不透明度 | 0.08（白斑）/ 0.10（暗斑） |
| 帘纹线不透明度 | 0.05 |
| 噪点层 | `soft-light` 或 `multiply`，等效不透明度 0.03–0.08 |
| 低频明暗（大斑）峰谷差 | ≤ 4% 相对亮度 |
| 正文与"最暗纹理像素"对比度 | ≥ 4.5:1（目标 ≥ 7:1） |

### 5.4 暗色模式：把纸变成"墨纸 / 夜色宣纸"

暗色模式最容易"脏"的三种做法：① 直接把浅色纸纹 `opacity` 调低盖在黑底上（得到一层灰雾）；② 用 `multiply` 混合（越叠越黑，纸纹消失）；③ 底色调成纯黑 `#000`（纸的暖意全失，且与暖色文字冲突）。

**推荐做法（可直接复用 Obsidian 的思路）：**

- **保底色，不保亮纹**：底色用**深暖墨色**而非纯黑——宣纸 `#1A1811`、桑皮纸 `#1B1710`（约等于"纸色 × 0.12 亮度"，色相保持一致）。
- **换混合模式**：浅色主题 `background-blend-mode: … multiply`；暗色主题把纸纹层换成 **`screen` / `soft-light` / `color-dodge`**。开源实现就是明暗两套规则：[Obsidian 中文论坛·纸张纹理的编辑区](https://forum-zh.obsidian.md/t/topic/55919)，其暗色分支把 `background-blend-mode: normal, multiply` 改为 `normal, color-dodge`。
- **反向噪声**：暗色下用**亮点噪声**（`feComponentTransfer` 把噪声整体提亮，或直接 `soft-light` + 白色噪声）模拟"纸浆纤维在暗处反光"。
- **降低幅值**：暗色模式的纹理幅值应比浅色主题**再低 30–50%**。人眼在暗环境对亮斑更敏感，同样不透明度会更"脏"。
- **文字用暖白而非纯白**：`#E8E2D4`（宣纸）/ `#D8CFBB`（桑皮纸），既保留纸的暖调，又避免纯白眩光。
- **帘纹在暗色下要更弱**：深色上 1px 的亮线会被读成"扫描线"。建议暗色下帘纹不透明度减半或只保留桑皮纸的粗帘纹。

---

## 6. 关键 CSS 片段（示意，非完整实现）

### 6.1 分层结构（DOM 顺序无关，靠 z-index 与 fixed 层）

```
┌ .paper-bg            position: fixed; inset:0; z-index:0; pointer-events:none; aria-hidden
│   ├ 层 1  底色        background-color
│   ├ 层 2  大尺度色斑/厚薄不均   radial-gradient ×3–5
│   ├ 层 3  纤维团/云絮          radial-gradient ×4–8（桑皮纸改小、改散、加纤维束）
│   ├ 层 4  帘纹                repeating-linear-gradient
│   ├ 层 5  细颗粒噪点          url("data:image/svg+xml,…")   ← feTurbulence
│   └ 层 6  书页明暗 / 暗角       linear-gradient（左右或上下）
└ .app-content        position: relative; z-index:1; isolation:isolate
```

**关窍**：`isolation: isolate` 加在内容容器上，确保 `mix-blend-mode` 不会溢出到别的堆叠上下文；装饰层 `pointer-events: none` 且 `aria-hidden="true"`。

### 6.2 宣纸（浅色）示意

```css
.paper--xuan {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-color: #f3eee0;                 /* 陈纸可换 #e9dfc6 */
  background-image:
    /* 2. 大尺度厚薄/色斑：极低不透明度、大尺寸 */
    radial-gradient(48% 32% at 18% 22%, rgba(255,255,255,.55), transparent 72%),
    radial-gradient(56% 28% at 78% 68%, rgba(214,197,160,.35), transparent 74%),
    /* 3. 云絮状纤维团：椭圆、方向不同 */
    radial-gradient(58px 18px at 30% 42%, rgba(255,255,255,.5), transparent 70%),
    radial-gradient(96px 22px at 66% 30%, rgba(206,188,150,.28), transparent 72%),
    radial-gradient(126px 26px at 44% 78%, rgba(255,255,255,.36), transparent 74%),
    /* 4. 帘纹：1px 线 + 6px 周期 ≈ 1.6mm @96dpi（宣纸量级 1–2mm） */
    repeating-linear-gradient(0deg, rgba(120,102,72,.05) 0 1px, transparent 1px 6px),
    /* 5. 细颗粒：feTurbulence fractalNoise，约 1.2KB data-URI（省略具体 base64） */
    url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.5'/></svg>");
  background-size: 100% 100%, 100% 100%, 240px 240px, 300px 300px, 360px 360px, auto, 200px 200px;
  background-blend-mode: normal, multiply, multiply, multiply, multiply, multiply, soft-light;
  opacity: .12;                              /* 建议上限；正文区可再压到 .08 */
}

/* 正文容器：与纸纹解耦，只加极轻的"纸面留白" */
.app-content { position: relative; z-index: 1; isolation: isolate; }
.prose { color: #2b2620; }                    /* 对 #f3eee0 为 12.9:1 */
```

### 6.3 桑皮纸（浅色）示意：更黄、更粗、更"不匀"

```css
.paper--mulberry {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-color: #e0cba2;                  /* 典型桑皮纸；粗档可换 #c8ae85 */
  background-image:
    /* 大尺度厚薄不均（透光云斑感） */
    radial-gradient(38% 26% at 24% 30%, rgba(255,246,222,.45), transparent 70%),
    radial-gradient(44% 30% at 72% 62%, rgba(150,120,80,.22), transparent 72%),
    /* 纤维束：更小、更散、更长条 */
    radial-gradient(38px 8px at 22% 34%, rgba(120,94,60,.20), transparent 70%),
    radial-gradient(64px 10px at 58% 22%, rgba(255,248,230,.45), transparent 72%),
    radial-gradient(52px 9px at 76% 74%, rgba(120,94,60,.18), transparent 70%),
    /* 粗帘纹：2 层不同周期叠加 → 去规律、显手作（≈15–38px） */
    repeating-linear-gradient(0deg, rgba(110,88,56,.06) 0 1.5px, transparent 1.5px 17px),
    repeating-linear-gradient(0deg, rgba(255,250,235,.05) 0 1px, transparent 1px 23px),
    /* 噪点：更高 baseFrequency + 略高对比，模拟粗纤维 */
    url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='220' height='220' filter='url(%23m)' opacity='0.6'/></svg>");
  background-size: 100% 100%, 100% 100%, 260px 260px, 320px 320px, 300px 300px, auto, auto, 220px 220px;
  background-blend-mode: normal, multiply, multiply, multiply, multiply, multiply, normal, soft-light;
  opacity: .14;
}
/* 稀疏深色杂点（植物残渣）：用第二张 1–2px 点阵噪声，不透明度极低 */
.paper--mulberry::after {
  content: ""; position: absolute; inset: 0;
  background-image: url("data:image/svg+xml;…");   /* 极小 tile，稀疏黑点 */
  opacity: .05; mix-blend-mode: multiply;
}
```

### 6.4 暗色模式（墨纸）

```css
.theme-dark .paper--xuan {
  background-color: #1a1811;                  /* 深暖墨色，非纯黑 */
  opacity: .06;                               /* 幅值再降 */
  background-blend-mode: normal, screen, screen, screen, screen, screen, soft-light;
  filter: none;                               /* 不要额外滤镜 */
}
.theme-dark .prose { color: #e8e2d4; }        /* 13.8:1 */
.theme-dark .paper--mulberry {
  background-color: #1b1710;
  background-blend-mode: normal, screen, screen, screen, screen, screen, normal, soft-light;
  opacity: .07;
}
.theme-dark .prose--mulberry { color: #d8cfbb; }  /* 11.5:1 */
```

### 6.5 用户可控与降级

```css
/* 用户设置：0–100% → 变量 */
.paper { opacity: calc(var(--paper-strength, 0.12)); }

@media (prefers-contrast: more), (prefers-reduced-motion: reduce) {
  .paper { opacity: 0; }                       /* 或仅留底色，去掉噪点与帘纹 */
}
@media (max-width: 640px) {
  .paper { opacity: .08; }                     /* 移动端降幅值 */
}
/* 若一定要用 feDisplacementMap 做纤维抖动，只在宽屏 + 非省电模式下启用 */
@media (min-width: 1024px) { .paper__fibres { filter: url(#fibreJitter); } }
```

---

## 7. 高质量参考文章与开源实现

| 参考 | 链接 | 可借鉴点（一句话） |
| --- | --- | --- |
| Sara Soueidan / Codrops — *SVG Filter Effects: Creating Texture with `<feTurbulence>`* | <https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/> | **纸面纹理的教科书**：`feTurbulence` + `feDiffuseLighting`/`feDistantLight` 造"粗糙纸面"；`baseFrequency` 0.02–0.2 是好起点，`numOctaves ≥5` 后收益递减，`fractalNoise` 比默认 `turbulence` 更像纸；同时明确警告"滤镜动画别大面积用"。 |
| 同系列 — *Conforming Text to Surface Texture with `<feDisplacementMap>`* | <https://tympanus.net/codrops/2019/02/12/svg-filter-effects-conforming-text-to-surface-texture-with-fedisplacementmap/> | 用噪声位移做出"纤维被水冲歪"的有机边缘；`scale` 控制强度，`xChannelSelector/yChannelSelector` 选择位移通道——适合桑皮纸的毛边与纤维抖动层。 |
| Jimmy Chion / CSS-Tricks — *Grainy Gradients* | <https://css-tricks.com/grainy-gradients/> | SVG 噪声 + CSS 渐变组合成 `background`，再用 `filter: contrast()/brightness()` 把噪声"炸"出颗粒，最后用 `mix-blend-mode: multiply` + `isolation` 收色——是把噪声变"高级"的完整配方。 |
| GSAP 论坛 — *GSAP and feTurbulence Mobile Performance* | <https://gsap.com/community/forums/topic/33075-gsap-and-feturbulence-mobile-performance/> | 反面教材与决策依据：官方直言 SVG 滤镜性能"很可怕"，只适合短时/小面积；iOS 上长时间运行 animated `feTurbulence + feDisplacementMap` 会掉帧甚至崩标签页。 |
| Obsidian 中文论坛 — 《样式分享：纸张纹理的编辑区》 + 配套 gist | <https://forum-zh.obsidian.md/t/topic/55919> ／ <https://gist.github.com/Moyf/4c2e91bc9622d4c8e528c848da1ae61e> | **与你的场景几乎同构的真实实现**（笔记应用编辑器纸纹）：1.2 KB data-URI SVG 纸纹 + `background-blend-mode: multiply` + 渐变边缘；暗色主题只改混合模式为 `color-dodge`。可直接抄架构。 |
| Obsidian 主题 *Fancy-a-story*（纸纹来源之一） | <https://github.com/ElsaTam/obsidian-fancy-a-story> | 主题级纸纹与纸张折痕（`callout-paper-fold.css`）、背景图（`background-image.css`）的组织方式，可看"纸"如何与组件系统共存。 |
| Obsidian 主题 *Retronotes*（纸纹图案来源） | <https://github.com/sr-campelo/retronotes> | 复古纸张纹理的配色与混合方式参考。 |
| Stack Overflow — *Old paper background texture with just css* | <https://stackoverflow.com/questions/14585101/old-paper-background-texture-with-just-css> | 社区经典问答，汇总"纯 CSS + SVG 噪声"做旧纸的多种写法与坑（缩放的 tile、颜色偏差）。 |
| CSS-Tricks — *Nailing the Perfect Contrast Between Light Text and a Background Image* | <https://css-tricks.com/nailing-the-perfect-contrast-between-light-text-and-a-background-image/> | 如何用渐变遮罩在"有纹理的背景"上保证文字对比度——正文可读性的直接配方。 |
| WebKit Bug 33408 / 275247 | <https://wiki.webkit.org/show_bug.cgi?id=33408> ／ <https://wiki.webkit.org/show_bug.cgi?id=275247> | 用硬证据说明为什么**不要用 `background-attachment: fixed`**，而要用 `position: fixed` 装饰层。 |
| MDN — `filter` | <https://developer.mozilla.org/en-US/docs/Web/CSS/filter> | `filter: url(#…)` 的语法与浏览器基线；也是"滤镜会创建层叠上下文/包含块"这一副作用的第一手文档。 |

---

## 8. 附录：采样方法、不确定度与待验证项

### 8.1 本文的取色方法（可复现）

- 下载来源页面中的原始图片（URL 见 §1.4 / §2.3 表格）；
- 用 `sips` 转 BMP，用 Python 读取像素；
- 对**中央 60% 区域（或人工框选的纸面区域）**做 R/G/B 分通道统计，取**中位数**为主、均值与 p10/p90 为辅；
- 剔除过暗像素（避免把阴影/木框算进纸色）。

**为什么不直接把照片色当底色**：同一批桑皮纸，暗部 `#C6AB8F` 与高光 `#F1DDC2` 相差极大；宣纸博物馆照片更是偏灰（`#89837F`）。照片反映的是"纸 × 光源 × 相机白平衡"，而 CSS 主题需要的是"纸在**白纸参考下的固有色**"。因此本文的做法是：**用文献描述定基调，用命名色定锚点，用照片采样做交叉校验，最后给出设计建议区间。**

### 8.2 明确的不确定项（诚实标注）

| 事项 | 状态 |
| --- | --- |
| **宣纸帘纹精确间距（mm）** | **未完全确证**。官方规格表给出"篾丝距 1.95–2.06"与"根/寸 30–31"两组数但未注单位，二者折算不一致（1.1 mm vs 2 mm）。本文取 **1–2 mm（每厘米 5–10 道）**。可类比西方"laid paper"的帘纹量级（每英寸 20–25 道 ≈ 1–1.3 mm）作为旁证。建议：CSS 中直接用 4–8px 周期，视觉优先于考据。 |
| **桑皮纸帘纹的绝对尺度** | 无权威数值。本文按"手工帘捞 + 纸面粗糙"推断为 4–10 mm，并给出 15–38px 的设计取值，标注为**设计推断**。 |
| **宣纸成品尺寸与"帘"尺寸的关系** | 官方表为纸帘/帘床尺寸（四尺帘 161×85 cm），与商品宣纸常见成品尺寸（四尺约 138×69 cm）不同，勿混用。 |
| **GB/T 18739-2008 的具体指标数值** | 白度 ≥75% ISO、定量 40–150 g/m²、pH 7.0–8.5、灰分 ≤1.5%、耐折度 ≥200/150 次等，来自检测机构对该标准的解读页，**未逐条核对标准原文**。若要写进产品文案，请以国家标准全文公开系统的正式文本为准。 |
| **桑皮纸 vs 楮纸（Kozo）的对比** | 属分类学 + 工艺常识（桑属 *Morus* vs 构属 *Broussonetia*），本文给出的是方向性对比；韩国韩纸的原料细节建议以 [《古代高丽纸纤维原料科学分析与相关问题研究》](http://zgzz.cnjournals.com/zgzz/article/html/202410007) 与 [Hanji 参考书表征研究](https://hal.science/hal-03324594v1/document) 为准。 |
| **宣纸"越白越好"的量化反证** | 本文依据"白度仅要求 ≥75%、过度漂白损伤纤维寿命"的检测解读与漂白工艺描述；如需硬数据，建议查《中国造纸》等期刊关于宣纸漂白与老化（耐折度/聚合度）的对照实验。 |

### 8.3 建议的落地验收清单

1. 浅色主题下正文与"最暗纹理像素"对比度 **≥ 7:1**（至少 ≥4.5:1）；
2. 装饰层 `opacity ≤ 0.12`，且 **无低频大对比**（峰谷差 ≤4% 相对亮度）；
3. 正文容器**不含任何** `filter` / `background-image` 纹理；
4. 移动端实测滚动帧率（iOS Safari + 中低端 Android），确认无 jank；
5. 暗色模式下用 `screen`/`soft-light`，**禁用 `multiply`**；
6. 提供"纸纹强度"开关与 `prefers-contrast` / `prefers-reduced-motion` 降级；
7. 两种纸的**黄度差（R−B）** 至少在视觉上可辨（宣纸 ~15，桑皮纸 ~60）。

---

## 9. 来源清单

**宣纸**
- 中国宣纸股份有限公司（红星）：[《宣纸制作工具之：纸帘、帘床》](http://www.hongxingxuanpaper.com.cn/index.php/hongixngdangjian/xianzaidajiangtang/1289.html)、[特皮类（皮含量80）](http://www.hongxingxuanpaper.com.cn/index.php/products/tepileihepihanliang80/)、[净皮类（皮含量60）](http://www.hongxingxuanpaper.com.cn/index.php/products/jingpileitanpihanliang60/)、[棉料类（皮含量40）](http://www.hongxingxuanpaper.com.cn/index.php/products/mianliaoleitanpihanliang40/)
- 中国传统文化促进会：[《宣纸（五）皮草配比中的经验与传承》](https://www.tcpc.org.cn/22738.html)、[《宣纸（九）特净净皮棉料与生宣熟宣的各自门道》](https://www.tcpc.org.cn/23063.html)
- 故宫博物院：[罗纹洒金纸（清雍正）藏品页](https://www.dpm.org.cn/collection/studie/230767.html)（含"罗纹""帘纹"释义）
- 检测机构对 GB/T 18739-2008《宣纸》的指标解读：[百检检测](https://www.baijiantest.info/cljczs/106457.html)
- 宣纸光降解/泛黄研究：[*Fluorescence and photodegradation of Xuan paper*（ScienceDirect）](https://www.sciencedirect.com/science/article/abs/pii/S1296207412001811)
- 中国非物质文化遗产网·宣纸传统制作技艺专题：<https://www.ihchina.cn/products.html>

**桑皮纸**
- 中国非物质文化遗产网：[维吾尔族桑皮纸制作技艺（Ⅷ-70，2006 第一批，新疆吐鲁番）](https://www.ihchina.cn/project_details/14386)、[桑皮纸制作技艺（Ⅷ-70，2008 第二批，安徽潜山）](https://www.ihchina.cn/project_details/14387)、[岳西项目页](https://www.ihchina.cn/project_details/14388)、[传承人刘同烟](https://www.ihchina.cn/ccr_detail/3222.html)
- 高平市人民政府：[第六批省级非遗代表性传承人推荐名单公示（含桑皮纸制作技艺－王志宁）](https://xxgk.sxgp.gov.cn/gzbm/gpwlj/fdzdgknr/ggwh/gknr/fwzwhyc_whlyj/202310/t20231009_1865258.shtml)
- 山东宣传网：[李氏桑皮纸](http://sdxc.gov.cn/whql/whcc/201912/t20191216_11543990.htm)
- 央广网：[《高质量发展看中国丨千年技艺一张纸 非遗传承绘"新"篇》](https://xj.cnr.cn/gstjxj/20250802/t20250802_527296066.shtml)
- 韩纸 / 高丽纸：[《古代高丽纸纤维原料科学分析与相关问题研究》（《中国造纸》）](http://zgzz.cnjournals.com/zgzz/article/html/202410007)、[*Characterization of Korean handmade papers collected in a Hanji reference book*（HAL）](https://hal.science/hal-03324594v1/document)
- 桑皮纤维抄纸性能：[*Preparation, Structure and Properties of Paper Sheets from Mulberry Bark*（J-STAGE）](https://www.jstage.jst.go.jp/article/fiber/68/11/68_304/_article/-char/en)

**CSS / SVG / 性能 / 可访问性**
- Codrops：[Creating Texture with `<feTurbulence>`](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)、[Conforming Text to Surface Texture with `<feDisplacementMap>`](https://tympanus.net/codrops/2019/02/12/svg-filter-effects-conforming-text-to-surface-texture-with-fedisplacementmap/)
- CSS-Tricks：[Grainy Gradients](https://css-tricks.com/grainy-gradients/)、[Nailing the Perfect Contrast Between Light Text and a Background Image](https://css-tricks.com/nailing-the-perfect-contrast-between-light-text-and-a-background-image/)
- GSAP 论坛：[GSAP and feTurbulence Mobile Performance](https://gsap.com/community/forums/topic/33075-gsap-and-feturbulence-mobile-performance/)
- Obsidian 中文论坛：[《样式分享：纸张纹理的编辑区》](https://forum-zh.obsidian.md/t/topic/55919) + [配套 gist](https://gist.github.com/Moyf/4c2e91bc9622d4c8e528c848da1ae61e)
- 开源主题：[ElsaTam/obsidian-fancy-a-story](https://github.com/ElsaTam/obsidian-fancy-a-story)、[sr-campelo/retronotes](https://github.com/sr-campelo/retronotes)
- Stack Overflow：[Old paper background texture with just css](https://stackoverflow.com/questions/14585101/old-paper-background-texture-with-just-css)
- MDN：[CSS `filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/filter)
- W3C：[WCAG 2.2 对比度最小要求（Understanding SC 1.4.3）](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- WebKit Bugzilla：[33408](https://wiki.webkit.org/show_bug.cgi?id=33408)、[275247](https://wiki.webkit.org/show_bug.cgi?id=275247)、[287982](https://wiki.webkit.org/show_bug.cgi?id=287982)
- 色名锚点：[Canva 象牙白配色页](https://www.canva.cn/colors/color-meanings/ivory/)

**本文用于取色的实物照片**
- 故宫博物院：<https://img.dpm.org.cn/Uploads/Picture/dc/20055%5B1024%5D.jpg>
- Wikimedia Commons：[Making Xuan Paper (9974514453)](https://commons.wikimedia.org/wiki/File:Making_Xuan_Paper_(9974514453).jpg)
- 央广网（新疆桑皮纸）：<https://mediabluk.cnr.cn/img/cnr/CNRCDP/2025/0725/d64279c35164a175340904740235617211.jpg>、<https://mediabluk.cnr.cn/img/cnr/CNRCDP/2025/0725/a091ed63f4d22175340801928676291711.jpg>
