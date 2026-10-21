import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadV1Hashes } from "../src/migrate/index.js";
import { cleanup, cli, makeProject, NEXT_PKG, readTree, TANSTACK_PKG } from "./helpers.js";

/**
 * Installs every published v1.x with its own CLI, then migrates with v2.
 * Tarballs come from npm once and are cached in tests/.cache.
 */
const CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".cache");
const { versions } = await loadV1Hashes();
const dirs = [];

async function v1Package(version) {
  const target = path.join(CACHE, version);
  const bin = path.join(target, "package/bin/ai.js");
  try {
    await fs.access(bin);
    return bin;
  } catch {
    await fs.mkdir(target, { recursive: true });
    const tarball = execSync(`npm pack @virastack/ai@${version} --silent`, { cwd: target, encoding: "utf8" }).trim();
    execSync(`tar -xzf ${tarball}`, { cwd: target });
    return bin;
  }
}

async function installV1(version, pkg, files) {
  const dir = await makeProject(pkg, files);
  dirs.push(dir);
  execSync(`node "${await v1Package(version)}" init --force`, { cwd: dir, stdio: "ignore" });
  return dir;
}

beforeAll(async () => {
  for (const version of versions) await v1Package(version);
}, 120_000);

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup));
});

describe("v1 migration", () => {
  for (const version of versions) {
    for (const [framework, pkg] of Object.entries({ nextjs: NEXT_PKG, tanstack: TANSTACK_PKG })) {
      it(`cleans a ${framework} project installed with v${version}`, async () => {
        const dir = await installV1(version, pkg, { "docs/own.md": "mine\n" });
        await cli(dir, ["init"]);
        const files = Object.keys(await readTree(dir));

        expect(files.filter((file) => /^\.cursor\/rules\/[^/]+\.mdc$/.test(file))).toEqual([]);
        expect(files).not.toContain("docs/MEMORIES.md");
        expect(files).not.toContain("docs/architecture-guide.md");
        expect(files).toContain("docs/own.md");

        const agents = (await readTree(dir))["AGENTS.md"];
        expect(agents.startsWith("<!-- BEGIN:virastack-ai -->")).toBe(true);
        expect(agents).not.toContain("core-principles.mdc");
        expect(agents).not.toContain("nextjs-agent-rules");
      });
    }
  }

  it("keeps v1 files the user changed", async () => {
    const dir = await installV1("1.3.2", NEXT_PKG);
    await fs.appendFile(path.join(dir, ".cursor/rules/testing.mdc"), "\nMy team rule\n");
    const { out } = await cli(dir, ["init"]);
    expect((await readTree(dir))[".cursor/rules/testing.mdc"]).toContain("My team rule");
    expect(out).toMatch(/! \.cursor\/rules\/testing\.mdc \(v1\)/);
  });

  it("keeps an edited v1 AGENTS.md and adds the block below it", async () => {
    const dir = await installV1("1.3.2", NEXT_PKG);
    await fs.appendFile(path.join(dir, "AGENTS.md"), "\n## Team notes\n");
    const { out } = await cli(dir, ["init"]);
    const agents = (await readTree(dir))["AGENTS.md"];
    expect(agents).toContain("## Team notes");
    expect(agents).toContain("<!-- BEGIN:virastack-ai -->");
    expect(agents).not.toContain("nextjs-agent-rules");
    expect(out).toMatch(/AGENTS\.md has v1 content you edited/);
  });

  it("keeps the block Next.js wrote itself", async () => {
    const dir = await installV1("1.3.2", NEXT_PKG);
    const agentsPath = path.join(dir, "AGENTS.md");
    const v1 = await fs.readFile(agentsPath, "utf8");
    const nextBlock =
      "<!-- BEGIN:nextjs-agent-rules -->\n# Next.js: read node_modules/next/dist/docs/ first\n<!-- END:nextjs-agent-rules -->";
    await fs.writeFile(agentsPath, v1.replace(/<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->/, nextBlock));

    await cli(dir, ["init"]);
    const agents = (await readTree(dir))["AGENTS.md"];
    expect(agents.startsWith(nextBlock)).toBe(true);
    expect(agents).toContain("<!-- BEGIN:virastack-ai -->");
    expect(agents).not.toContain("core-principles.mdc");
  });

  it("removes the v1 CLAUDE.md when Claude Code is not selected", async () => {
    const dir = await installV1("1.3.2", NEXT_PKG);
    await cli(dir, ["init", "--agent", "cursor"]);
    expect(await readTree(dir)).not.toHaveProperty(["CLAUDE.md"]);
  });

  it("adopts the v1 CLAUDE.md when Claude Code is selected", async () => {
    const dir = await installV1("1.3.2", NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    expect((await readTree(dir))["CLAUDE.md"]).toBe("@AGENTS.md");
    expect(JSON.parse((await readTree(dir))[".virastack/ai.json"]).claudeImport).toBe("created");
  });
});
