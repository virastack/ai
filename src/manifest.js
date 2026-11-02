import path from "node:path";
import { ADAPTERS } from "./adapters.js";
import { AGENTS, FRAMEWORKS } from "./args.js";
import { readText } from "./fs.js";

export const MANIFEST_PATH = ".virastack/ai.json";
export const MANIFEST_SCHEMA = "https://unpkg.com/@virastack/ai@2/schema.json";

const RULE_DIRS = Object.values(ADAPTERS).map((adapter) => `${adapter.dir}/`);
const HASH = /^[0-9a-f]{64}$/;

/** The CLI only ever installs into its own rule folders, so a key elsewhere is never trusted. */
function isRulePath(file) {
  return (
    RULE_DIRS.some((dir) => file.startsWith(dir)) &&
    file.split("/").every((part) => part !== "" && part !== "." && part !== ".." && !/[\\:]/.test(part))
  );
}

/**
 * Manifests are committed, so they arrive with cloned repositories and cannot
 * be trusted. Keys outside the rule folders are dropped and listed in `ignored`.
 * A bad hash becomes `null`, which the engine treats as a file it does not own.
 */
function sanitize(data) {
  const files = {};
  const ignored = [];
  for (const [file, fileHash] of Object.entries(data.files)) {
    if (!isRulePath(file)) ignored.push(file);
    else files[file] = HASH.test(fileHash) ? fileHash : null;
  }
  const framework = FRAMEWORKS.includes(data.framework) ? data.framework : undefined;
  return { ...data, framework, files, ignored };
}

/** `null` means no install; `corrupt` means one exists but its files can no longer be recognized. */
export async function readManifest(root) {
  const text = await readText(path.join(root, MANIFEST_PATH));
  if (text === null) return null;
  const corrupt = { corrupt: true, files: {}, ignored: [] };
  try {
    const data = JSON.parse(text);
    if (data?.version !== 1 || !data.files || typeof data.files !== "object" || Array.isArray(data.files)) {
      return corrupt;
    }
    return sanitize(data);
  } catch {
    return corrupt;
  }
}

export function serializeManifest({ cliVersion, framework, agents, files, claudeImport }) {
  const sortedFiles = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  const data = {
    $schema: MANIFEST_SCHEMA,
    version: 1,
    cliVersion,
    framework,
    agents: agents.length ? agents : ["none"],
    ...(claudeImport ? { claudeImport } : {}),
    files: sortedFiles,
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** Manifest stores `["none"]` for readability; the CLI works with `[]`. */
export function manifestAgents(manifest) {
  if (!Array.isArray(manifest?.agents)) return null;
  const agents = manifest.agents.filter((agent) => agent !== "none");
  return agents.every((agent) => AGENTS.includes(agent)) ? agents : null;
}
