# skill-template

Skill 项目模板 —— 克隆即用，快速创建能被各 agent 安装的 skill 仓库。

## Quickstart（三步上手）

```bash
# 0. 从本模板新建你的仓库（GitHub: Use this template，或）：
git clone https://github.com/JunDaTang/skill-template.git my-skills
cd my-skills && rm -rf .git && git init && git branch -M main

# 1. 创建第一个 skill（无需 npm install，零依赖）
npm run new -- my-skill -d "一句话写清：做什么 + 什么时候触发"

# 2. 边写边校验（frontmatter / 占位符 / 引用完整性 / 行数）
npm run validate
```

写完怎么测试触发、怎么发布，见下方[快速开始](#快速开始)第 3–5 步；**第一次写 skill？先读 [docs/writing-skills.md](docs/writing-skills.md)（15 分钟，带完整示例）。**

---

布局对齐当前主流 skill 仓库（[anthropics/skills](https://github.com/anthropics/skills)、[obra/superpowers](https://github.com/obra/superpowers)、[mattpocock/skills](https://github.com/mattpocock/skills)）和 [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) 的共同约定，遵循 [Agent Skills 开放规范](https://agentskills.io/specification)，兼容两条安装路径：

- **skills CLI**：`npx skills add JunDaTang/skill-template --skill <name>`
- **Claude Code 插件市场**：`/plugin marketplace add JunDaTang/skill-template`（读 `.claude-plugin/`）

## 目录结构

```
skill-template/
├── skills/                      # skill 容器目录 —— 两条安装路径都从这里发现（最多 3 层深）
│   └── example-skill/           # 示例 skill：标准结构 + 写法注释，发布自己的 skill 前可删除
│       ├── SKILL.md             # 必需：frontmatter（name + description）+ 工作流正文
│       ├── references/          # 可选：按需加载的详细文档（渐进披露）
│       ├── scripts/             # 可选：零依赖辅助脚本
│       └── assets/              # 可选：模板、fixture 等静态文件
├── .claude-plugin/
│   ├── marketplace.json         # Claude Code 插件市场入口
│   └── plugin.json              # 插件清单（新增 skill 后把路径加进 "skills" 数组）
├── templates/skill/             # 脚手架源模板（npm run new 从这里复制）
├── scripts/
│   ├── new-skill.mjs            # 创建新 skill（支持分类目录）
│   └── validate.mjs             # 校验：对齐官方规范规则集
├── .github/workflows/ci.yml     # push / PR 时自动跑校验
└── package.json                 # 只有两条 npm scripts，零运行时依赖
```

skill 数量多了可以按 `skills/<category>/<name>/` 分类（mattpocock/skills 用 engineering/、productivity/ 两类），两条安装路径都支持 3 层深发现：

```bash
npm run new -- my-skill -d "..." -c engineering   # 生成 skills/engineering/my-skill/
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
# 分类布局 / 只要一个 SKILL.md：
npm run new -- my-skill -d "..." -c engineering
node scripts/new-skill.mjs my-skill -d "..." --minimal
```

生成的文件里所有 HTML 注释都是写法指引，照着替换内容后删除注释即可。

### 3. 校验

```bash
npm run validate
```

规则对齐 [Agent Skills 规范](https://agentskills.io/specification)和 Anthropic 官方 [quick_validate.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py)：

- frontmatter 只允许规范定义的 6 个字段（name / description / license / allowed-tools / compatibility / metadata），未知字段报错
- name：1–64 字符、小写字母/数字/连字符、不以 `-` 开头或结尾、无连续 `--`、与目录名一致
- description：1–1024 字符、不含尖括号、长度过短给警告（要写清做什么+何时触发）
- 兼容性字段 ≤500 字符、metadata 值必须是字符串
- 正文残留占位符 `{{...}}`、引用的 `references/` `scripts/` `assets/` 文件是否存在、正文是否超 500 行

CI 会在每次 push / PR 时自动运行。也可以用官方参考实现做交叉验证：`npx skills-ref validate ./skills/my-skill`（见 [agentskills/agentskills](https://github.com/agentskills/agentskills)）。

### 4. 本地测试（发布前先让 agent 真的触发它）

ZCode 按以下优先级发现 skill（其他 agent 有各自的目录，如 Claude Code 用 `.claude/skills/`）：

```
<project>/.zcode/skills/<name>/SKILL.md    # 最高优先级
<project>/.agents/skills/<name>/SKILL.md
~/.zcode/skills/<name>/SKILL.md
~/.agents/skills/<name>/SKILL.md
```

把待测 skill 链过去即可（改完 skill 记得重新复制/链接，让 agent 看到最新版）：

```bash
# Linux / macOS
ln -s "$(pwd)/skills/my-skill" ~/.agents/skills/my-skill

# Windows：注意 Git Bash 的 ln -s 会静默退化成复制（不报错），
# 复制对测试也够用，但每次改完 skill 要重跑；或用 PowerShell Junction：
# New-Item -ItemType Junction -Path "$HOME\.agents\skills\my-skill" -Target "$(pwd)\skills\my-skill"
cp -r "$(pwd)/skills/my-skill" ~/.agents/skills/my-skill
```

然后开一个新的会话，用一个真实场景的提示词验证 skill 是否触发、行为是否符合预期。

### 5. 发布与安装

push 到 GitHub 后，两条安装路径：

```bash
# 路径 A：skills CLI（Cursor / Codex / Gemini CLI / ZCode 等都支持）
npx skills add <owner>/<repo>                    # 交互式选择装哪些
npx skills add <owner>/<repo> --skill my-skill   # 只装一个
npx skills add <owner>/<repo> -l                 # 只列出，不安装
npx skills add <owner>/<repo> -g                 # 装到用户全局目录
npx skills add <owner>/<repo> --copy             # 复制文件而不是软链（Windows 更省心）

# 路径 B：Claude Code 插件市场
# /plugin marketplace add <owner>/<repo>
# /plugin install skill-template@skill-template
```

注意：新增 skill 后要把它加进 [.claude-plugin/plugin.json](.claude-plugin/plugin.json) 的 `skills` 数组，marketplace/plugin 安装只认清单里声明的路径（skills CLI 则是自动扫描）。

验证本模板自身：`npx skills add JunDaTang/skill-template -l` 应列出 `example-skill`。

## 写好一个 skill 的要点

完整可运行的示例见 [skills/example-skill/SKILL.md](skills/example-skill/SKILL.md)，每个部分都注明了作用。写法循环（起草 → 测试 → 迭代）可以参考 Anthropic 官方 [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)。

1. **description 决定触发** —— frontmatter 里只有 name + description 常驻模型上下文，description 是唯一的触发信号。必须同时写清「做什么」和「什么时候用」，并写得主动一点：模型倾向于漏触发而不是误触发。参考 OpenCLI 的写法：`Use when writing an OpenCLI adapter... Guides end-to-end from first recon through...`。
2. **渐进披露** —— SKILL.md 正文控制在 500 行内（规范建议 <5000 token），只放工作流和决策；细节拆到 `references/`，并在正文里写明「什么时候读哪个文件」。OpenCLI 的 `opencli-adapter-author` 就是 281 行主文件 + 14 个 references 的结构。
3. **示例优于规则** —— skill 产出结构化输出就给字面量示例；要调用工具/命令就直接写出调用命令。
4. **解释为什么** —— 规则不明显时说明原因；当发现自己在写全大写 MUST/NEVER 时，通常是规则本身没写清楚。
5. **沉淀重复工作** —— 如果每次触发都要重写同一段小工具代码，把它放到 `scripts/` 里，正文直接引用。规范还建议文件引用保持一层深，避免嵌套引用链。
6. **跨 skill 引用** —— 相关 skill 在 description 或正文里互相指向（「要做 X，改用 `<other-skill>`」），像 OpenCLI 的 `opencli-usage → opencli-browser` 那样组网。只做手动触发（不让模型自动触发）的 skill 可参考 mattpocock 的做法：frontmatter 加 `disable-model-invocation: true`，正文写 `Call the Skill tool with "<name>".`。

## Frontmatter 字段

对齐 [Agent Skills 规范](https://agentskills.io/specification)，校验器只接受这些字段：

| 字段 | 必填 | 约束 |
|---|---|---|
| `name` | ✅ | 1–64 字符；小写字母/数字/连字符；不以 `-` 开头结尾、无 `--`；与目录名一致 |
| `description` | ✅ | 1–1024 字符；不含尖括号；做什么 + 何时触发 |
| `license` | ⬜ | 许可证名或指向仓库内许可证文件的说明 |
| `allowed-tools` | ⬜ | 空格分隔的预授权工具，如 `Bash(git:*) Read Edit`（实验性） |
| `compatibility` | ⬜ | 环境要求，≤500 字符；多数 skill 不需要 |
| `metadata` | ⬜ | 字符串到字符串的映射（嵌套写法，值要加引号） |
| `disable-model-invocation` | ⬜ | Claude Code 扩展字段：`true` 时禁止模型自动触发，只能 `/skill <name>` 手动调用 |

## 设计说明

- **为什么是根目录 `skills/`**：skills CLI 扫描仓库内的容器目录——主要是 `skills/`，也兼容 `.claude/skills/`、`.agents/skills/` 等——每个容器最多走 3 层深。anthropics/skills、superpowers、mattpocock/skills、OpenCLI 四家的 skill 全部放在根 `skills/` 下，这是事实标准。
- **为什么带 `.claude-plugin/`**：三个主流仓库全部同时提供 marketplace.json + plugin.json，Claude Code 用户通过 `/plugin marketplace add <owner>/<repo>` 一步安装。它是 skills CLI 之外的第二条分发路径，成本只有两个小 JSON 文件。
- **为什么零依赖**：脚手架和校验只用 Node 内置模块，`node scripts/*.mjs` 直接跑，不需要 `npm install`。
