#!/usr/bin/env node
/**
 * Builds tests/fixtures/start-tree.json: the tracked file paths of every
 * ViraStack Start template. The content tests match rule globs against it.
 *
 * Usage: node scripts/build-start-fixture.js <path-to-virastack-start>
 */
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-start-fixture.js <path-to-virastack-start>");
  process.exit(1);
}

const TEMPLATES = {
  nextjs: "templates/nextjs",
  tanstack: "templates/tanstack",
  "nextjs-i18n": "templates-i18n/nextjs",
  "tanstack-i18n": "templates-i18n/tanstack",
};

const tree = {};
for (const [name, dir] of Object.entries(TEMPLATES)) {
  const output = execFileSync("git", ["ls-files", "--", dir], { cwd: source, encoding: "utf8" });
  tree[name] = output
    .split("\n")
    .filter(Boolean)
    .map((file) => file.slice(dir.length + 1))
    .sort();
}

const target = path.join(root, "tests/fixtures/start-tree.json");
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(tree, null, 2)}\n`);
console.log(`Wrote ${target}`);
