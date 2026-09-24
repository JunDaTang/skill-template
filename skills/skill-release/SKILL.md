---
name: skill-release
description: "Pre-release checklist that publishes skills from a skill-template repo — validation, plugin.json registration, push, and remote-discovery verification. Use whenever the user wants to publish, release, push out, or make a skill installable — phrases like \"发布 skill\", \"推个新版本\", \"check if it's ready to ship\", \"make it installable\". Also use before pushing any change to skills/."
---

# skill-release

把「发布一个 skill」变成三道门的固定流水线：**校验 → 注册 → 远端可发现**。全部通过才 commit & push；任何一道门失败就停下来修，不要带病发布。

## Why gates matter

发布后的 skill 会被 `npx skills add` 和 Claude Code marketplace 两条路径分发。校验器抓的是格式错误，清单注册抓的是「marketplace 装不上」（它只认 `plugin.json` 里声明的路径），远端验证抓的是「本地好好的、push 之后才发现没被发现」。三道门各管一段，缺一不可。

## Workflow

### Gate 1 — 校验

```bash
npm run validate
```

- 退出码非 0 → 停。按错误清单逐条修复后重跑，不要跳过。
- 常见错误：frontmatter 未知字段、name 与目录不一致、description 含尖括号、残留 `{{占位符}}`、引用的 `references/` 文件不存在。
- 警告（description 过短、正文超 500 行）不阻塞发布，但 description 过短意味着触发不可靠——建议当场改。

### Gate 2 — 注册清单

读 `.claude-plugin/plugin.json`，确认 `skills` 数组包含待发布 skill 的路径：

- 平铺布局对应 `./skills/<name>`；分类布局对应 `./skills/<category>/<name>`。
- 缺了就加（JSON 数组追加，保持现有顺序），并在 commit message 里注明。
- 只改了已注册 skill 的内容 → 本门直接通过。

### Gate 3 — 提交与推送

1. `git status` 确认没有无关文件混入。
2. commit message 用一行说清发布了哪个 skill、改了什么。
3. `git push`。

### 远端验证（推送后必做）

```bash
npx skills add <owner>/<repo> -l
```

- 输出包含刚发布的 skill 名 → 发布完成。
- 没包含 → 大概率是分支没推上去或路径布局不被扫描（skills CLI 只扫容器目录内 3 层深），排查后重推。

## 报告格式

每道门汇报一行结果，全部通过时收尾：

```
Gate 1 validate:        PASS
Gate 2 plugin.json:     PASS (already registered)
Gate 3 push:            PASS (a1b2c3d)
Remote discovery:       PASS — 'skill-release' listed

Released: skill-release
```

失败时对应行写 `FAIL` + 修复建议，然后停在该门，不继续后面的步骤。
