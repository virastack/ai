import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyConditionals, parseFrontmatter, toCursorRule, toMarkdownRule } from "../src/convert.js";
import { RULES } from "../src/rules.js";

const RULES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../templates/rules");
const ctx = { version: "9.9.9", i18n: true };

const scoped = `---
description: "USE WHEN: Testing."
paths:
  - "src/**/*.ts"
  - "src/hooks/**/*.tsx"
---
# Title

Body
`;

const always = `---
description: "USE WHEN: Always."
---
# Core

Body
`;

describe("parseFrontmatter", () => {
  it("reads scalars and the paths list", () => {
    expect(parseFrontmatter(scoped).data).toEqual({
      description: "USE WHEN: Testing.",
      paths: ["src/**/*.ts", "src/hooks/**/*.tsx"],
    });
  });

  it("reports no paths for an always-loaded rule", () => {
    expect(parseFrontmatter(always).data.paths).toBeUndefined();
  });
});

describe("toMarkdownRule", () => {
  it("writes a quoted YAML paths list for scoped rules", () => {
    const output = toMarkdownRule(scoped, ctx);
    expect(output.startsWith('---\npaths:\n  - "src/**/*.ts"\n  - "src/hooks/**/*.tsx"\n---\n')).toBe(true);
    expect(output).not.toContain("globs:");
    expect(output).not.toContain("alwaysApply");
  });

  it("writes no frontmatter for alwaysApply rules", () => {
    const output = toMarkdownRule(always, ctx);
    expect(output.startsWith("<!-- Managed by @virastack/ai -->")).toBe(true);
    expect(output).not.toContain("---");
  });

  it("puts the description under the title", () => {
    expect(toMarkdownRule(scoped, ctx)).toContain("# Title\n\nUSE WHEN: Testing.\n\nBody");
  });
});

describe("toCursorRule", () => {
  it("attaches a scoped rule by comma separated globs, as Cursor documents", () => {
    const output = toCursorRule(scoped, ctx);
    expect(output.startsWith("---\nglobs: src/**/*.ts,src/hooks/**/*.tsx\nalwaysApply: false\n---\n")).toBe(true);
    expect(output).not.toContain("description:");
    expect(output).not.toContain("paths:");
  });

  it("marks an always-loaded rule with alwaysApply only", () => {
    expect(toCursorRule(always, ctx).startsWith("---\nalwaysApply: true\n---\n")).toBe(true);
  });

  it("keeps the same content as the Markdown rule", () => {
    const content = (text) => text.replace(/^---[\s\S]*?---\n/, "");
    expect(content(toCursorRule(scoped, ctx))).toBe(content(toMarkdownRule(scoped, ctx)));
  });
});

describe("applyConditionals", () => {
  const text = "a\n<!-- i18n:start -->\nb\n<!-- i18n:end -->\nc\n";

  it("keeps i18n content without markers when i18n is on", () => {
    expect(applyConditionals(text, { i18n: true })).toBe("a\nb\nc\n");
  });

  it("drops i18n content when i18n is off", () => {
    expect(applyConditionals(text, { i18n: false })).toBe("a\nc\n");
  });
});

describe("rule templates", () => {
  it.each(RULES.map((rule) => rule.name))("%s has valid frontmatter and paths", async (name) => {
    const source = await fs.readFile(path.join(RULES_DIR, `${name}.md`), "utf8");
    const { data } = parseFrontmatter(source);
    expect(data.description).toBeTruthy();

    const markdown = toMarkdownRule(source, ctx);
    const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---\n/);
    if (!data.paths?.length) {
      expect(frontmatter).toBeNull();
    } else {
      const paths = frontmatter?.[1] ?? "";
      expect(paths).toMatch(/^paths:\n( {2}- ".+"\n?)+$/);
      for (const line of paths.split("\n").slice(1)) {
        expect(() => JSON.parse(line.slice(4))).not.toThrow();
      }
    }
  });

  it("balances every i18n marker", async () => {
    for (const rule of RULES) {
      const source = await fs.readFile(path.join(RULES_DIR, `${rule.name}.md`), "utf8");
      const starts = source.match(/<!-- i18n:start -->/g)?.length ?? 0;
      const ends = source.match(/<!-- i18n:end -->/g)?.length ?? 0;
      expect(starts, rule.name).toBe(ends);
    }
  });
});
