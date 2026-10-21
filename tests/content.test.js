import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONDITIONS, parseMdc, splitGlobs } from "../src/convert.js";
import { renderRules, renderSkills } from "../src/render.js";
import { RULES, SKILLS } from "../src/rules.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = path.join(ROOT, "templates");
const START = JSON.parse(await fs.readFile(path.join(ROOT, "tests/fixtures/start-tree.json"), "utf8"));

/** Rule size of a v1.3.2 install (rules plus docs/architecture-guide.md), per framework. */
const V1_BYTES = { nextjs: 36192, tanstack: 35408 };

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

/** Start templates a rule is installed into. */
function fixturesFor(rule) {
  return Object.entries(START)
    .filter(([name]) => {
      const framework = name.startsWith("nextjs") ? "nextjs" : "tanstack";
      return !rule.when || rule.when({ framework, i18n: name.endsWith("-i18n") });
    })
    .flatMap(([, files]) => files);
}

async function readRule(name) {
  return fs.readFile(path.join(TEMPLATES, "rules", `${name}.mdc`), "utf8");
}

async function readSkill(name) {
  return fs.readFile(path.join(TEMPLATES, "skills", name, "SKILL.md"), "utf8");
}

describe("rule globs", () => {
  it.each(RULES.map((rule) => [rule.name, rule]))("%s globs match Start files", async (name, rule) => {
    const { data } = parseMdc(await readRule(name));
    const files = fixturesFor(rule);
    for (const glob of splitGlobs(data.globs)) {
      const pattern = globToRegExp(glob);
      expect(files.some((file) => pattern.test(file)), `${name}: ${glob}`).toBe(true);
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

  it.each(FRAMEWORKS)("%s rules are at least 30%% smaller than v1", async (framework) => {
    const { files } = await renderRules(ctxFor(framework, { agents: ["cursor"] }));
    const bytes = [...files.values()].reduce((total, content) => total + Buffer.byteLength(content), 0);
    expect(bytes).toBeLessThanOrEqual(V1_BYTES[framework] * 0.7);
  });
});

describe("template text", () => {
  const BANNED = [".cursor/rules/", "Chat: English", "@/data", /\bpnpm /, /\.mdc\b/];

  async function allTemplates() {
    const texts = { "agents.md": await fs.readFile(path.join(TEMPLATES, "agents.md"), "utf8") };
    for (const rule of RULES) texts[`rules/${rule.name}`] = await readRule(rule.name);
    for (const skill of SKILLS) texts[`skills/${skill}`] = await readSkill(skill);
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

  it("names every rule and skill in the catalog", async () => {
    const rules = (await fs.readdir(path.join(TEMPLATES, "rules"))).map((file) => file.replace(/\.mdc$/, ""));
    expect(rules.sort()).toEqual(RULES.map((rule) => rule.name).sort());
    expect((await fs.readdir(path.join(TEMPLATES, "skills"))).sort()).toEqual([...SKILLS].sort());
  });

  it.each(RULES.map((rule) => rule.name))("%s description starts with USE WHEN", async (name) => {
    expect(parseMdc(await readRule(name)).data.description).toMatch(/^USE WHEN: /);
  });

  it.each(FRAMEWORKS)("%s output fills every placeholder and strips every marker", async (framework) => {
    for (const i18n of [true, false]) {
      const { files } = await renderRules(ctxFor(framework, { i18n }));
      const skills = await renderSkills(ctxFor(framework, { i18n }));
      for (const [file, content] of [...files, ...skills]) {
        expect(content, file).not.toMatch(/\{\{[A-Z_]+\}\}/);
        expect(content, file).not.toMatch(/<!-- [a-z0-9-]+:(start|end) -->/);
      }
    }
  });
});

describe("rule examples", () => {
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

describe("skills", () => {
  it.each(SKILLS)("%s has name and description frontmatter", async (skill) => {
    const { data } = parseMdc(await readSkill(skill));
    expect(data.name).toBe(skill);
    expect(data.description).toMatch(/^USE WHEN: /);
  });

  it("are copied to .claude/skills only for Claude Code", async () => {
    const both = await renderSkills(ctxFor("nextjs"));
    expect([...both.keys()].filter((file) => file.startsWith(".claude/skills/"))).toHaveLength(SKILLS.length);
    const cursor = await renderSkills(ctxFor("nextjs", { agents: ["cursor"] }));
    expect([...cursor.keys()].every((file) => file.startsWith(".agents/skills/"))).toBe(true);
    const none = await renderSkills(ctxFor("nextjs", { agents: [] }));
    expect(none.size).toBe(SKILLS.length);
  });

  it("keeps the frontmatter first", async () => {
    for (const content of (await renderSkills(ctxFor("tanstack"))).values()) {
      expect(content.startsWith("---\nname: ")).toBe(true);
    }
  });
});
