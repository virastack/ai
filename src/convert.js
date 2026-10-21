const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const I18N_BLOCK = /^[ \t]*<!-- i18n:start -->[ \t]*\r?\n[\s\S]*?^[ \t]*<!-- i18n:end -->[ \t]*\r?\n?/gm;
const I18N_MARKER = /^[ \t]*<!-- i18n:(start|end) -->[ \t]*\r?\n?/gm;

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

/** Keeps or drops `<!-- i18n:start -->` sections; the markers never reach the user. */
export function applyConditionals(text, { i18n }) {
  const kept = i18n ? text : text.replace(I18N_BLOCK, "");
  return kept.replace(I18N_MARKER, "");
}

export function managedNote(version) {
  return `<!-- Managed by @virastack/ai v${version}. Edit your own rule file instead. -->`;
}

/** Cursor output: the source `.mdc` as is, with the managed note after the frontmatter. */
export function toCursorRule(source, { version, i18n }) {
  const text = applyConditionals(source, { i18n });
  const match = text.match(FRONTMATTER);
  const head = match ? match[0].replace(/\r?\n?$/, "\n") : "";
  const body = match ? text.slice(match[0].length) : text;
  return `${head}${managedNote(version)}\n\n${body.replace(/^\s+/, "")}`;
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
export function toMarkdownRule(source, { version, i18n }) {
  const { data, body } = parseMdc(applyConditionals(source, { i18n }));
  const globs = data.alwaysApply === true ? [] : splitGlobs(data.globs);
  const frontmatter = globs.length
    ? `---\npaths:\n${globs.map((glob) => `  - ${JSON.stringify(glob)}`).join("\n")}\n---\n`
    : "";
  const content = insertDescription(body.replace(/^\s+/, ""), data.description);
  return `${frontmatter}${managedNote(version)}\n\n${content}`;
}
