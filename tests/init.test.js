import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readVersion } from "../src/cli.js";
import { hash } from "../src/fs.js";
import {
  cleanup,
  cli,
  makeProject,
  NEXT_I18N_PKG,
  NEXT_PKG,
  readTree,
  reportLines,
  TANSTACK_I18N_PKG,
  TANSTACK_PKG,
} from "./helpers.js";

const dirs = [];
async function project(pkg, files) {
  const dir = await makeProject(pkg, files);
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup));
});

const version = await readVersion();
const stable = (text) => text.replaceAll(version, "<version>");

describe("init: file tree", () => {
  const frameworks = { nextjs: NEXT_PKG, tanstack: TANSTACK_PKG };
  const selections = { claude: "claude", cursor: "cursor", both: "claude,cursor", none: "none" };

  for (const [framework, pkg] of Object.entries(frameworks)) {
    for (const [name, agents] of Object.entries(selections)) {
      it(`${framework} with --agent ${agents}`, async () => {
        const dir = await project(pkg);
        const { code } = await cli(dir, ["init", "--agent", agents]);
        expect(code).toBe(0);

        const tree = await readTree(dir);
        expect(Object.keys(tree)).toMatchSnapshot(`${framework}-${name}-tree`);
        expect(stable(tree["AGENTS.md"])).toMatchSnapshot(`${framework}-${name}-agents`);
      });
    }
  }

  it("installs both agents when --agent is missing", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init"]);
    const tree = await readTree(dir);
    expect(tree).toHaveProperty([".claude/rules/virastack/core.md"]);
    expect(tree).toHaveProperty([".cursor/rules/virastack/core.mdc"]);
    expect(tree).toHaveProperty(["CLAUDE.md"]);
  });

  it("writes a manifest that matches the files", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    const tree = await readTree(dir);
    const manifest = JSON.parse(tree[".virastack/ai.json"]);
    expect(manifest).toMatchObject({ version: 1, cliVersion: version, framework: "nextjs", agents: ["claude"] });
    for (const [file, fileHash] of Object.entries(manifest.files)) {
      expect(hash(tree[file])).toBe(fileHash);
    }
    expect(Object.keys(manifest.files)).toHaveLength(12);
  });

  it("never writes docs/ or the Next.js block", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init"]);
    const tree = await readTree(dir);
    expect(Object.keys(tree).some((file) => file.startsWith("docs/"))).toBe(false);
    expect(tree["AGENTS.md"]).not.toContain("nextjs-agent-rules");
  });

  it("uses the detected package manager in commands", async () => {
    const dir = await project(NEXT_PKG, { "bun.lock": "" });
    await cli(dir, ["init"]);
    expect((await readTree(dir))["AGENTS.md"]).toContain("`bun run lint && bun run typecheck`");
  });

  it("fails when the framework is unknown", async () => {
    const dir = await project({});
    const { code, err } = await cli(dir, ["init"]);
    expect(code).toBe(1);
    expect(err).toMatch(/--framework/);
  });

  it("lets --framework override detection", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--framework", "tanstack", "--agent", "claude"]);
    const tree = await readTree(dir);
    expect(tree).toHaveProperty([".claude/rules/virastack/tanstack-start.md"]);
    expect(tree).not.toHaveProperty([".claude/rules/virastack/nextjs.md"]);
  });
});

describe("init: conditional i18n", () => {
  it.each([
    ["nextjs", NEXT_PKG, NEXT_I18N_PKG, "nextjs", "next-intl"],
    ["tanstack", TANSTACK_PKG, TANSTACK_I18N_PKG, "tanstack-start", "paraglide-js"],
  ])("%s installs i18n only with an i18n library", async (_, plain, withI18n, rule, library) => {
    const without = await project(plain);
    await cli(without, ["init", "--agent", "claude"]);
    const treeWithout = await readTree(without);
    expect(treeWithout).not.toHaveProperty([".claude/rules/virastack/i18n.md"]);
    expect(treeWithout[`.claude/rules/virastack/${rule}.md`]).not.toContain(library);
    expect(treeWithout["AGENTS.md"]).not.toContain("`i18n`");

    const withLib = await project(withI18n);
    await cli(withLib, ["init", "--agent", "claude"]);
    const treeWith = await readTree(withLib);
    expect(treeWith).toHaveProperty([".claude/rules/virastack/i18n.md"]);
    expect(treeWith[`.claude/rules/virastack/${rule}.md`]).toContain(library);
    expect(treeWith["AGENTS.md"]).toContain("`i18n`");

    for (const content of [...Object.values(treeWith), ...Object.values(treeWithout)]) {
      expect(content).not.toContain("i18n:start");
    }
  });

  it("adds the rule when i18n arrives and removes it when it leaves", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);

    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(NEXT_I18N_PKG));
    await cli(dir, ["init"]);
    expect(await readTree(dir)).toHaveProperty([".claude/rules/virastack/i18n.md"]);

    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(NEXT_PKG));
    const { out } = await cli(dir, ["init"]);
    expect(await readTree(dir)).not.toHaveProperty([".claude/rules/virastack/i18n.md"]);
    expect(out).toContain("- .claude/rules/virastack/i18n.md");
  });
});

describe("init: safe writes", () => {
  it("is idempotent", async () => {
    const dir = await project(NEXT_I18N_PKG, { "AGENTS.md": "# Mine\n", "CLAUDE.md": "Notes\n" });
    await cli(dir, ["init"]);
    const first = await readTree(dir);
    const { out } = await cli(dir, ["init"]);
    expect(await readTree(dir)).toEqual(first);
    expect(reportLines(out)).toEqual([]);
  });

  it("never changes content outside the block, even with --force", async () => {
    const user = "# My agents file\r\n\r\nKeep me.\r\n";
    const dir = await project(NEXT_PKG, { "AGENTS.md": user, "CLAUDE.md": "# Claude\n" });
    await cli(dir, ["init", "--force"]);
    await cli(dir, ["init", "--force"]);
    const tree = await readTree(dir);
    expect(tree["AGENTS.md"].startsWith(user)).toBe(true);
    expect(tree["AGENTS.md"].replace(/\r\n/g, "")).not.toContain("\n");
    expect(tree["CLAUDE.md"]).toBe("@AGENTS.md\n\n# Claude\n");
  });

  it("skips a changed rule without a terminal and keeps tracking it", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    const file = path.join(dir, ".claude/rules/virastack/api.md");
    await fs.appendFile(file, "\nMy change\n");
    const manifestBefore = JSON.parse((await readTree(dir))[".virastack/ai.json"]);

    const { out, questions } = await cli(dir, ["init"]);
    expect(questions).toEqual([]);
    expect(await fs.readFile(file, "utf8")).toContain("My change");
    expect(out).toMatch(/! \.claude\/rules\/virastack\/api\.md .*--force/);

    const manifestAfter = JSON.parse((await readTree(dir))[".virastack/ai.json"]);
    expect(manifestAfter.files[".claude/rules/virastack/api.md"]).toBe(
      manifestBefore.files[".claude/rules/virastack/api.md"],
    );
  });

  it("asks once in a terminal and lists the files", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    const files = ["api.md", "ui.md"].map((name) => path.join(dir, ".claude/rules/virastack", name));
    for (const file of files) await fs.appendFile(file, "\nchange\n");

    const declined = await cli(dir, ["init"], { interactive: true, answer: false });
    expect(declined.questions).toHaveLength(1);
    expect(declined.out).toContain(".claude/rules/virastack/api.md");
    expect(declined.out).toContain(".claude/rules/virastack/ui.md");
    for (const file of files) expect(await fs.readFile(file, "utf8")).toContain("change");

    await cli(dir, ["init"], { interactive: true, answer: true });
    for (const file of files) expect(await fs.readFile(file, "utf8")).not.toContain("change");
  });

  it("does not ask with --yes", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    await fs.appendFile(path.join(dir, ".claude/rules/virastack/api.md"), "\nchange\n");
    const { questions } = await cli(dir, ["init", "--yes"], { interactive: true, answer: true });
    expect(questions).toEqual([]);
  });

  it("overwrites a changed rule with --force", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    const file = path.join(dir, ".claude/rules/virastack/api.md");
    await fs.appendFile(file, "\nMy change\n");
    await cli(dir, ["init", "--force"]);
    expect(await fs.readFile(file, "utf8")).not.toContain("My change");
  });

  it("treats an unmanaged file at a managed path as a conflict", async () => {
    const dir = await project(NEXT_PKG, { ".claude/rules/virastack/api.md": "mine\n" });
    const { out } = await cli(dir, ["init", "--agent", "claude"]);
    expect((await readTree(dir))[".claude/rules/virastack/api.md"]).toBe("mine\n");
    expect(out).toMatch(/! \.claude\/rules\/virastack\/api\.md/);
    const manifest = JSON.parse((await readTree(dir))[".virastack/ai.json"]);
    expect(manifest.files).not.toHaveProperty([".claude/rules/virastack/api.md"]);
  });

  it("remembers the agent choice and removes files of a dropped agent", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init"]);
    await cli(dir, ["init", "--agent", "cursor"]);
    let tree = await readTree(dir);
    expect(Object.keys(tree).some((file) => file.startsWith(".claude/"))).toBe(false);
    expect(tree).not.toHaveProperty(["CLAUDE.md"]);

    await cli(dir, ["init"]);
    tree = await readTree(dir);
    expect(JSON.parse(tree[".virastack/ai.json"]).agents).toEqual(["cursor"]);
    expect(Object.keys(tree).some((file) => file.startsWith(".claude/"))).toBe(false);
  });

  it("keeps a changed file of a dropped agent", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init"]);
    await fs.appendFile(path.join(dir, ".claude/rules/virastack/api.md"), "\nchange\n");
    await cli(dir, ["init", "--agent", "cursor"]);
    expect(await readTree(dir)).toHaveProperty([".claude/rules/virastack/api.md"]);
  });
});

describe("init: --dry-run", () => {
  it.each([
    ["a new project", {}],
    ["a project with own files", { "AGENTS.md": "# Mine\n", "CLAUDE.md": "Notes\n" }],
  ])("lists exactly what a real run does in %s", async (_, files) => {
    const dir = await project(NEXT_I18N_PKG, files);
    const before = await readTree(dir);

    const dry = await cli(dir, ["init", "--dry-run"]);
    expect(await readTree(dir)).toEqual(before);

    const real = await cli(dir, ["init"]);
    expect(reportLines(dry.out)).toEqual(reportLines(real.out));
    expect(reportLines(real.out).length).toBeGreaterThan(0);
  });
});

describe("remove", () => {
  it("restores the project to its state before init", async () => {
    const files = {
      "AGENTS.md": "# Mine\n\nKeep.\n",
      "CLAUDE.md": "# Claude\n",
      ".claude/rules/own.md": "own rule\n",
      ".cursor/rules/own.mdc": "own rule\n",
    };
    const dir = await project(NEXT_I18N_PKG, files);
    const before = await readTree(dir);

    await cli(dir, ["init"]);
    await cli(dir, ["remove"]);
    expect(await readTree(dir)).toEqual(before);
  });

  it("deletes files it created from scratch", async () => {
    const dir = await project(TANSTACK_PKG);
    const before = await readTree(dir);
    await cli(dir, ["init", "--agent", "none"]);
    await cli(dir, ["remove"]);
    expect(await readTree(dir)).toEqual(before);
    await expect(fs.access(path.join(dir, ".agents"))).rejects.toThrow();
  });

  it("keeps a changed rule unless forced", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    await fs.appendFile(path.join(dir, ".claude/rules/virastack/api.md"), "\nchange\n");

    await cli(dir, ["remove"]);
    expect(await readTree(dir)).toHaveProperty([".claude/rules/virastack/api.md"]);
    expect(await readTree(dir)).not.toHaveProperty([".virastack/ai.json"]);
  });

  it("asks before deleting a changed rule in a terminal", async () => {
    const dir = await project(NEXT_PKG);
    await cli(dir, ["init", "--agent", "claude"]);
    await fs.appendFile(path.join(dir, ".claude/rules/virastack/api.md"), "\nchange\n");
    const { questions } = await cli(dir, ["remove"], { interactive: true, answer: true });
    expect(questions).toHaveLength(1);
    expect(await readTree(dir)).not.toHaveProperty([".claude/rules/virastack/api.md"]);
  });

  it("says so when nothing is installed", async () => {
    const dir = await project(NEXT_PKG);
    const { code, out } = await cli(dir, ["remove"]);
    expect(code).toBe(0);
    expect(out).toMatch(/Nothing to remove/);
  });
});

describe("cli", () => {
  it("prints help and version", async () => {
    const dir = await project(NEXT_PKG);
    expect((await cli(dir, ["--help"])).out).toMatch(/Usage: npx @virastack\/ai/);
    expect((await cli(dir, ["--version"])).out).toBe(version);
  });

  it("prints Turkish output with --tr", async () => {
    const dir = await project(NEXT_PKG);
    const { out } = await cli(dir, ["init", "--tr"]);
    expect(out).toContain("oluşturuldu");
  });

  it("exits 1 on a bad flag", async () => {
    const dir = await project(NEXT_PKG);
    const { code, err } = await cli(dir, ["init", "--agent", "windsurf"]);
    expect(code).toBe(1);
    expect(err).toMatch(/Unknown agent: windsurf/);
  });
});
