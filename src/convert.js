const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const CONDITIONAL_BLOCK = /^[ \t]*<!-- ([a-z0-9-]+):start -->[ \t]*\r?\n([\s\S]*?)^[ \t]*<!-- \1:end -->[ \t]*(?:\r?\n|$)/gm;

/** Condition names that may wrap template content. */
export const CONDITIONS = ["i18n", "nextjs", "tanstack"];

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

/**
 * Reads the frontmatter of a rule source: scalar `key: value` pairs and a
 * `paths` list. A rule without `paths` is always loaded.
 */
export function parseFrontmatter(text) {
  const match = text.match(FRONTMATTER);
  if (!match) return { data: {}, body: text };

  /** @type {Record<string, any>} */
  const data = {};
  /** @type {any[] | null} */
  let list = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && list) {
      list.push(parseScalar(item[1]));
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    list = value === "" ? [] : null;
    data[key] = list ?? parseScalar(value);
  }
  return { data, body: text.slice(match[0].length) };
}

/**
 * Keeps or drops `<!-- name:start -->` … `<!-- name:end -->` sections; the
 * markers never reach the user. `i18n` follows the detected library, `nextjs`
 * and `tanstack` follow the framework. Blocks may nest when their names differ.
 *
 * @param {string} text
 * @param {{ i18n?: boolean, framework?: string }} options
 */
export function applyConditionals(text, { i18n, framework }) {
  const enabled = { i18n: Boolean(i18n), nextjs: framework === "nextjs", tanstack: framework === "tanstack" };
  let current = text;
  let previous;
  do {
    previous = current;
    current = current.replace(CONDITIONAL_BLOCK, (block, name, body) => (enabled[name] ? body : ""));
  } while (current !== previous);
  return current;
}

export function managedNote() {
  return "<!-- Managed by @virastack/ai -->";
}

function insertDescription(body, description) {
  if (!description) return body;
  const heading = body.match(/^# .*(\r?\n|$)/m);
  if (!heading) return `${description}\n\n${body}`;
  const end = heading.index + heading[0].length;
  return `${body.slice(0, end).replace(/\r?\n?$/, "\n")}\n${description}\n${body.slice(end)}`;
}

/** The rule without its source frontmatter: note, title, description, body. */
function ruleContent(body, description) {
  return `${managedNote()}\n\n${insertDescription(body.replace(/^\s+/, ""), description)}`;
}

/**
 * Cursor output. Its docs define two states we use: `alwaysApply: true`, and
 * `alwaysApply: false` with comma separated `globs` to attach by file.
 */
export function toCursorRule(source, ctx) {
  const { data, body } = parseFrontmatter(applyConditionals(source, ctx));
  const frontmatter = data.paths?.length
    ? `---\nglobs: ${data.paths.join(",")}\nalwaysApply: false\n---\n`
    : "---\nalwaysApply: true\n---\n";
  return `${frontmatter}${ruleContent(body, data.description)}`;
}

/**
 * Plain Markdown output for Claude Code (`.claude/rules`) and other agents.
 * Scoped rules get a `paths` list; always-on rules get no frontmatter.
 */
export function toMarkdownRule(source, ctx) {
  const { data, body } = parseFrontmatter(applyConditionals(source, ctx));
  const frontmatter = data.paths?.length
    ? `---\npaths:\n${data.paths.map((glob) => `  - ${JSON.stringify(glob)}`).join("\n")}\n---\n`
    : "";
  return `${frontmatter}${ruleContent(body, data.description)}`;
}
