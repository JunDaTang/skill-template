# 如何制作一个 Skill —— 教学指南

本指南教你从零做出一个「能被 agent 正确触发、能被安装分发」的 skill。所有示例都可直接复制使用；仓库里有两个活样本可对照：[skills/example-skill](../skills/example-skill/SKILL.md)（结构示范）、[skills/skill-release](../skills/skill-release/SKILL.md)（工作流型 skill 范本）。

---

## 0. Skill 是什么（30 秒版）

一个 skill = 一个文件夹 + 一个 `SKILL.md`：

```
my-skill/
├── SKILL.md        # 必需：元数据（frontmatter）+ 指令（正文）
├── references/     # 可选：按需加载的详细文档
├── scripts/        # 可选：可执行辅助脚本
└── assets/         # 可选：模板、fixture 等静态文件
```

agent 对 skill 的加载是**渐进披露**的三层：

| 层 | 何时加载 | 大小预算 |
|---|---|---|
| ① name + description | 会话启动时常驻 | ~100 token / skill |
| ② SKILL.md 正文 | 触发时一次性读入 | <5000 token（约 500 行） |
| ③ references/ 等文件 | 正文指路时才读 | 不限 |

这决定了全部写法原则：**description 是触发信号要写好；正文是操作手册要精炼；细节下沉到 references。**

---

## 1. 制作循环总览

```
定意图 → 起草 → 测试触发 → 迭代 ─┐
   ↑______________________________┘
                 │ 改了也没变化
                 ▼
              发布（三道门）
```

和 TDD 同构：「测试」对应「让 agent 真的触发它」。每轮循环通常 10–30 分钟。

---

## 2. 第一步：定意图

好 skill 的最佳来源不是凭空设计，而是**你手动做过 2–3 次的固定流程**。起草前先回答四个问题：

1. 这个 skill 要让 agent 能做什么？
2. 什么时候触发？用户会怎么措辞（含口语、错别字）？
3. 期望的输出格式长什么样？
4. 有没有真实的输入/输出示例可以钉住行为？

**示例**：你每次让 agent 清洗导出的 CSV 都要重复交代「去重、修日期格式、空列删掉」，这就是 csv-cleaner 的意图——

> 1. 做什么：清洗 CSV 导出文件（去重、统一日期、删空列）。
> 2. 何时触发：「清洗一下数据」「这两列重复了」「修一下导出的表格」，英文 "clean this export"。
> 3. 输出：清洗后的文件 + 变更摘要（删了几行、改了几处）。
> 4. 示例：`orders_2026-09.csv`（有重复订单号和 `9/24/2026` 式日期）。

如果四个问题答不清楚——尤其是第 2 问——说明还没到写 skill 的时候，先把流程手动走顺。

---

## 3. 第二步：起草

用仓库脚手架生成骨架：

```bash
npm run new -- csv-cleaner -d "Clean and normalize CSV/Excel export files — deduplicate rows, normalize dates, drop empty columns. Use whenever the user mentions cleaning data, dirty exports, duplicate rows, or spreadsheet cleanup, even without the word \"clean\"."
```

然后逐部分填充。生成文件里的 HTML 注释就是各部分的写法指引，填完删掉。

### 3.1 Frontmatter：只有 6 个合法字段

[官方规范](https://agentskills.io/specification)定义的字段（校验器会拒绝其他字段）：

| 字段 | 必填 | 约束与示例 |
|---|---|---|
| `name` | ✅ | 小写字母/数字/连字符，1–64 字符，无 `-` 开头/结尾、无 `--`，与目录名一致 |
| `description` | ✅ | 1–1024 字符，不含尖括号 `<>`，含冒号 `:` 必须整体加双引号 |
| `license` | ⬜ | `MIT` 等许可证名 |
| `allowed-tools` | ⬜ | 空格分隔的预授权工具：`Bash(git:*) Read Edit`（实验性） |
| `compatibility` | ⬜ | 环境要求 ≤500 字符：`Requires Node 20+ and git`（多数 skill 不需要） |
| `metadata` | ⬜ | 字符串映射，值要加引号（嵌套写法见下） |

完整示例：

```yaml
---
name: csv-cleaner
description: "Clean and normalize CSV/Excel export files — deduplicate rows, normalize dates, drop empty columns. Use whenever the user mentions cleaning data, dirty exports, duplicate rows, or spreadsheet cleanup."
license: MIT
allowed-tools: Read Write Edit
compatibility: Requires Node 20+ (scripts use built-in fs only)
metadata:
  author: JunDaTang
  version: "1.0"
---
```

**两个高频翻车点**（本仓库真实踩过）：

- description 里的裸冒号会被 YAML 解析成嵌套映射，导致安装 CLI 直接跳过该 skill。解法：整个值加双引号。中文全角冒号「：」不受影响，半角 `:` 才有问题。
- `metadata` 的数字值必须加引号（`version: "1.0"` 不是 `version: 1.0`），规范要求字符串到字符串的映射。

### 3.2 Description：唯一的触发信号

常驻上下文的只有 name + description，所以 **description 决定触发**。它必须同时回答「做什么」+「什么时候用」，并且写得主动——模型倾向于**漏**触发而不是误触发，所以要主动覆盖用户可能的措辞。

好坏对比（真实感来自具体动词和场景，不是形容词）：

```yaml
# ❌ 坏：既没说何时用，也没覆盖措辞
description: Helps with data processing.

# ❌ 坏：只说何时用，没说做什么
description: Use when the user has CSV files.

# ✅ 好：做什么 + 何时用 + 措辞覆盖（含中英文）
description: "Clean and normalize CSV/Excel export files — deduplicate rows, normalize dates, drop empty columns. Use whenever the user mentions cleaning data, dirty exports, duplicate rows, or spreadsheet cleanup, even without the word \"clean\"."
```

一个实用测试：把 description 拿给同事看，问他「用户说什么话会让你想起它？」他答不出来的措辞，模型大概率也匹配不上。

### 3.3 正文：写工作流，不写百科

正文是触发后模型的操作手册。三种成分要有：

1. **带决策点的步骤**（每步写清输入输出和判断分支）
2. **字面量示例**（产出结构化输出就必须给；要调命令就直接写出命令）
3. **为什么**（规则不明显时解释原因——模型理解了原因才会在边界情况做对判断）

对比（同一个 skill 的两种写法）：

```markdown
# ❌ 百科式：知识点罗列，模型读了一堆但没有行为改变
## 数据清洗知识
数据清洗包括去重、格式标准化、空值处理。
去重可以用 pandas 的 drop_duplicates()。
日期格式推荐 ISO 8601。
```

```markdown
# ✅ 工作流式：决策点 + 命令 + 输出格式
## Workflow
1. Read the file and report: row count, columns, date column format detected.
   - 日期列同时出现 `9/24/2026` 和 `2026-09-24` 两种格式 → 需要标准化，继续。
   - 只有一种格式且是 ISO → 跳过日期步骤，在摘要中注明。
2. Drop exact-duplicate rows, keeping the first occurrence:
   `node scripts/dedupe.mjs <file>`
3. 汇报格式（必须遵循）：
   Cleaned: 312 rows → 298 rows (-14 duplicates)
   Dates normalized: 45 values from M/D/YYYY to YYYY-MM-DD
   Empty columns dropped: remark, internal_note
```

### 3.4 渐进披露：细节下沉

正文超 500 行、或某类细节只在特定分支需要时，拆到 `references/`，并在正文**显式指路**——模型不会主动翻文件：

```markdown
## Workflow
...
4. Read `references/encoding-pitfalls.md` before writing files that contain
   non-ASCII text (中文列名、emoji) — it covers BOM 和 GBK 转换的坑。
```

references 文件按主题命名（`encoding-pitfalls.md` 而不是 `details-1.md`），这样指路语句自解释。文件引用保持一层深，避免嵌套引用链。

**什么时候拆**：正文里出现「只有 X 情况才用得上」的大段内容 → 拆；每轮都要读的核心流程 → 留在正文。参考量级：OpenCLI 的 `opencli-adapter-author` 是 281 行主文件 + 14 个 references。

### 3.5 完整示例：一个 40 行的工作流型 skill

以下是 [skills/skill-release](../skills/skill-release/SKILL.md) 的骨架（发布检查流水线），展示了「三道门 + 报告格式」的标准写法：

```markdown
---
name: skill-release
description: "Pre-release checklist that publishes skills from a skill-template repo —
  validation, plugin.json registration, push, and remote-discovery verification.
  Use whenever the user wants to publish, release, or make a skill installable —
  phrases like \"发布 skill\", \"推个新版本\", \"make it installable\"."
---

# skill-release

把「发布一个 skill」变成三道门的固定流水线：校验 → 注册 → 远端可发现。
任何一道门失败就停下来修，不要带病发布。

## Why gates matter

（一段解释每道门抓什么错误、为什么缺一不可——给模型的判断依据）

## Workflow

### Gate 1 — 校验
npm run validate
- 退出码非 0 → 停。按错误清单逐条修复后重跑。

### Gate 2 — 注册清单
读 .claude-plugin/plugin.json，确认 skills 数组包含该 skill 的路径，缺了就加。

### Gate 3 — 提交与推送
git status 确认无无关文件 → commit → push。

### 远端验证（推送后必做）
npx skills add <owner>/<repo> -l
- 输出包含刚发布的 skill 名 → 发布完成。

## 报告格式

Gate 1 validate:   PASS
Gate 2 plugin.json: PASS (already registered)
Gate 3 push:       PASS (a1b2c3d)
Released: skill-release
```

注意三个设计点：门禁是**决策点**（每门有失败分支）；命令是**字面量**（不是「运行校验」的描述）；报告格式给了**模板**（输出一致可预期）。

---

## 4. 第三步：测试触发

起草完先本地校验，再做触发测试：

```bash
npm run validate          # 格式门禁
```

然后把 skill 链到 agent 的发现目录（模拟已安装状态）：

```bash
# Linux / macOS
ln -s "$(pwd)/skills/csv-cleaner" ~/.agents/skills/csv-cleaner

# Windows（Git Bash 的 ln -s 会静默退化成复制，对测试够用，但每次改完要重跑）
cp -r "$(pwd)/skills/csv-cleaner" ~/.agents/skills/csv-cleaner
# 或 PowerShell Junction（自动跟随源目录更新）：
# New-Item -ItemType Junction -Path "$HOME\.agents\skills\csv-cleaner" -Target "$(pwd)\skills\csv-cleaner"
```

**开一个全新会话**（关键：旧会话有你写 skill 时的上下文，会污染判断），用 2–3 个真实场景提示词去试——带具体文件路径、随意措辞、甚至错别字：

```
测试 1（正向，随意措辞）：这个 orders_2026-09.csv 有两列重复了，帮我弄一下
测试 2（正向，英文）：   can you fix up this export? dates look like a mess
测试 3（反向，不该触发）：帮我把这个 CSV 转成 Markdown 表格
```

看两样东西：

- **结果**：输出格式、清洗动作是否符合第 2 步定好的预期？
- **轨迹**：skill 触发了吗？有没有让模型做无用功（反复读同一文件、绕圈、无视指路语句）？

轨迹出问题通常是 skill **过度规定或不清晰**，信号是要删减而不是加规则。

反向测试（测试 3）同样重要：一个见了「CSV」就触发的 skill 会污染无关任务。测试完删掉软链。

---

## 5. 第四步：迭代

每轮测试反馈做四类改动，直到「改了也没变化」：

1. **泛化**：你只测了几个例子，skill 要对没见过的输入成立。顽固问题换框架表述，而不是叠加 MUST/NEVER——当发现自己在写全大写禁令时，通常是规则本身没解释清楚。
2. **瘦身**：删除不产生作用的内容。模型在 token 上浪费的地方就是该删的地方。
3. **解释为什么**：用户的反馈往往很简短（「不对」「还是不行」），要还原成模型能理解的原因写进去。
4. **沉淀重复**：每次触发都独立写出同一段辅助代码 → 移到 `scripts/` 引用一次。

**真实案例（本仓库）**：`skill-release` 首发时本地校验全绿，但远端 `npx skills add -l` 跳过了它——description 里的裸冒号（`repo: runs`）让 YAML 解析失败。修复分两层：当场改（description 加双引号）；泛化（给 `validate.mjs` 加「未加引号的冒号」检测规则）。**第二层才是迭代的核心动作——一个具体 bug 的解药应该变成所有未来 skill 的疫苗。**

---

## 6. 发布：三道门

1. **校验**：`npm run validate` 全绿（CI 也会跑）。
2. **注册**：把 skill 路径加进 [.claude-plugin/plugin.json](../.claude-plugin/plugin.json) 的 `skills` 数组——marketplace 安装只认清单里声明的路径（skills CLI 是自动扫描，但注册对两条路径都无害）。
3. **远端验证**：push 后跑 `npx skills add <owner>/<repo> -l`，确认新 skill 出现在列表里。这一步能抓住所有「本地好好的、push 之后才发现」的问题。

push 之后任何人都可以安装：

```bash
npx skills add <owner>/<repo> --skill csv-cleaner   # skills CLI（Cursor/Codex/Gemini CLI/ZCode…）
# /plugin marketplace add <owner>/<repo>            # Claude Code 插件市场
```

仓库自带的 `skill-release` skill 会自动走完这三道门——发布时直接说「发布 xxx skill」即可。

---

## 7. 常见坑速查

| 症状 | 原因 | 解法 |
|---|---|---|
| 永远不触发 | description 没写「何时用」 | 补触发条件 + 用户措辞覆盖 |
| 无关任务也触发 | description 太宽泛（如 "Helps with data"） | 收窄到具体动词和场景 |
| 触发了但行为不对 | 正文是知识罗列不是工作流 | 改成带决策点的步骤 + 字面量命令 |
| 模型不读 references | 指路语句缺失或模糊 | 正文显式写「X 情况读 `references/xxx.md`」 |
| 模型在边界情况乱来 | 规则只有禁令没有理由 | 加一段「为什么」，替换 MUST/NEVER |
| 安装 CLI 跳过该 skill | description 裸冒号 / frontmatter 未知字段 / name 与目录不一致 | `npm run validate` 会抓；description 含 `:` 就整体加引号 |
| 每次触发都重写同一段代码 | 重复工作没沉淀 | 移到 `scripts/`，正文引用 |
| 本地好、远端没有 | 没 push / 布局超 3 层深 / 没进 plugin.json | 发布三道门的最后一门就是为它设的 |

---

## 8. 延伸参考

- [Agent Skills 官方规范](https://agentskills.io/specification) —— 字段约束、渐进披露、校验工具（`skills-ref validate`）
- [anthropics/skills](https://github.com/anthropics/skills) 的 [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) —— 官方创建循环 + 量化评估脚本
- [obra/superpowers](https://github.com/obra/superpowers) —— 大型 skill 库的组织方式（分类、组网、bootstrap）
- [mattpocock/skills](https://github.com/mattpocock/skills) —— 手动触发模式（`disable-model-invocation: true`）
- [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) —— 单个复杂 skill 的 references 组网范本（`opencli-adapter-author`）
- 本仓库 [README](../README.md) —— 目录结构、安装路径、设计说明
