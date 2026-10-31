import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BLOCK_BEGIN, BLOCK_END } from "../src/blocks.js";
import { hash } from "../src/fs.js";
import { MANIFEST_PATH } from "../src/manifest.js";
import { cleanup, cli, makeProject, NEXT_PKG } from "./helpers.js";

const RULE = ".claude/rules/virastack/core.md";
const OLD_RULE = ".claude/rules/virastack/old.md";

const dirs = [];

async function project(files) {
  const dir = await makeProject(NEXT_PKG, files);
  dirs.push(dir);
  return dir;
}

const read = (dir, file) => fs.readFile(path.join(dir, file), "utf8");
const write = async (dir, file, content) => {
  await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await fs.writeFile(path.join(dir, file), content);
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function editManifest(dir, change) {
  const manifest = JSON.parse(await read(dir, MANIFEST_PATH));
  change(manifest);
  await write(dir, MANIFEST_PATH, JSON.stringify(manifest));
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup));
});

describe("upgrading an install", () => {
  it("updates a rule the user did not edit", async () => {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    const current = await read(dir, RULE);

    await write(dir, RULE, "Older rule\n");
    await editManifest(dir, (manifest) => {
      manifest.files[RULE] = hash("Older rule\n");
    });

    expect((await cli(dir, ["init", "--yes"])).code).toBe(0);
    expect(await read(dir, RULE)).toBe(current);
  });

  it("keeps a rule the user edited", async () => {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    await write(dir, RULE, "My own rule\n");

    expect((await cli(dir, ["init", "--yes"])).code).toBe(0);
    expect(await read(dir, RULE)).toBe("My own rule\n");
  });

  it("removes a dropped rule only when the user did not edit it", async () => {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    await write(dir, OLD_RULE, "Dropped rule\n");
    await editManifest(dir, (manifest) => {
      manifest.files[OLD_RULE] = hash("Dropped rule\n");
    });

    await cli(dir, ["init", "--yes"]);
    expect(await exists(path.join(dir, OLD_RULE))).toBe(false);

    await write(dir, OLD_RULE, "Edited dropped rule\n");
    await editManifest(dir, (manifest) => {
      manifest.files[OLD_RULE] = hash("Dropped rule\n");
    });

    await cli(dir, ["init", "--yes"]);
    expect(await read(dir, OLD_RULE)).toBe("Edited dropped rule\n");
  });
});

describe("conflicts of both kinds in one run", () => {
  async function conflicted() {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    await write(dir, RULE, "My own rule\n");
    await write(dir, OLD_RULE, "My dropped rule\n");
    await editManifest(dir, (manifest) => {
      manifest.files[OLD_RULE] = hash("Dropped rule\n");
    });
    return dir;
  }

  it("does not delete a file when only overwriting was accepted", async () => {
    const dir = await conflicted();
    const { questions } = await cli(dir, ["init"], {
      interactive: true,
      answer: (question) => question.includes("Overwrite"),
    });

    expect(questions).toHaveLength(2);
    expect(await read(dir, RULE)).not.toBe("My own rule\n");
    expect(await read(dir, OLD_RULE)).toBe("My dropped rule\n");
  });

  it("does not overwrite a file when only deleting was accepted", async () => {
    const dir = await conflicted();
    await cli(dir, ["init"], { interactive: true, answer: (question) => question.includes("Delete") });

    expect(await read(dir, RULE)).toBe("My own rule\n");
    expect(await exists(path.join(dir, OLD_RULE))).toBe(false);
  });

  it("asks nothing with --yes and takes both with --force", async () => {
    const skipped = await conflicted();
    const { questions } = await cli(skipped, ["init", "--yes"], { interactive: true });
    expect(questions).toHaveLength(0);
    expect(await read(skipped, OLD_RULE)).toBe("My dropped rule\n");

    const forced = await conflicted();
    await cli(forced, ["init", "--force"], { interactive: true });
    expect(await read(forced, RULE)).not.toBe("My own rule\n");
    expect(await exists(path.join(forced, OLD_RULE))).toBe(false);
  });
});

describe("closing messages", () => {
  it("init does not say up to date when a file was skipped", async () => {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    await write(dir, RULE, "My own rule\n");

    const { out } = await cli(dir, ["init", "--yes"]);
    expect(out).not.toContain("Already up to date.");
    expect(out).toContain("--force");
  });

  it("init still says up to date when nothing differs", async () => {
    const dir = await project();
    await cli(dir, ["init", "--yes"]);
    expect((await cli(dir, ["init", "--yes"])).out).toContain("Already up to date.");
  });

  it("remove does not claim a full removal when a file was kept", async () => {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    await write(dir, RULE, "My own rule\n");

    const { out } = await cli(dir, ["remove", "--yes"]);
    expect(out).not.toContain("ViraStack AI was removed.");
    expect(out).toContain("--force");
    expect(await read(dir, RULE)).toBe("My own rule\n");
  });

  it("remove says removed when nothing was kept", async () => {
    const dir = await project();
    await cli(dir, ["init", "--yes"]);
    expect((await cli(dir, ["remove", "--yes"])).out).toContain("ViraStack AI was removed.");
  });
});

describe("an unreadable manifest", () => {
  const broken = {
    "invalid JSON": "{ not json",
    "another version": JSON.stringify({ version: 99, files: {} }),
    "files that are not an object": JSON.stringify({ version: 1, files: [] }),
  };

  for (const [name, text] of Object.entries(broken)) {
    for (const command of ["init", "remove"]) {
      it(`${command} warns about ${name} and keeps installed files`, async () => {
        const dir = await project();
        await cli(dir, ["init", "--agent", "claude", "--yes"]);
        const rule = await read(dir, RULE);
        await write(dir, RULE, `${rule}My edit\n`);
        await write(dir, MANIFEST_PATH, text);

        const { code, out } = await cli(dir, [command, "--yes"]);
        expect(code).toBe(0);
        expect(out).toContain("could not be read");
        expect(await read(dir, RULE)).toBe(`${rule}My edit\n`);
      });
    }
  }

  it("does not warn when there is no manifest", async () => {
    const dir = await project();
    expect((await cli(dir, ["init", "--yes"])).out).not.toContain("could not be read");
  });
});

describe("symlinked instruction files", () => {
  const isLink = async (dir, file) => (await fs.lstat(path.join(dir, file))).isSymbolicLink();

  it("keeps a CLAUDE.md link to AGENTS.md and adds no import to itself", async () => {
    const dir = await project({ "AGENTS.md": "My notes\n" });
    await fs.symlink("AGENTS.md", path.join(dir, "CLAUDE.md"));

    expect((await cli(dir, ["init", "--yes"])).code).toBe(0);
    expect((await cli(dir, ["init", "--yes"])).code).toBe(0);

    expect(await isLink(dir, "CLAUDE.md")).toBe(true);
    const text = await read(dir, "AGENTS.md");
    expect(text).toContain("My notes");
    expect(text).toContain(BLOCK_BEGIN);
    expect(text).not.toContain("@AGENTS.md");
  });

  it("keeps an AGENTS.md link to another file and writes the block there", async () => {
    const dir = await project({ "docs/agents.md": "My notes\n" });
    await fs.symlink("docs/agents.md", path.join(dir, "AGENTS.md"));

    await cli(dir, ["init", "--agent", "cursor", "--yes"]);

    expect(await isLink(dir, "AGENTS.md")).toBe(true);
    expect(await read(dir, "docs/agents.md")).toContain(BLOCK_BEGIN);
  });

  it("restores the linked file on remove", async () => {
    const dir = await project({ "AGENTS.md": "My notes\n" });
    await fs.symlink("AGENTS.md", path.join(dir, "CLAUDE.md"));

    await cli(dir, ["init", "--yes"]);
    await cli(dir, ["remove", "--yes"]);

    expect(await isLink(dir, "CLAUDE.md")).toBe(true);
    expect(await read(dir, "AGENTS.md")).toBe("My notes\n");
  });

  it("replaces a broken link with a regular file", async () => {
    const dir = await project();
    await fs.symlink("missing.md", path.join(dir, "AGENTS.md"));

    expect((await cli(dir, ["init", "--agent", "cursor", "--yes"])).code).toBe(0);

    expect(await isLink(dir, "AGENTS.md")).toBe(false);
    expect(await read(dir, "AGENTS.md")).toContain(BLOCK_BEGIN);
  });
});

describe("a manifest from a cloned repository", () => {
  async function installed() {
    const dir = await project();
    await cli(dir, ["init", "--agent", "claude", "--yes"]);
    return dir;
  }

  for (const command of ["init", "remove"]) {
    it(`${command} never deletes a file outside the project`, async () => {
      const dir = await installed();
      const name = `${path.basename(dir)}-outside.txt`;
      const outside = path.join(dir, "..", name);
      await fs.writeFile(outside, "keep me");
      await editManifest(dir, (manifest) => {
        manifest.files[`../${name}`] = "";
      });

      try {
        const { code, out } = await cli(dir, [command, "--force"]);
        expect(code).toBe(0);
        expect(out).toContain(`../${name}`);
        expect(await fs.readFile(outside, "utf8")).toBe("keep me");
      } finally {
        await fs.rm(outside, { force: true });
      }
    });

    it(`${command} never deletes a project file the manifest names`, async () => {
      const dir = await installed();
      await write(dir, "src/app/page.tsx", "export default null;\n");
      await editManifest(dir, (manifest) => {
        manifest.files["src/app/page.tsx"] = hash("export default null;\n");
      });

      await cli(dir, [command, "--force"]);
      expect(await read(dir, "src/app/page.tsx")).toBe("export default null;\n");
    });

    it(`${command} treats a missing hash as a conflict, not as permission to delete`, async () => {
      const dir = await installed();
      await write(dir, OLD_RULE, "Not ours\n");
      await editManifest(dir, (manifest) => {
        manifest.files[OLD_RULE] = "";
      });

      await cli(dir, [command, "--yes"]);
      expect(await read(dir, OLD_RULE)).toBe("Not ours\n");
    });

    it(`${command} survives a manifest with invalid agents and framework`, async () => {
      const dir = await installed();
      await editManifest(dir, (manifest) => {
        manifest.agents = ["bogus"];
        manifest.framework = "bogus";
      });
      expect((await cli(dir, [command, "--yes"])).code).toBe(0);
    });
  }
});

describe("unbalanced AGENTS.md markers", () => {
  const cases = {
    "a BEGIN with no END": `${BLOCK_BEGIN}\n\nMy notes\n`,
    "an END with no BEGIN": `My notes\n\n${BLOCK_END}\n`,
    "an END before the BEGIN": `${BLOCK_END}\nMy notes\n${BLOCK_BEGIN}\n`,
    "two blocks": `${BLOCK_BEGIN}\nA\n${BLOCK_END}\nMy notes\n${BLOCK_BEGIN}\nB\n${BLOCK_END}\n`,
  };

  for (const [name, text] of Object.entries(cases)) {
    for (const command of ["init", "remove"]) {
      it(`${command} stops on ${name} and leaves the file untouched`, async () => {
        const dir = await project({ "AGENTS.md": text });
        const { code, err } = await cli(dir, [command, "--yes"]);
        expect(code).toBe(1);
        expect(err).toContain("AGENTS.md");
        expect(await read(dir, "AGENTS.md")).toBe(text);
        expect(await exists(path.join(dir, MANIFEST_PATH))).toBe(false);
      });
    }
  }

  it("keeps user text across repeated runs when markers are balanced", async () => {
    const dir = await project({ "AGENTS.md": "My notes\n" });
    await cli(dir, ["init", "--yes"]);
    await cli(dir, ["init", "--yes"]);
    expect(await read(dir, "AGENTS.md")).toContain("My notes");
  });
});
