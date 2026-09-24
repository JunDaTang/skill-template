---
name: {{name}}
description: {{description}}
---

<!--
  ↑ frontmatter 是唯一的「常驻上下文」——只有 name 和 description 会一直占用模型上下文。
  写法要求：
  - name：小写 kebab-case，1–64 字符，必须与目录名一致（脚手架已保证）。
  - description：必须同时回答「做什么」+「什么时候用」，写得主动一点。
    模型倾向于漏触发而不是误触发，所以要覆盖用户可能的措辞。
    反例：Helps with data processing.
    正例：Process and normalize CSV/Excel export files. Use whenever the user mentions
          cleaning data, deduplicating rows, or converting spreadsheets — even if they
          don't say "process" explicitly.
  可选字段（按需取消注释）：
  allowed-tools: Bash(git:*), Read, Edit, Write   # 限制触发后可用的工具
-->

# {{name}}

<!--
  正文第一段：1–3 句话说清这个 skill 让 agent 能做什么、边界在哪。
  这是触发后模型读到的第一批内容，直接决定它是否「理解任务」。
-->

## When to use this

<!--
  触发条件清单：用户会怎么措辞、什么场景、什么前置条件。
  和 description 呼应但可以更细，包括「什么时候不该用」以及该改用哪个 skill。
  跨 skill 引用示例：For ad-hoc browser driving (no adapter), see `other-skill` instead.
-->

## Workflow

<!--
  核心价值所在：把「怎么做」写成带决策点的步骤，而不是知识点罗列。
  - 用祈使句（Read the file before editing）。
  - 每步写清输入输出和判断分支。
  - 规则不明显时解释为什么 —— 模型理解了原因才会在边界情况做出正确判断。
  - 产出结构化输出？给一个字面量示例。
  - 要调用命令/工具？直接写出调用命令。
-->

1. Step one — what to check first, and what the answer decides.
2. Step two — ...

## References

<!--
  渐进披露：正文只放工作流和决策（目标 <500 行），细节拆到 references/，
  在这里写明「什么情况读哪个文件」。模型不会主动翻文件，必须显式指路。

  - Read `references/advanced.md` when <condition>.
-->
