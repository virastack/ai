import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLAUDE_IMPORT, hasBlock } from "../blocks.js";
import { hash, readText, toAbsolute } from "../fs.js";

const HASHES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "v1-hashes.json");
const NEXT_BLOCK = /<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->(?:\r?\n)*/;
const V1_AGENTS_MARKER = "core-principles.mdc";

/**
 * Hashes of every file v1.x shipped, so an untouched one can be recognised and removed.
 * @typedef {{ versions: string[], files: Record<string, string[]>, agentsMd: string[], nextjsBlock: string[] }} V1Hashes
 */

/** @type {V1Hashes | null} */
let cachedHashes = null;

/** @returns {Promise<V1Hashes>} */
export async function loadV1Hashes() {
  if (cachedHashes) return cachedHashes;

  cachedHashes = /** @type {V1Hashes} */ (JSON.parse(await fs.readFile(HASHES_FILE, "utf8")));
  return cachedHashes;
}

/** Splits the Next.js `agents-md` block from the rest of an AGENTS.md file. */
export function splitNextBlock(text) {
  const match = text.match(NEXT_BLOCK);
  if (!match) return { block: null, rest: text };
  return {
    block: match[0].replace(/(\r?\n)+$/, ""),
    rest: text.slice(0, match.index) + text.slice(match.index + match[0].length),
  };
}

export function agentsMdKey(text) {
  return hash(splitNextBlock(text).rest.trim());
}

/**
 * Finds files a v1.x install left behind. Unchanged ones are removed,
 * edited ones are kept and reported. Only runs before the first v2 install.
 */
export async function planLegacy(root, { claudeSelected }) {
  const v1 = await loadV1Hashes();
  /** @type {{ deletes: string[], kept: string[], agentsMdBase?: string, claudeImport?: string, warnings: string[] }} */
  const result = { deletes: [], kept: [], agentsMdBase: undefined, claudeImport: undefined, warnings: [] };

  for (const [file, known] of Object.entries(v1.files)) {
    if (file === "CLAUDE.md") continue;
    const text = await readText(toAbsolute(root, file));
    if (text === null) continue;
    if (known.includes(hash(text))) result.deletes.push(file);
    else result.kept.push(file);
  }

  const agents = await readText(toAbsolute(root, "AGENTS.md"));
  if (agents !== null && !hasBlock(agents)) {
    const { block, rest } = splitNextBlock(agents);
    const v1NextBlock = block !== null && v1.nextjsBlock.includes(hash(block));
    const keptNextBlock = block !== null && !v1NextBlock ? block : null;

    if (rest.trim() && v1.agentsMd.includes(hash(rest.trim()))) {
      result.agentsMdBase = keptNextBlock ? `${keptNextBlock}\n` : "";
    } else if (rest.includes(V1_AGENTS_MARKER)) {
      result.agentsMdBase = v1NextBlock ? rest : agents;
      result.warnings.push("legacyAgentsMd");
    } else if (v1NextBlock) {
      result.agentsMdBase = rest;
    }
  }

  const claude = await readText(toAbsolute(root, "CLAUDE.md"));
  if (claude !== null && claude.trim() === CLAUDE_IMPORT) {
    if (claudeSelected) result.claudeImport = "created";
    else result.deletes.push("CLAUDE.md");
  }

  return result;
}
