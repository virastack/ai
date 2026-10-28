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

/** Reads the flat `key: value` frontmatter that Cursor `.mdc` files use. */
export function parseMdc(text) {
  const match = text.match(FRONTMATTER);
  if (!match) return { data: {}, body: text };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    data[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  }
  return { data, body: text.slice(match[0].length) };
}

/** Splits a Cursor `globs` string on commas that are not inside `{...}`. */
export function splitGlobs(value) {
  if (!value) return [];
  const globs = [];
  let depth = 0;
  let current = "";
  for (const char of String(value)) {
    if (char === "{") depth++;
    if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      globs.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  globs.push(current);
  return globs.map((glob) => glob.trim()).filter(Boolean);
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

/** Cursor output: the source `.mdc` as is, with the managed note after the frontmatter. */
export function toCursorRule(source, ctx) {
  const text = applyConditionals(source, ctx);
  const match = text.match(FRONTMATTER);
  const head = match ? match[0].replace(/\r?\n?$/, "\n") : "";
  const body = match ? text.slice(match[0].length) : text;
  return `${head}${managedNote()}\n\n${body.replace(/^\s+/, "")}`;
}

function insertDescription(body, description) {
  if (!description) return body;
  const heading = body.match(/^# .*(\r?\n|$)/m);
  if (!heading) return `${description}\n\n${body}`;
  const end = heading.index + heading[0].length;
  return `${body.slice(0, end).replace(/\r?\n?$/, "\n")}\n${description}\n${body.slice(end)}`;
}

/**
 * Plain Markdown output for Claude Code (`.claude/rules`) and other agents.
 * Scoped rules get a `paths` list; always-on rules get no frontmatter.
 */
export function toMarkdownRule(source, ctx) {
  const { data, body } = parseMdc(applyConditionals(source, ctx));
  const globs = data.alwaysApply === true ? [] : splitGlobs(data.globs);
  const frontmatter = globs.length
    ? `---\npaths:\n${globs.map((glob) => `  - ${JSON.stringify(glob)}`).join("\n")}\n---\n`
    : "";
  const content = insertDescription(body.replace(/^\s+/, ""), data.description);
  return `${frontmatter}${managedNote()}\n\n${content}`;
}
