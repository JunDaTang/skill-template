#!/usr/bin/env node
// 校验 skills/ 下所有 skill：结构、frontmatter、占位符残留、引用完整性、正文长度。
// 用法：npm run validate   （退出码非 0 = 有错误，CI 用）
// 零依赖，只使用 Node 内置模块。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, "../skills");
const MAX_BODY_LINES = 500;

const errors = [];
const warnings = [];
const found = [];

function error(skill, msg) {
  errors.push(`[${skill}] ${msg}`);
}
function warn(skill, msg) {
  warnings.push(`[${skill}] ${msg}`);
}

// ---------- discover skills: skills/<name>/SKILL.md (up to 3 levels deep) ----------
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
    "Error: no skills found under skills/ (expected skills/<name>/SKILL.md).",
  );
  console.error("Create one with: npm run new -- <name> -d \"<description>\"");
  process.exit(1);
}

// ---------- parse frontmatter (simple YAML subset: key: value + nested metadata) ----------
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
    const nested = line.match(/^\s+(\S+):\s*(.*)$/);
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nested && currentKey) {
      fm[currentKey] = fm[currentKey] ?? {};
      fm[currentKey][nested[1]] = nested[2].trim();
    } else if (top) {
      currentKey = top[1];
      fm[currentKey] = top[2].trim();
    }
  }
  return { ok: true, fm, end };
}

// ---------- reference completeness ----------
// SKILL.md 正文中出现 references/xxx、scripts/xxx、assets/xxx 时，对应文件必须存在。
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

  // name
  const fmName = fm.name;
  if (!fmName) error(relDir, "frontmatter: 'name' is required");
  else {
    if (fmName !== name)
      error(relDir, `frontmatter name "${fmName}" != directory name "${name}"`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(fmName) || fmName.length > 64)
      error(relDir, `invalid name "${fmName}": lowercase kebab-case, 1-64 chars`);
  }

  // description
  const desc = fm.description;
  if (!desc) error(relDir, "frontmatter: 'description' is required");
  else if (desc.length < 40)
    warn(
      relDir,
      `description is short (${desc.length} chars) — should cover both WHAT it does and WHEN to trigger`,
    );

  const body = raw.split(/\r?\n/).slice(parsed.end + 1).join("\n");

  // placeholder leftovers
  if (/\{\{[a-zA-Z_-]+\}\}/.test(body) || /\{\{[a-zA-Z_-]+\}\}/.test(desc || ""))
    error(relDir, "unreplaced {{placeholder}} left in SKILL.md");

  // body length
  const bodyLines = body.split("\n").length;
  if (bodyLines > MAX_BODY_LINES)
    warn(
      relDir,
      `body is ${bodyLines} lines (> ${MAX_BODY_LINES}) — move detail into references/`,
    );

  checkReferences(relDir, body, dir);

  // no referenced sub-skill dirs shadowed (info only)
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
