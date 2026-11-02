import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONDITIONS, parseFrontmatter } from "../src/convert.js";
import { MANIFEST_SCHEMA } from "../src/manifest.js";
import { renderAgentsBlock, renderRules } from "../src/render.js";
import { RULES } from "../src/rules.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = path.join(ROOT, "templates");

/** Size budget of one install, in bytes. Every rule loads into real sessions, so growth must be a decision. */
const MAX_INSTALL_BYTES = { nextjs: 30000, tanstack: 30000 };

const FRAMEWORKS = ["nextjs", "tanstack"];
const ctxFor = (framework, overrides = {}) => ({
  framework,
  i18n: true,
  agents: ["claude", "cursor"],
  packageManager: "pnpm",
  version: "2.0.0",
  ...overrides,
});

/** Minimal glob matcher for the patterns rules use: `**`, `*`, `?`, `{a,b}` and `[...]`. */
function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      out += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (char === "*") out += "[^/]*";
    else if (char === "?") out += "[^/]";
    else if (char === "{") out += "(?:";
    else if (char === "}") out += ")";
    else if (char === ",") out += "|";
    else if (char === "[") {
      const end = glob.indexOf("]", i);
      out += glob.slice(i, end + 1);
      i = end;
    } else out += char.replace(/[.+^$()|\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

async function readRule(name) {
  return fs.readFile(path.join(TEMPLATES, "rules", `${name}.md`), "utf8");
}

describe("rule loading", () => {
  /** Representative files of a project in the target structure, and the scoped rules each must load. */
  const LOADS = {
    nextjs: {
      "src/app/users/page.tsx": ["react", "typescript", "nextjs", "performance"],
      "src/app/layout.tsx": ["react", "typescript", "nextjs", "performance"],
      "src/proxy.ts": ["typescript", "nextjs"],
      "src/features/users/actions/create-user.ts": ["typescript", "nextjs"],
      "src/features/users/api/get-users.api.ts": ["typescript", "api", "server-state"],
      "src/features/users/hooks/use-users.ts": ["typescript", "react", "server-state"],
      "src/features/users/components/UserForm.tsx": ["typescript", "react", "ui", "forms", "performance"],
      "src/features/users/schemas/user.schema.ts": ["typescript", "forms"],
      "src/features/users/stores/user.store.ts": ["typescript", "client-state"],
      "src/features/users/api/get-users.api.test.ts": ["typescript", "api", "server-state", "testing"],
      "src/styles/tailwind.css": ["ui"],
    },
    tanstack: {
      "src/routes/users/$userId.tsx": ["react", "typescript", "tanstack-start", "performance"],
      "src/start.ts": ["typescript", "tanstack-start"],
      "src/router.tsx": ["react", "typescript", "tanstack-start"],
      "src/features/users/api/get-user.api.ts": ["typescript", "tanstack-start", "api", "server-state"],
      "src/features/users/components/UserForm.tsx": ["typescript", "react", "ui", "forms", "performance"],
      "src/lib/query-client.ts": ["typescript", "server-state"],
    },
  };
  const I18N_FILES = ["src/messages/en.json", "src/app/layout.tsx", "src/routes/$lang.tsx", "src/components/shared/Header.tsx"];

  async function pathsOf(name) {
    return parseFrontmatter(await readRule(name)).data.paths ?? [];
  }

  async function rulesFor(file, names) {
    const rules = [];
    for (const name of names) {
      const patterns = (await pathsOf(name)).map(globToRegExp);
      if (patterns.some((pattern) => pattern.test(file))) rules.push(name);
    }
    return rules;
  }

  for (const [framework, files] of Object.entries(LOADS)) {
    const names = RULES.filter((rule) => !rule.when || rule.when({ framework })).map((rule) => rule.name);
    it.each(Object.entries(files))(`${framework}: %s loads its rules`, async (file, expected) => {
      expect((await rulesFor(file, names)).sort()).toEqual([...expected].sort());
    });
  }

  it.each(I18N_FILES)("i18n loads for %s", async (file) => {
    expect(await rulesFor(file, ["i18n"])).toEqual(["i18n"]);
  });

  it("uses no brace globs, which Cursor does not document", async () => {
    for (const rule of RULES) {
      for (const glob of await pathsOf(rule.name)) expect(glob, rule.name).not.toMatch(/[{}]/);
    }
  });

  it("marks only core and architecture as always loaded", async () => {
    for (const rule of RULES) {
      const always = (await pathsOf(rule.name)).length === 0;
      expect(always, rule.name).toBe(["core", "architecture"].includes(rule.name));
    }
  });
});

describe("rule size", () => {
  it.each(FRAMEWORKS)("always-loaded %s rules stay under 200 lines", async (framework) => {
    const { files } = await renderRules(ctxFor(framework, { agents: ["claude"] }));
    const always = RULES.filter((rule) => ["core", "architecture"].includes(rule.name));
    const lines = always.reduce(
      (total, rule) => total + files.get(`.claude/rules/virastack/${rule.name}.md`).split("\n").length,
      0,
    );
    expect(lines).toBeLessThanOrEqual(200);
  });

  it.each(FRAMEWORKS)("%s install stays within its size budget", async (framework) => {
    const { files } = await renderRules(ctxFor(framework, { agents: ["cursor"] }));
    const bytes = [...files.values()].reduce((total, content) => total + Buffer.byteLength(content), 0);
    expect(bytes).toBeLessThanOrEqual(MAX_INSTALL_BYTES[framework]);
  });
});

describe("template text", () => {
  const BANNED = [".cursor/rules/", "Chat: English", "@/data", /\bpnpm /, /\.mdc\b/];

  async function allTemplates() {
    const texts = { "agents.md": await fs.readFile(path.join(TEMPLATES, "agents.md"), "utf8") };
    for (const rule of RULES) texts[`rules/${rule.name}`] = await readRule(rule.name);
    return texts;
  }

  it("contains no v1 paths, fixed package managers or chat language", async () => {
    for (const [name, text] of Object.entries(await allTemplates())) {
      for (const banned of BANNED) {
        if (typeof banned === "string") expect(text, name).not.toContain(banned);
        else expect(text, name).not.toMatch(banned);
      }
    }
  });

  it("uses only known, balanced conditions", async () => {
    for (const [name, text] of Object.entries(await allTemplates())) {
      for (const [, condition, edge] of text.matchAll(/<!-- ([a-z0-9-]+):(start|end) -->/g)) {
        expect(CONDITIONS, `${name}: ${condition}:${edge}`).toContain(condition);
      }
      for (const condition of CONDITIONS) {
        const starts = text.split(`<!-- ${condition}:start -->`).length;
        expect(text.split(`<!-- ${condition}:end -->`).length, `${name}: ${condition}`).toBe(starts);
      }
    }
  });

  it("has no barrel imports or removed aliases in any example", async () => {
    for (const [name, text] of Object.entries(await allTemplates())) {
      expect(text, name).not.toMatch(/from "@\/(ui|layout|hooks|schemas)"/);
      expect(text, name).not.toMatch(/from "@\/features\/[a-z-]+(\/(api|schemas|types|hooks|components))?"/);
      expect(text, name).not.toMatch(/from "@\/components\/ui"/);
    }
  });

  it("uses no deprecated TanStack Query calls in any rule", async () => {
    for (const [name, text] of Object.entries(await allTemplates())) {
      expect(text, name).not.toMatch(/\.(prefetchQuery|ensureQueryData|fetchQuery)\(/);
    }
  });

  it("names every rule in the catalog", async () => {
    const rules = (await fs.readdir(path.join(TEMPLATES, "rules"))).map((file) => file.replace(/\.md$/, ""));
    expect(rules.sort()).toEqual(RULES.map((rule) => rule.name).sort());
  });

  it.each(RULES.map((rule) => rule.name))("%s description starts with USE WHEN", async (name) => {
    expect(parseFrontmatter(await readRule(name)).data.description).toMatch(/^USE WHEN: /);
  });

  it.each(FRAMEWORKS)("%s output fills every placeholder and strips every marker", async (framework) => {
    for (const i18n of [true, false]) {
      const { files } = await renderRules(ctxFor(framework, { i18n }));
      for (const [file, content] of files) {
        expect(content, file).not.toMatch(/\{\{[A-Z_]+\}\}/);
        expect(content, file).not.toMatch(/<!-- [a-z0-9-]+:(start|end) -->/);
      }
    }
  });
});

describe("AGENTS.md block", () => {
  const block = async (overrides = {}) => {
    const ctx = ctxFor("nextjs", overrides);
    const { rules } = await renderRules(ctx);
    return renderAgentsBlock(ctx, rules);
  };

  it("fills every placeholder", async () => {
    expect(await block({ vitest: true })).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(await block({ vitest: false })).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("offers the single-file test command only with Vitest", async () => {
    expect(await block({ vitest: true })).toContain("- **Test one file:** `pnpm vitest run <path>`");
    expect(await block({ vitest: false })).not.toContain("Test one file");
  });

  it("names rules in the catalog order", async () => {
    const table = (await block()).split("| Rule |")[1] ?? "";
    const names = [...table.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((match) => match[1]);
    expect(names).toEqual(RULES.filter((rule) => !rule.when || rule.when(ctxFor("nextjs"))).map((rule) => rule.name));
  });
});

describe("package docs", () => {
  it("lists every rule in the README", async () => {
    const readme = await fs.readFile(path.join(ROOT, "README.md"), "utf8");
    for (const rule of RULES) expect(readme, rule.name).toContain(`| \`${rule.name}\` |`);
  });

  it("keeps the schema id and the manifest in sync", async () => {
    const schema = JSON.parse(await fs.readFile(path.join(ROOT, "schema.json"), "utf8"));
    expect(schema.$id).toBe(MANIFEST_SCHEMA);
  });
});

describe("rule examples", () => {
  /** @type {Array<[string, RegExp] | [string, RegExp, (rule: string) => boolean]>} */
  const CHECKS = [
    ["any", /(:\s*any\b|\bas any\b|<any>)/],
    ["raw <img>", /<img\b/],
    ["parent-relative import", /from ["']\.\.\//],
    ["useEffect fetch", /useEffect\([\s\S]*fetch\(/],
    ["default export", /export default/, (rule) => rule !== "nextjs"],
  ];

  it.each(RULES.map((rule) => rule.name))("%s examples follow the rules", async (name) => {
    const source = await readRule(name);
    const examples = [...source.matchAll(/<example>([\s\S]*?)<\/example>/g)].map((match) => match[1]);
    expect(examples.length, name).toBeLessThanOrEqual(1);
    expect(source.match(/<incorrect-example>/g)?.length ?? 0, name).toBeLessThanOrEqual(1);
    for (const example of examples) {
      for (const [label, pattern, applies = () => true] of CHECKS) {
        if (applies(name)) expect(example, `${name}: ${label}`).not.toMatch(pattern);
      }
    }
  });
});
