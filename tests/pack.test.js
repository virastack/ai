import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ALLOWED = /^(package\.json|README\.md|LICENSE|CHANGELOG\.md|schema\.json|bin\/[^/]+\.js|src\/.+\.(js|json)|templates\/.+\.md)$/;

describe("npm package", () => {
  it("runs from the packed tarball", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "virastack-ai-pack-"));
    try {
      execSync(`npm pack --pack-destination "${dir}" --ignore-scripts`, { cwd: root, stdio: "ignore" });
      const [tarball] = (await fs.readdir(dir)).filter((file) => file.endsWith(".tgz"));
      execSync(`tar xzf "${tarball}"`, { cwd: dir });
      const bin = path.join(dir, "package/bin/virastack-ai.js");
      const { version } = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
      expect(execSync(`node "${bin}" --version`, { encoding: "utf8" }).trim()).toBe(version);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 60000);

  it("ships only the allowed files", () => {
    const [result] = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { cwd: root, encoding: "utf8" }));
    const files = result.files.map((file) => file.path.split(path.sep).join("/"));
    expect(files.filter((file) => !ALLOWED.test(file))).toEqual([]);
    expect(files).toContain("bin/virastack-ai.js");
    expect(files).toContain("src/migrate/v1-hashes.json");
    expect(files).toContain("templates/rules/core.md");
    expect(files.some((file) => file.startsWith("tests/") || file.startsWith("scripts/"))).toBe(false);
  });
});
