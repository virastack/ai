import { hasBlock, removeBlock, removeClaudeImport } from "../blocks.js";
import { execute, planDelete, planText, report, resolveConflicts } from "../engine.js";
import { readText, toAbsolute } from "../fs.js";
import { MANIFEST_PATH, readManifest } from "../manifest.js";

export async function remove(root, options, { io, messages, version }) {
  const manifest = await readManifest(root);
  const agentsMd = await readText(toAbsolute(root, "AGENTS.md"));

  if (!manifest && !hasBlock(agentsMd)) {
    io.log(messages.nothingToRemove);
    return 0;
  }

  io.log(messages.title(version));
  io.log("");

  const ops = [];
  for (const [file, fileHash] of Object.entries(manifest?.files ?? {})) {
    const op = await planDelete(root, file, fileHash);
    if (op) ops.push(op);
  }

  if (hasBlock(agentsMd)) {
    const text = removeBlock(agentsMd);
    ops.push(
      text.trim() === ""
        ? { kind: "delete", path: "AGENTS.md", status: "delete" }
        : await planText(root, "AGENTS.md", text),
    );
  }

  const claudeMd = await readText(toAbsolute(root, "CLAUDE.md"));
  if (manifest?.claudeImport && claudeMd !== null) {
    const text = removeClaudeImport(claudeMd, manifest.claudeImport);
    ops.push(
      text === null
        ? { kind: "delete", path: "CLAUDE.md", status: "delete" }
        : await planText(root, "CLAUDE.md", text),
    );
  }

  await resolveConflicts(ops, { ...options, io, messages });

  if (manifest) ops.push({ kind: "delete", path: MANIFEST_PATH, status: "delete" });

  if (!options.dryRun) await execute(root, ops);
  report(ops, { io, messages, dryRun: options.dryRun });
  if (!options.dryRun) io.log(messages.doneRemove);
  return 0;
}
