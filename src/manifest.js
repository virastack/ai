import path from "node:path";
import { readText, writeAtomic } from "./fs.js";

export const MANIFEST_PATH = ".virastack/ai.json";
export const MANIFEST_SCHEMA = "https://unpkg.com/@virastack/ai@2/schema.json";

export async function readManifest(root) {
  const text = await readText(path.join(root, MANIFEST_PATH));
  if (text === null) return null;
  try {
    const data = JSON.parse(text);
    if (data?.version !== 1 || typeof data.files !== "object") return null;
    return data;
  } catch {
    return null;
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

export async function writeManifest(root, manifest) {
  await writeAtomic(path.join(root, MANIFEST_PATH), serializeManifest(manifest));
}

/** Manifest stores `["none"]` for readability; the CLI works with `[]`. */
export function manifestAgents(manifest) {
  if (!Array.isArray(manifest?.agents)) return null;
  return manifest.agents.filter((agent) => agent !== "none");
}
