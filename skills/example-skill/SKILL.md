---
name: example-skill
description: Starter skill from the skill-template repo. Demonstrates the full anatomy of an installable agent skill — frontmatter triggering, progressive disclosure, references/scripts/assets wiring — and points to the repo's scaffolding commands. Replace or delete it before publishing your own skills.
---

# example-skill

这是 skill-template 仓库自带的示例 skill，展示一个「能被 `npx skills add` 安装、能被 agent 正确触发」的 skill 完整结构。每个部分注明了写法要点。**发自己的 skill 前删掉它即可。**

## When to use this

用户想在本仓库（或从本模板克隆的仓库）里创建、校验或发布 agent skill 时使用。典型措辞：

- 「帮我新建一个 skill」→ 跑脚手架
- 「检查一下我的 skill 写得对不对」→ 跑校验
- 「发布 skill / 让别人能安装」→ 讲 `npx skills add` 流程

不适用：想从零学 skill 写法 → 直接读 [README](../../README.md) 的「写好一个 skill 的要点」。

## Workflow

1. **创建**：`npm run new -- <name> -d "<一句话：做什么 + 何时触发>"`。生成的 `skills/<name>/` 内所有 HTML 注释都是写法指引，替换成真实内容后删除。
2. **校验**：`npm run validate`。frontmatter、占位符残留、引用文件完整性都会被检查，CI 同样会跑。
3. **本地测触发**：把 `skills/<name>` 软链到 `~/.agents/skills/<name>`，开新会话用真实提示词验证。
4. **发布**：push 到 GitHub 后即可 `npx skills add <owner>/<repo> --skill <name>` 安装。

## References

- 仓库结构与发布细节：读 [README](../../README.md)。
- 需要更完整的 skill 写法范本（decision tree、strategy table、references 组网）：参考 [OpenCLI 的 skills 目录](https://github.com/jackwener/OpenCLI/tree/main/skills)。
