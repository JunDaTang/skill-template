#!/usr/bin/env node
// 校验 skills/ 下所有 skill，规则对齐 Agent Skills 官方规范（agentskills.io/specification）
// 与 Anthropic 官方 skills 仓库的 quick_validate.py：
//   - frontmatter 必填 name/description；未知字段报错
//   - name: 1-64 字符、小写字母/数字/连字符、不以连字符开头结尾、无连续连字符、与目录名一致
//   - description: 1-1024 字符、不含尖括号
//   - compatibility: ≤500 字符；metadata: 字符串到字符串的映射
//   - 正文残留 {{占位符}}、引用文件完整性、正文 ≤500 行（规范建议）
// 用法：npm run validate   （退出码非 0 = 有错误，CI 用）
// 零依赖，只使用 Node 内置模块。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, "../skills");
const MAX_BODY_LINES = 500;

// Agent Skills 规范定义的全部合法 frontmatter 字段
// （disable-model-invocation 是 Claude Code 扩展，见 README「写好一个 skill 的要点」#6）
const ALLOWED_PROPERTIES = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "compatibility",
  "metadata",
  "disable-model-invocation",
]);

const errors = [];
const warnings = [];
const found = [];

function error(skill, msg) {
  errors.push(`[${skill}] ${msg}`);
}
function warn(skill, msg) {
  warnings.push(`[${skill}] ${msg}`);
}

// ---------- discover skills: skills/<name>/SKILL.md (up to 3 levels deep, categorized layout OK) ----------
function discoverSkills(dir, depth) {
  if (depth > 3 || !fs.existsSync(dir)) return;
  const skillMd = path.join(dir, "SKILL.md");
  if (fs.existsSync(skillMd)) {
    found.push({ dir, skillMd });
    return; // a SKILL.md shadows anything nested beneath it
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) discoverSkills(path.join(dir, entry.name), depth + 1);
  }
}

if (!fs.existsSync(SKILLS_DIR)) {
  console.error("Error: skills/ directory not found.");
  process.exit(1);
}
discoverSkills(SKILLS_DIR, 1);

if (found.length === 0) {
  console.error(
    "Error: no skills found under skills/ (expected skills/<name>/SKILL.md or skills/<category>/<name>/SKILL.md).",
  );
  console.error('Create one with: npm run new -- <name> -d "<description>"');
  process.exit(1);
}

// ---------- parse frontmatter (simple YAML subset: key: value + nested metadata map) ----------
function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0] !== "---") return { ok: false, reason: "must start with '---'" };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { ok: false, reason: "missing closing '---'" };

  const fm = {};
  let currentKey = null;
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const nested = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nested && currentKey) {
      if (typeof fm[currentKey] !== "object" || fm[currentKey] === null) {
        fm[currentKey] = {}; // 字段先有值后又有子键 → 视为映射，原值被覆盖
      }
      fm[currentKey][nested[1]] = nested[2].trim();
    } else if (top) {
      currentKey = top[1];
      fm[currentKey] = top[2].trim();
    }
  }
  return { ok: true, fm, end };
}

// ---------- reference completeness ----------
// SKILL.md 正文中出现的 references/xxx、scripts/xxx、assets/xxx 必须真实存在。
function checkReferences(skillName, body, skillDir) {
  const re = /`(references|scripts|assets)\/([A-Za-z0-9._\-\/]+?)`/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const p = path.join(skillDir, m[1], m[2]);
    if (!fs.existsSync(p)) {
      error(skillName, `referenced file not found: ${m[1]}/${m[2]}`);
    }
  }
}

// ---------- validate each skill ----------
for (const { dir, skillMd } of found) {
  const name = path.basename(dir);
  const relDir = path.relative(SKILLS_DIR, dir);
  const raw = fs.readFileSync(skillMd, "utf8");

  const parsed = parseFrontmatter(raw);
  if (!parsed.ok) {
    error(relDir, `invalid frontmatter: ${parsed.reason}`);
    continue;
  }
  const { fm } = parsed;

  // unknown properties（对齐 quick_validate.py）
  const unexpected = Object.keys(fm).filter((k) => !ALLOWED_PROPERTIES.has(k));
  if (unexpected.length)
    error(
      relDir,
      `unexpected frontmatter key(s): ${unexpected.join(", ")} — allowed: ${[...ALLOWED_PROPERTIES].join(", ")}`,
    );

  // name（规范: 1-64, lowercase alnum + hyphen, 不以-开头/结尾, 无--, 与目录名一致）
  const fmName = fm.name;
  if (!fmName) error(relDir, "frontmatter: 'name' is required");
  else {
    if (fmName !== name)
      error(relDir, `frontmatter name "${fmName}" != directory name "${name}"`);
    if (!/^[a-z0-9-]+$/.test(fmName))
      error(relDir, `invalid name "${fmName}": lowercase letters, digits and hyphens only`);
    if (/^-|-$/.test(fmName) || fmName.includes("--"))
      error(relDir, `invalid name "${fmName}": cannot start/end with hyphen or contain consecutive hyphens`);
    if (fmName.length > 64)
      error(relDir, `name too long (${fmName.length} chars, max 64)`);
  }

  // description（规范: 1-1024, 不含尖括号）
  const desc = fm.description;
  if (!desc) error(relDir, "frontmatter: 'description' is required");
  else {
    if (/[<>]/.test(desc))
      error(relDir, "description cannot contain angle brackets (< or >)");
    if (desc.length > 1024)
      error(relDir, `description too long (${desc.length} chars, max 1024)`);
    // 裸冒号会被 YAML 解析成嵌套映射（skills CLI 直接跳过该 skill）—— 加引号或改用破折号
    if (/^[^"'].*:\s/.test(desc))
      error(relDir, `description contains an unquoted ":" — wrap the value in double quotes`);
    if (desc.length < 40)
      warn(
        relDir,
        `description is short (${desc.length} chars) — should cover both WHAT it does and WHEN to trigger`,
      );
  }

  // compatibility（规范: ≤500）
  if (fm.compatibility !== undefined && String(fm.compatibility).length > 500)
    error(relDir, `compatibility too long (max 500 chars)`);

  // metadata（规范: string -> string map）
  if (fm.metadata !== undefined && typeof fm.metadata === "object") {
    for (const [k, v] of Object.entries(fm.metadata)) {
      if (typeof v !== "string")
        error(relDir, `metadata.${k} must be a string (quote numbers etc.)`);
    }
  }

  const body = raw.split(/\r?\n/).slice(parsed.end + 1).join("\n");

  // placeholder leftovers
  if (/\{\{[a-zA-Z_-]+\}\}/.test(body) || /\{\{[a-zA-Z_-]+\}\}/.test(desc || ""))
    error(relDir, "unreplaced {{placeholder}} left in SKILL.md");

  // body length（规范建议 <500 行）
  const bodyLines = body.split("\n").length;
  if (bodyLines > MAX_BODY_LINES)
    warn(
      relDir,
      `body is ${bodyLines} lines (> ${MAX_BODY_LINES}) — move detail into references/`,
    );

  checkReferences(relDir, body, dir);

  // nested SKILL.md shadowing (info only)
  if (fs.readdirSync(dir).some((e) => fs.existsSync(path.join(dir, e, "SKILL.md"))))
    warn(relDir, "nested SKILL.md found — it is shadowed by this one in discovery");
}

// ---------- report ----------
console.log(`Found ${found.length} skill(s) under skills/:\n`);
for (const { dir } of found) {
  console.log(`  - ${path.relative(path.dirname(SKILLS_DIR), dir)}`);
}

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  W ${w}`);
}
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  E ${e}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
