#!/usr/bin/env node
// 脚手架：从 templates/skill/ 生成一个新 skill 目录到 skills/ 下。
// 用法：npm run new -- <name> -d "<description>" [--minimal]
// 零依赖，只使用 Node 内置模块。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, "../templates/skill");
const SKILLS_DIR = path.resolve(__dirname, "../skills");

const HELP = `Usage: npm run new -- <name> -d "<description>" [options]

Create a new skill under skills/ from templates/skill/.

Arguments:
  name              Skill name, lowercase kebab-case (e.g. my-skill)

Options:
  -d, --description <text>  Skill description (required). One sentence covering
                            what it does + when to trigger it.
  --minimal                 Only create SKILL.md (no references/ scripts/ assets/)
  -h, --help                Show this help

Examples:
  npm run new -- csv-cleaner -d "Clean and normalize CSV exports. Use whenever the user mentions dirty data, dedup, or spreadsheet cleanup."
  node scripts/new-skill.mjs deploy-helper -d "..." --minimal`;

function fail(msg) {
  console.error(`Error: ${msg}\n\n${HELP}`);
  process.exit(1);
}

// ---------- parse args ----------
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  console.log(HELP);
  process.exit(0);
}

let name = null;
let description = null;
let minimal = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-d" || a === "--description") {
    description = args[++i];
    if (description === undefined) fail("--description requires a value");
  } else if (a === "--minimal") {
    minimal = true;
  } else if (a.startsWith("-")) {
    fail(`unknown option: ${a}`);
  } else {
    if (name !== null) fail(`unexpected extra argument: ${a}`);
    name = a;
  }
}

if (!name) fail("skill name is required");
if (!description) fail("description is required (-d)");

// ---------- validate ----------
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  fail(`invalid name "${name}": must be lowercase kebab-case (letters, digits, hyphens)`);
}
if (name.length > 64) fail(`name too long (${name.length} chars, max 64)`);
if (/^-|-$/.test(name)) fail(`name cannot start or end with a hyphen`);

const target = path.join(SKILLS_DIR, name);
if (fs.existsSync(target)) {
  fail(`skills/${name} already exists — pick another name or delete it first`);
}
if (!fs.existsSync(TEMPLATE_DIR)) {
  fail(`template not found: ${TEMPLATE_DIR} (is the repo intact?)`);
}

// ---------- scaffold ----------
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else {
      let content = fs.readFileSync(s, "utf8");
      content = content.replaceAll("{{name}}", name).replaceAll(
        "{{description}}",
        description,
      );
      fs.writeFileSync(d, content);
    }
  }
}

copyDir(TEMPLATE_DIR, target);
if (minimal) {
  for (const sub of ["references", "scripts", "assets"]) {
    fs.rmSync(path.join(target, sub), { recursive: true, force: true });
  }
}

console.log(`Created skills/${name}/`);
console.log(`
Next steps:
  1. Edit skills/${name}/SKILL.md — replace guidance comments with real content, then delete them.
  2. Run: npm run validate
  3. Link it into an agent skills dir to test triggering, e.g.:
     ln -s "$(pwd)/skills/${name}" ~/.agents/skills/${name}
`);
