export const BLOCK_BEGIN = "<!-- BEGIN:virastack-ai -->";
export const BLOCK_END = "<!-- END:virastack-ai -->";
export const CLAUDE_IMPORT = "@AGENTS.md";

const IMPORT_LINE = /^@AGENTS\.md[ \t]*$/m;

export function detectEol(text) {
  return text && text.includes("\r\n") ? "\r\n" : "\n";
}

function withEol(text, eol) {
  return text.replace(/\r?\n/g, eol);
}

function findBlock(text) {
  const start = text.indexOf(BLOCK_BEGIN);
  if (start === -1) return null;
  const endMarker = text.indexOf(BLOCK_END, start);
  if (endMarker === -1) return null;
  return { start, end: endMarker + BLOCK_END.length };
}

export function hasBlock(text) {
  return Boolean(text && findBlock(text));
}

/**
 * Adds or refreshes the managed block. Everything outside the markers is kept
 * byte for byte, and the file's own line endings are used for the block.
 */
export function upsertBlock(existing, body) {
  const eol = detectEol(existing);
  const block = withEol(`${BLOCK_BEGIN}\n${body.trim()}\n${BLOCK_END}`, eol);

  if (!existing || existing.trim() === "") return `${block}${eol}`;

  const found = findBlock(existing);
  if (found) return existing.slice(0, found.start) + block + existing.slice(found.end);

  const base = /\r?\n$/.test(existing) ? existing : existing + eol;
  return `${base}${eol}${block}${eol}`;
}

/** Removes the block together with the blank line and line break `upsertBlock` added. */
export function removeBlock(text) {
  const found = findBlock(text);
  if (!found) return text;
  const eol = detectEol(text);

  let start = found.start;
  let end = found.end;
  if (text.slice(end, end + eol.length) === eol) end += eol.length;
  if (start >= eol.length * 2 && text.slice(start - eol.length * 2, start) === eol + eol) {
    start -= eol.length;
  }
  return text.slice(0, start) + text.slice(end);
}

/**
 * Makes sure CLAUDE.md imports AGENTS.md. Returns the new text and how the
 * import got there: `created`, `inserted`, or `null` when it was already present.
 */
export function ensureClaudeImport(existing) {
  if (existing === null) return { text: `${CLAUDE_IMPORT}\n`, mode: "created" };
  if (IMPORT_LINE.test(existing)) return { text: existing, mode: null };
  const eol = detectEol(existing);
  return { text: `${CLAUDE_IMPORT}${eol}${eol}${existing}`, mode: "inserted" };
}

/** Reverts `ensureClaudeImport`. Returns `null` when the file should be deleted. */
export function removeClaudeImport(text, mode) {
  if (mode === "created") return text.trim() === CLAUDE_IMPORT ? null : text;
  if (mode === "inserted") {
    const eol = detectEol(text);
    const prefix = `${CLAUDE_IMPORT}${eol}${eol}`;
    return text.startsWith(prefix) ? text.slice(prefix.length) : text;
  }
  return text;
}
