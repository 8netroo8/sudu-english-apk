## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `AyuSne/english-learning`. Before reading, creating, or updating tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before triaging or applying a triage label, read `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the repo root and `docs/adr/`. Before exploring the codebase, read `docs/agents/domain.md`.

### Product scope

Before product planning or implementation, read `docs/product-scope.md` for the current scope and confirmed decisions.

### 手机版（安卓）

`src/mobile/` 是手机/安卓宿主：用 sql.js 与内存文件系统顶替 better-sqlite3 与 `node:*`，在 WebView 里注册同一套 IPC handler，渲染层无需分叉。改领域代码时请让它在两端都能跑；只在桌面可用的能力（例如从文件恢复备份、DPAPI 密钥）要在 `src/mobile/host.ts` 里显式降级并说明原因。手机版命令见 `README.md` 的「手机版」一节：`npm run dev:mobile`、`build:mobile`、`typecheck:mobile`，安卓工程用 `npx cap sync android` 同步。
