# DAO.md — mille 项目指令

## 项目用途

mille:基于 Tauri 2 的桌面端社交/照片分享应用(信息流、贴纸、底部导航,日系可爱风格)。
当前主体仍是 Tauri + Preact 模板(greet demo);`mille-mock-reference/` 是用 Next.js 做的完整 UI 设计稿,是前端要实现的目标参考,不属于主应用构建。

## 技术栈

- **根项目**:Tauri 2(Rust,edition 2024)+ Preact 10 + TypeScript + Vite 8,包管理 **bun**
- **mille-mock-reference/**:Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui,包管理 **pnpm**(独立项目,有自己的 lockfile)

## 目录结构要点

- `src/` — 前端(Preact):入口 `main.tsx`,`App.tsx` 为当前页面
- `src-tauri/` — Rust 后端:
  - `src/lib.rs` — Tauri 命令定义与注册(`#[tauri::command]` + `generate_handler!`)
  - `src/main.rs` — 入口,调用 `mille_lib::run()`
  - `capabilities/` — 窗口权限声明,`tauri.conf.json` — 应用配置
- `mille-mock-reference/` — UI 设计稿(Next.js),改前端前先看它对齐设计
- `.dao/` — dao 工具自身目录,不要动

## 关键约定

- **Preact JSX**:属性用 `class` 不是 `className`;hooks 从 `preact/hooks` 导入
- **TS 严格模式**:`strict` + `noUnusedLocals`/`noUnusedParameters`,未使用变量会导致 `bun run build` 失败
- **Rust 命令**:新增命令在 `lib.rs` 写 `#[tauri::command]` 并加入 `generate_handler![...]`;前端通过 `invoke("cmd", { args })`(来自 `@tauri-apps/api/core`)调用
- 包管理器按目录区分:根用 bun,`mille-mock-reference/` 用 pnpm,不要混用(会生成多余的 lockfile)

## 常用命令

```bash
bun install              # 根项目依赖
bun run dev              # 仅 Vite 前端(http://localhost:1420)
bun run tauri dev        # 完整桌面应用(dev 模式)
bun run build            # tsc && vite build
bun run tauri build      # 打包桌面应用
cd src-tauri && cargo check   # Rust 编译检查
cd src-tauri && cargo test    # Rust 测试
cd mille-mock-reference && pnpm install && pnpm dev   # 跑 UI 设计稿(localhost:3000)
```

无 ESLint/前端测试配置;类型检查靠 `tsc`,`cargo check` 检查 Rust。

## 注意事项与坑

- Vite 端口固定 1420(`strictPort: true`),被占用时 `tauri dev` 直接失败
- `vite.config.ts` 里 `import process from "node:process"` 带 `@ts-expect-error` 注释是有意的(根项目不装 `@types/node`),不要删
- `src-tauri/src/main.rs` 顶部的 `windows_subsystem = "windows"` 属性不要删除(防止 Windows release 弹控制台窗口)
- Cargo lib 名 `mille_lib` 是有意的(规避 Windows 上 bin/lib 同名冲突),不要改名
- 新增 Tauri plugin 需在 `src-tauri/capabilities/default.json` 的 `permissions` 中声明,否则前端调用被拒
- `tauri.conf.json` 的 `beforeDevCommand`/`beforeBuildCommand` 用的是 `bun run ...`,别改成 npm
- 开发时 Vite 已配置忽略 `src-tauri/**`,改 Rust 代码后需重新 `bun run tauri dev` 或手动 `cargo check`
