# 素读

**一本长在自己读过的文章里的克制单词本。**

不背孤立单词表，不做刷题软件，也不堆砌打卡与记忆曲线；你可以在纸质试卷或其他软件里安心刷题，做完后再打开它，从刚才读过的文章里圈出想学的词、连同原句收进本子，用离线词典对照释义、写下自己的整理，在日后重读文章时再次遇见。

> 最新版本：[**v0.1.0 · 首个可用版本**](https://github.com/AyuSne/english-learning/releases/latest)（Windows x64）

<!-- 建议在这里放 1～2 张实际界面截图：阅读页圈词高亮 / 词条页多篇原句与回到原文 -->

---

## 为什么做「素读」

市面上的背单词软件大多把词从文章里抽出来，做成脱离语境的词表和卡片，靠遗忘曲线推着人一遍遍刷。

但真正有效、也让人愿意学下去的体验往往相反：

- **自己挑出来的词，才真的想记住。** 读书或做阅读时，把不认识的、或者虽然认识但觉得表达很好的词圈出来——选择权在自己手里，学习才是主动的。
- **记忆靠的是“亲身经历过的语境”。** 单词本里留下的不是词典编的陌生例句，而是当时亲眼读过、甚至费过一番功夫才看懂的那句原话。以后看到这句原句，整段阅读记忆都会跟着浮出来。
- **重读文章本身就是复习。** 读过的材料本来就要回头重读、培养语感；重新读一遍文章，顺眼撞见之前收过的词，不用刻意翻卡片，自然就又复习了一遍。

**素读**做的，就是把高中时「在纸质卷子上做完题 → 翻开单词本集中查词典 → 把词连带卷子上的原句记进本子 → 以后重读原文复习」这套习惯搬到电脑和手机上——**只是不用再一笔一划手抄原句**，查词典、留原句与写整理也都在同一个地方完成。

---

## 它是什么，以及它刻意不做什么

素读的定位很单纯：**专心做好一本语境单词本，不做 All-in-One。**

- **它专注做好一件事**：把你读过的文章、选出的词、当时的原句与句锚点、以及你整理下来的学习内容连成一张可来回跳转的网。
- **它刻意不做**：
  - **不做刷题、选项作答、判分与错题本** — 刷题交给纸质试卷或市面上已经很成熟的开源刷题项目，不重复造轮子，也不让做题焦虑抢走注意力；做完题再回到素读收词整理，就像高中时放在手边的专用单词本。
  - **不做艾宾浩斯排程、卡片翻转、每日打卡与时长仪表盘** — 怎么复习、何时重读，由你自己的节奏决定。
  - **不做自动灌库** — 没有东西会替你决定记什么：词条只来自你在原文里亲手圈下的词，学习内容只来自你自己写下的话。

---

## 四步学习链路

1. **打开读过的文章**
   你可以直接在素读里安静读全文，也可以在纸质试卷或其他软件刷完题后，再回来打开对应的干净原文。文章去掉了题干、选项与说明干扰，以单栏呈现；原卷自带的中文夹注默认浅色显示、可一键隐藏。

2. **圈词，连带原句收进词条**
   划选单个词或短语，正文当场高亮，常见词形变化自动归并到同一词条，并连同**逐字原句、所在文章及句锚点**一起保存；同一个词在不同文章里再次遇到，原句会按文章攒在下面，支持重新圈定与合并/拆分词条。

3. **查离线词典，写下自己的整理**
   读完或刷完题后集中整理：内置离线词典（ECDICT 裁剪版）给出音标、词性与按词性分条的中文释义，常见词形变化自动回到原形；看懂了什么、怎么记、和哪个词容易混，都写进词条的「学习内容」里，与原句放在一起。

4. **翻本子，或者重读原文**
   打开词条按文章查看自己攒下的多条原句，点一下就能**回到原文**那句话并高亮定位；学习内容就在原句旁边，随时能改；重读文章时，收过的词带弱高亮，在原本的语境里再次遇见它们。

---

## 下载与开始使用

前往 [Releases 页面](https://github.com/AyuSne/english-learning/releases/latest) 下载 Windows x64 版本（校验值见同页 `SHA256SUMS.txt`）：

- **安装包（推荐）**：`sudu-0.1.0-x64.exe` — NSIS 安装程序，按当前用户安装、无需管理员权限。
- **免安装版**：`sudu-0.1.0-x64.zip` — 解压后直接运行 `素读.exe`。

> 安装包暂未做代码签名，Windows 可能提示「未知发布者」，点击「更多信息 → 仍要运行」即可；介意的话可直接使用免安装压缩包。

**首次打开**：

1. 启动后会自动导入随包的 63 篇六级阅读真题，无需手动准备文件。
2. 阅读、圈词、查离线词典、整理学习内容与备份恢复均**完全离线可用**。
3. 圈词、查词典、写学习内容与备份恢复全部**离线可用**，不需要账号、密钥或任何网络连接。

---

## 为什么这套方式有效

这套学习流程贴合二语习得（SLA）与认知心理学里的几项核心研究结论：

| 学习动作 | 对应的认知与习得机制 | 为什么有效 |
| --- | --- | --- |
| 自己边读边圈词 | **词汇自我收集策略（VSS）** & **注意假说（Noticing）** | 把选词主动权还给学习者，提高内在动机；有意识的“注意”是将阅读输入（Input）转化为真正吸收（Intake）的前提。 |
| 先做/先读后查、对照原句整理 | **投入量假说（Involvement Load Hypothesis）** | 一次完整的 *Need（内生需要）+ Search（检索）+ Evaluation（语境评估）* 过程，比脱离语境的被动刷词留痕更深。 |
| 保留原句并回到原文 | **情景记忆** & **编码特异性原则** | 将抽象词义挂在“自己读过、做过那篇文章”的个人情景记忆上，检索时用原句与上下文作线索，提取成功率更高。 |
| 跨文章攒原句、重读与多语境再遇 | **语境学习** & **重读（Repeated Reading）** | 同一词在不同文章下积累多个真实锚点，既避免单一语境依赖，又通过重读降低理解负荷，把注意力留给词形搭配与语感。 |

### 参考文献

- Haggard, M. R. (1982). The vocabulary self-collection strategy: An active approach to word learning. *Journal of Reading*, 26(3), 203–207.
- Haggard, M. R. (1986). The vocabulary self-collection strategy: Using student interest and world knowledge to enhance vocabulary growth. *Journal of Reading*, 29(7), 634–642.
- Ruddell, M. R., & Shearer, B. A. (2002). “Extraordinary,” “Tremendous,” “Exhilarating,” “Magnificent”: Middle school at-risk students become avid word learners with the Vocabulary Self-Collection Strategy (VSS). *Journal of Adolescent & Adult Literacy*, 45(5), 352–363.
- Laufer, B., & Hulstijn, J. (2001). Incidental vocabulary acquisition in a second language: The construct of task-induced involvement. *Applied Linguistics*, 22(1), 1–26.
- Schmidt, R. W. (1990). The role of consciousness in second language learning. *Applied Linguistics*, 11(2), 129–158.
- Tulving, E. (1972). Episodic and semantic memory. In E. Tulving & W. Donaldson (Eds.), *Organization of Memory*. Academic Press.
- Tulving, E., & Thomson, D. M. (1973). Encoding specificity and retrieval processes in episodic memory. *Psychological Review*, 80(5), 352–373.
- Nation, I. S. P. (2001 / 2013 / 2022). *Learning Vocabulary in Another Language*. Cambridge University Press.

---

## 现在与之后

- **已可用（`v0.1.0`）**：随包内置 **2023—2026 年 21 套英语六级（CET-6）真题的 63 篇阅读正文**（长篇匹配与仔细阅读），跑通「读文章 → 圈词留原句 → 离线词典 → 写下学习内容 → 回到原文」核心链路；同一套界面同时跑在 Windows 桌面与安卓手机上。
- **当前收口（[issue #38](https://github.com/AyuSne/english-learning/issues/38)）**：围绕连续使用的体验断点，把「读—选—查—写—回原文」打磨成不丢状态的闭环：
  - **页面状态与跳转**：切页保留筛选与滚动位置；全局导航回到当前词条/文章；阅读页留出「打开词条 / 本篇选词（标记已读完）」出口；
  - **内容呈现与检索**：学习内容与正文共用 Markdown 排版，支持搜索学习内容及跨「词条 / 文章」全局搜索；
  - **首页与剩余核心流程**：首页真实展示「最近收集」与「稍后看」；支持文章重命名/删除、词条合并与拆分、原句移动。
- **本轮暂不做**：**PDF 原文对照**与**长回答折叠**在本轮收口中明确暂不处理；软件内作答/判分/错题本、统计仪表盘、遗忘曲线排程、多设备同步与账号体系依然保持在产品范围之外。
- **更远（不止于六级）**：先把既有材料上的个人语境单词本体验做扎实，再逐步开放通用英文文章导入，脱离单一考试限制，服务外刊、论文等更多阅读材料。

---

## 数据主权与隐私

- **单库本地存储**：文章、词条、原句与学习内容全部存在本机 SQLite 数据库中（`userData/english-learning.db`）。
- **不联网**：应用没有任何网络请求，没有账号、埋点或云端同步；圈词与查词也不需要配置任何密钥。
- **随时带走**：支持全库快照备份与恢复（恢复前自动留一份当前快照）。

---

## 本地运行与开发

需要 **Node.js >= 22.12.0**（Windows）。

```bash
npm install                # 安装依赖
npm run dev                # 启动开发模式（Electron + Vite）
npm run test               # 类型检查 + Vitest 单元测试
npm run test:e2e           # Playwright 端到端测试（开发产物）
npm run package:installer  # 构建 Windows 安装包（输出至 release-installer/）
npm run verify             # 运行完整检查链路（类型、单测、E2E 与打包产物验证）
```

<details>
<summary>开发环境变量与 Electron 下载镜像说明</summary>

开发模式会读取仓库根目录 `.env`（参考 [`.env.example`](./.env.example)），只用来改语料与词典的位置：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CORPUS_DIRECTORY` | 主进程产物旁的 `corpus/` | 语料目录，E2E 与调试时指到别处 |
| `DICTIONARY_DIRECTORY` | 主进程产物旁的 `dictionary/`（打包后 `resources/dictionary/`） | 随包词典目录 |

若 `npm install` 在下载 Electron 二进制时卡住，可先设置镜像再安装：

```powershell
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_CUSTOM_DIR = '{{ version }}'
npm install
```

</details>

## 手机版（安卓 / 手机浏览器）

同一套界面与领域逻辑可以在手机浏览器里直接跑，也能用 Capacitor 套成安卓 App。手机版只是换了一套「底座」，`src/shared`、`src/renderer` 与 `src/main` 里的领域代码两端共用。

```bash
npm run dev:mobile        # 手机版开发服务器（监听 0.0.0.0:5199，手机与电脑同一 Wi-Fi 时用 http://<电脑IP>:5199 试）
npm run build:mobile      # 产出 out/mobile/（静态站点，入口是 index.html）
npm run preview:mobile     # 预览构建产物（4199）
npm run typecheck:mobile  # 手机版类型检查（含 src/mobile 与 Capacitor 配置）
```

安卓工程（`android/`）由 Capacitor 生成并管理：

```bash
npm run build:mobile
npx cap sync android      # 把 out/mobile 同步进 android/app/src/main/assets/public
npx cap open android      # 用 Android Studio 打开并打包（需要 JDK 21 与 Android SDK 36）
```

打包 APK 需要本机装有 JDK 21 与 Android SDK 36；仓库里只提交工程与 Web 产物，不提交构建缓存。

手机版与桌面版的差异（改代码时容易踩，都集中在 `src/mobile/`）：

- **数据库**：桌面用 better-sqlite3；手机端 `src/mobile/sqlite.ts` 用 sql.js（WASM）实现了同一套 API，数据库字节存进 IndexedDB，切后台或关页面前落盘。
- **文件系统**：`src/mobile/vfs.ts` 是内存文件系统，并给 `node:fs`/`node:path`/`node:crypto`/`node:os` 提供替身；语料与词典在启动时读进内存（`src/mobile/storage.ts`）。
- **IPC**：`src/mobile/host.ts` 把主进程那 40 个 handler 原样在 WebView 里注册，渲染层的 `window.api` 契约一个字没改。
- **备份 / 恢复**：手机端能生成备份并下载/分享出去；「从文件恢复」暂未接通（桌面端支持）。

界面适配在 `src/renderer/src/styles/mobile.css`：≤820px 时侧边导航换成底部导航、阅读页改单列、词条页拆成「列表 / 详情」两屏；触屏额外有「长按选中 → 点『收为词条』」的收词按钮。

### 在线打包 APK

本机不需要装 JDK 与 Android SDK，两种云端打包方式都已把配置写好：

| 方式 | 需要什么 | 产物 |
| --- | --- | --- |
| GitHub Actions（推荐） | 一个 GitHub 仓库，免费额度约 2000 分钟/月 | `sudu-debug-apk`（可直接装）、可选 `sudu-release-apk` |
| Codemagic | 一个 Codemagic 账号，免费额度约 500 分钟/月，不用写 CI | 同上 |

**GitHub Actions**：把仓库推到 GitHub 后，Actions 页面会出现「安卓 APK」工作流（配置在 [`.github/workflows/android.yml`](./.github/workflows/android.yml)）。如果本机没有 git，可以用一个 Personal Access Token 走 API 推送（建仓库 + 上传 + 触发构建）——token 在这里生成：

- Fine-grained token：<https://github.com/settings/personal-access-tokens/new>（Contents / Workflows 需 Read and write）
- Classic token：<https://github.com/settings/tokens/new>（勾 `repo` 与 `workflow`）

1. Actions → 安卓 APK → **Run workflow**
2. 等约 5–8 分钟（首次要下载 Gradle 与 SDK 依赖）
3. 在该次运行页面底部的 **Artifacts** 下载 `sudu-debug-apk.zip`，解压得到 `app-debug.apk`，传到手机直接安装（需允许「安装未知来源应用」）

想要可签名的正式包，在仓库 Settings → Secrets 里加四个值：

| Secret | 说明 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 密钥库文件的 base64：`base64 -w0 sudu-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | 密钥库口令 |
| `ANDROID_KEY_ALIAS` | 别名 |
| `ANDROID_KEY_PASSWORD` | 别名口令 |

本地生成密钥库：`keytool -genkeypair -v -keystore sudu-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sudu`。密钥库不要提交到仓库（`.gitignore` 已排除 `*.jks`）。

**Codemagic**：把仓库连到 Codemagic，工作流「素读 Android」来自 [`codemagic.yaml`](./codemagic.yaml)，`Start new build` 后在 Artifacts 里下载 APK；签名同样通过环境变量注入。

**本机打包**（离线可用，但需要先装 JDK 21 与 Android SDK 36，约 2 GB）：装好后执行 `npm run android:sync`，再 `cd android; .\gradlew.bat assembleDebug`，产物在 `android/app/build/outputs/apk/debug/app-debug.apk`。

### 结构与文档导航
```text
src/
├── main/      主进程（SQLite 迁移、语料导入、离线词典、备份恢复、IPC）
├── mobile/    手机端宿主（内存文件系统、sql.js 垫片、window.api 调度、Capacitor 分享）
├── preload/   受白名单约束的 contextBridge
├── renderer/  React 界面（首页、阅读、词条、文章库、设置）
└── shared/    跨层类型与唯一 IPC 契约
android/       Capacitor 安卓工程（npx cap sync 更新其中的 Web 产物）
docs/          领域术语、产品范围、架构决策（ADR）与语料
assets/        随包离线词典及版权声明
e2e/           Playwright 端到端测试
```

- 领域术语表：[GLOSSARY.md](./GLOSSARY.md)
- 首版产品范围：[docs/product-scope.md](./docs/product-scope.md)
- 架构决策记录（桌面技术栈 / 首批语料 / 文章库维护）：[docs/adr/](./docs/adr)
- 首批 63 篇真题语料说明：[docs/corpus/README.md](./docs/corpus/README.md)
- 随包离线词典说明：[assets/dictionary/README.md](./assets/dictionary/README.md)

---

## 开源致谢

- 内置离线词典基于 [ECDICT](https://github.com/skywind3000/ECDICT)（MIT License）裁剪构建，许可声明随包保留于 [`assets/dictionary/LICENSE-ECDICT`](./assets/dictionary/LICENSE-ECDICT)。
