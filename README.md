# skill-template

Skill 项目模板 —— 克隆即用，快速创建能被 `npx skills add` 安装的 agent skill 仓库。

布局参考 [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) 的 `skills/` 组织方式，兼容 [skills.sh](https://skills.sh) CLI（vercel-labs/skills）以及 ZCode / Claude Code / Cursor 等 agent 的 skill 发现规则。

## 目录结构

```
skill-template/
├── skills/                  # skill 容器目录 —— skills CLI 只扫描这里（最多 3 层深）
│   └── example-skill/       # 示例 skill：标准结构 + 写法注释，发布自己的 skill 前可删除
│       ├── SKILL.md         # 必需：入口文件（frontmatter + 工作流）
│       ├── references/      # 可选：按需加载的详细文档（渐进披露）
│       ├── scripts/         # 可选：零依赖辅助脚本
│       └── assets/          # 可选：模板、fixture 等静态文件
├── templates/skill/         # 脚手架源模板（npm run new 从这里复制）
├── scripts/
│   ├── new-skill.mjs        # 创建新 skill
│   └── validate.mjs         # 校验所有 skill 的结构 / frontmatter / 引用完整性
├── .github/workflows/ci.yml # push / PR 时自动跑校验
└── package.json             # 只有两条 npm scripts，零运行时依赖
```

## 快速开始

### 1. 从模板新建仓库

先在本仓库的 GitHub 页面 **Settings → 勾选 Template repository**（一次性设置），之后新项目点 **Use this template** 即可；或者直接克隆后重置历史：

```bash
git clone https://github.com/JunDaTang/skill-template.git my-skills
cd my-skills
rm -rf .git && git init && git branch -M main
```

### 2. 脚手架创建一个新 skill

```bash
npm run new -- my-skill -d "一句话写清：做什么 + 什么时候触发"
# 完整参数（含 references/ scripts/ assets/ 全套结构）：
node scripts/new-skill.mjs my-skill -d "..." 
# 只要一个 SKILL.md：
node scripts/new-skill.mjs my-skill -d "..." --minimal
```

生成的文件里所有 HTML 注释都是写法指引，照着替换内容后删除注释即可。

### 3. 校验

```bash
npm run validate
```

检查项：frontmatter 完整性（name 与目录名一致、小写 kebab-case、≤64 字符）、description 质量、正文是否超 500 行、残留占位符 `{{...}}`、正文引用的 `references/` `scripts/` `assets/` 文件是否真实存在。CI 会在每次 push / PR 时自动运行。

### 4. 本地测试（发布前先让 agent 真的触发它）

ZCode 按以下优先级发现 skill（其他 agent 有各自的目录，如 Claude Code 用 `.claude/skills/`）：

```
<project>/.zcode/skills/<name>/SKILL.md    # 最高优先级
<project>/.agents/skills/<name>/SKILL.md
~/.zcode/skills/<name>/SKILL.md
~/.agents/skills/<name>/SKILL.md
```

把待测 skill 链过去即可：

```bash
# Git Bash / Linux / macOS
ln -s "$(pwd)/skills/my-skill" ~/.agents/skills/my-skill

# Windows PowerShell（Junction 不需要管理员权限）
# New-Item -ItemType Junction -Path "$HOME\.agents\skills\my-skill" -Target "$(pwd)\skills\my-skill"
```

然后开一个新的会话，用一个真实场景的提示词验证 skill 是否触发、行为是否符合预期。

### 5. 发布与安装

push 到 GitHub 后，任何机器上的你（或别人）都可以：

```bash
npx skills add <owner>/<repo>                    # 交互式选择装哪些
npx skills add <owner>/<repo> --skill my-skill   # 只装一个
npx skills add <owner>/<repo> -l                 # 只列出，不安装
npx skills add <owner>/<repo> -g                 # 装到用户全局目录
npx skills add <owner>/<repo> --copy             # 复制文件而不是软链（Windows 更省心）
```

验证本模板自身：`npx skills add JunDaTang/skill-template -l` 应列出 `example-skill`。

## 写好一个 skill 的要点

完整可运行的示例见 [skills/example-skill/SKILL.md](skills/example-skill/SKILL.md)，每个部分都注明了作用。

1. **description 决定触发** —— frontmatter 里只有 name + description 常驻模型上下文，description 是唯一的触发信号。必须同时写清「做什么」和「什么时候用」，并写得主动一点：模型倾向于漏触发而不是误触发。参考 OpenCLI 的写法：`Use when writing an OpenCLI adapter... Guides end-to-end from first recon through...`。
2. **渐进披露** —— SKILL.md 正文控制在 500 行内，只放工作流和决策；细节拆到 `references/`，并在正文里写明「什么时候读哪个文件」。OpenCLI 的 `opencli-adapter-author` 就是 281 行主文件 + 14 个 references 的结构。
3. **示例优于规则** —— skill 产出结构化输出就给字面量示例；要调用工具/命令就直接写出调用命令。
4. **解释为什么** —— 规则不明显时说明原因；当发现自己在写全大写 MUST/NEVER 时，通常是规则本身没写清楚。
5. **沉淀重复工作** —— 如果每次触发都要重写同一段小工具代码，把它放到 `scripts/` 里，正文直接引用。
6. **跨 skill 引用** —— 相关 skill 在 description 或正文里互相指向（「要做 X，改用 `<other-skill>`」），像 OpenCLI 的 `opencli-usage → opencli-browser` 那样组网。

## Frontmatter 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | 小写 kebab-case，1–64 字符，必须与目录名一致 |
| `description` | ✅ | 做什么 + 何时触发；主要触发信号，建议 40 字符以上 |
| `allowed-tools` | ⬜ | 限制触发后可用的工具，如 `Bash(opencli:*), Read, Edit` |
| `metadata.internal` | ⬜ | `true` 时从正常发现中隐藏（嵌套写法：`metadata:` 换行缩进 `internal: true`） |

## 设计说明

- **为什么是根目录 `skills/`**：skills CLI（`npx skills add`）扫描仓库内的容器目录——主要是 `skills/`，也兼容 `.claude/skills/`、`.agents/skills/` 等——每个容器最多走 3 层深。所以 `skills/<name>/SKILL.md` 和 `skills/<category>/<name>/SKILL.md` 都能被发现；模板默认用平铺的一层结构。
- **为什么零依赖**：脚手架和校验只用 Node 内置模块，`node scripts/*.mjs` 直接跑，不需要 `npm install`。
