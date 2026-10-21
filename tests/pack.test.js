import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ALLOWED = /^(package\.json|README\.md|LICENSE|CHANGELOG\.md|schema\.json|bin\/[^/]+\.js|src\/.+\.(js|json)|templates\/.+\.(md|mdc))$/;

describe("npm package", () => {
  it("ships only the allowed files", () => {
    const [result] = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { cwd: root, encoding: "utf8" }));
    const files = result.files.map((file) => file.path.split(path.sep).join("/"));
    expect(files.filter((file) => !ALLOWED.test(file))).toEqual([]);
    expect(files).toContain("bin/virastack-ai.js");
    expect(files).toContain("src/migrate/v1-hashes.json");
    expect(files).toContain("templates/rules/core.mdc");
    expect(files.some((file) => file.startsWith("tests/") || file.startsWith("scripts/"))).toBe(false);
  });
});
