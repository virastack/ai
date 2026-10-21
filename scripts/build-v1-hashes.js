#!/usr/bin/env node
/**
 * Builds src/migrate/v1-hashes.json from every published v1.x tarball.
 *
 * Usage: node scripts/build-v1-hashes.js <dir>
 * `<dir>` holds one extracted `npm pack @virastack/ai@<version>` per subfolder
 * (`<dir>/<version>/package/...`). Each version's own CLI is run for Next.js,
 * TanStack and an undetected project, and every file it writes is hashed.
 * Raw template files are hashed too, in case a version wrote them unchanged.
 */
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "../src/fs.js";
import { splitNextBlock } from "../src/migrate/index.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-v1-hashes.js <dir>");
  process.exit(1);
}

const PROJECTS = {
  nextjs: { dependencies: { next: "16.0.0" } },
  tanstack: { dependencies: { "@tanstack/react-start": "1.0.0" } },
  unknown: {},
};

const files = {};
const agentsMd = new Set();
const nextjsBlock = new Set();

function add(relative, content) {
  const file = relative.split(path.sep).join("/");
  if (file === "AGENTS.md") {
    const { block, rest } = splitNextBlock(content);
    agentsMd.add(hash(rest.trim()));
    if (block) nextjsBlock.add(hash(block));
    return;
  }
  (files[file] ??= new Set()).add(hash(content));
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

/** Maps a template path to where v1 installed it (strips `core/`, `nextjs/`, `tanstack/`). */
function installPath(templatePath) {
  return templatePath.replace(/^(core|nextjs|tanstack)[\\/]/, "");
}

const versions = (await fs.readdir(source)).sort();
for (const version of versions) {
  const pkg = path.join(source, version, "package");
  const templates = path.join(pkg, "templates");

  for (const file of await walk(templates)) {
    add(installPath(file), await fs.readFile(path.join(templates, file), "utf8"));
  }

  for (const [name, packageJson] of Object.entries(PROJECTS)) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `virastack-v1-${version}-${name}-`));
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(packageJson));
    try {
      execFileSync(process.execPath, [path.join(pkg, "bin/ai.js"), "init", "--force"], {
        cwd: dir,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Older versions exit non-zero for undetected frameworks; whatever they wrote still counts.
    }
    for (const file of await walk(dir)) {
      if (file === "package.json") continue;
      add(file, await fs.readFile(path.join(dir, file), "utf8"));
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
  console.log(`hashed ${version}`);
}

const sorted = (set) => [...set].sort();
const output = {
  versions,
  files: Object.fromEntries(
    Object.entries(files)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, set]) => [file, sorted(set)]),
  ),
  agentsMd: sorted(agentsMd),
  nextjsBlock: sorted(nextjsBlock),
};

await fs.writeFile(path.join(root, "src/migrate/v1-hashes.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`wrote ${Object.keys(output.files).length} files, ${output.agentsMd.length} AGENTS.md variants`);
