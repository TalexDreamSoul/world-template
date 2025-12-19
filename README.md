# world-template

这个仓库现在是一个小型 monorepo：

- `packages/*`：从 `microtown/src/lovevariety` 迁移过来的 lv 核心包（单份来源）
- `src/`：模板示例脚本入口（`bun run build` 会打到 `dist/index.js`）
- `src/lovevariety/*`：前端/worker 侧的宿主代码（用于加载脚本并运行）

## 安装依赖

```bash
bun install
```

## 打包产物

产物为 `dist/index.js`（供宿主通过 worker 加载执行）。

```bash
bun run build
```

## （可选）bun link 工作流

需要把本仓库的包 link 到别的项目时：

```bash
bun run link:register
```
