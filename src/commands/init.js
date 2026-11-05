import { AGENTS } from "../args.js";
import { ensureClaudeImport, removeClaudeImport, upsertBlock } from "../blocks.js";
import { detectFramework, detectI18n, detectPackageManager, detectVitest, readPackageJson } from "../detect.js";
import {
  execute,
  manifestFiles,
  planDelete,
  planManifest,
  planText,
  planWrite,
  report,
  resolveConflicts,
} from "../engine.js";
import { isSameFile, readText, toAbsolute } from "../fs.js";
import { manifestAgents, readManifest } from "../manifest.js";
import { planLegacy } from "../migrate/index.js";
import { renderAgentsBlock, renderRules } from "../render.js";
import { formatError, formatTitle, plain } from "../ui.js";

/** Builds the CLAUDE.md operation and the `claudeImport` value to record. */
async function planClaude(root, claudeSelected, previous) {
  // A CLAUDE.md linked to AGENTS.md already has the block; an import would point at itself.
  if (await isSameFile(toAbsolute(root, "CLAUDE.md"), toAbsolute(root, "AGENTS.md"))) {
    return { op: null, claudeImport: null };
  }

  const current = await readText(toAbsolute(root, "CLAUDE.md"));

  if (claudeSelected) {
    const { text, mode } = ensureClaudeImport(current);
    return { op: await planText(root, "CLAUDE.md", text), claudeImport: mode ?? previous ?? null };
  }

  if (previous && current !== null) {
    const text = removeClaudeImport(current, previous);
    if (text === null) return { op: { kind: "delete", path: "CLAUDE.md", status: "delete" }, claudeImport: null };
    return { op: await planText(root, "CLAUDE.md", text), claudeImport: null };
  }
  return { op: null, claudeImport: null };
}

export async function init(root, options, { io, messages, version, colors = plain, errorColors = plain }) {
  const manifest = await readManifest(root);
  const pkg = await readPackageJson(root);

  const framework = options.framework ?? detectFramework(pkg) ?? manifest?.framework ?? null;
  if (!framework) {
    io.error(formatError(errorColors, messages.unknownFramework));
    return 1;
  }

  const agents = options.agents ?? manifestAgents(manifest) ?? [...AGENTS];
  const ctx = {
    framework,
    agents,
    i18n: detectI18n(pkg),
    vitest: detectVitest(pkg),
    packageManager: await detectPackageManager(root, pkg),
  };

  io.log(formatTitle(colors, version));
  io.log(
    messages.context(framework, agents.length ? agents.join(", ") : messages.none, ctx.i18n, ctx.packageManager),
  );
  io.log("");

  const previous = manifest?.files ?? {};
  const legacy = manifest ? null : await planLegacy(root, { claudeSelected: agents.includes("claude") });
  const ops = [];

  const { files, rules } = await renderRules(ctx);
  for (const [file, content] of files) {
    ops.push(await planWrite(root, file, content, previous[file]));
  }

  const agentsBase = legacy?.agentsMdBase ?? (await readText(toAbsolute(root, "AGENTS.md")));
  ops.push(await planText(root, "AGENTS.md", upsertBlock(agentsBase, await renderAgentsBlock(ctx, rules))));

  const claude = await planClaude(
    root,
    agents.includes("claude"),
    manifest?.claudeImport ?? legacy?.claudeImport,
  );
  if (claude.op) ops.push(claude.op);

  for (const [file, fileHash] of Object.entries(previous)) {
    if (files.has(file)) continue;
    const op = await planDelete(root, file, fileHash);
    if (op) ops.push(op);
  }

  if (legacy) {
    for (const file of legacy.deletes) {
      if (file === "CLAUDE.md" && claude.op) continue;
      ops.push({ kind: "delete", path: file, status: "delete", legacy: true });
    }
    for (const file of legacy.kept) {
      ops.push({ kind: "delete", path: file, status: "kept", legacy: true, reason: "reasonLegacyModified" });
    }
  }

  await resolveConflicts(ops, { ...options, io, messages });

  ops.push(
    await planManifest(root, {
      cliVersion: version,
      framework,
      agents,
      files: manifestFiles(ops),
      claudeImport: claude.claudeImport,
    }),
  );

  if (!options.dryRun) await execute(root, ops);

  const counts = report(ops, { io, messages, dryRun: options.dryRun });
  for (const warning of legacy?.warnings ?? []) io.log(`\n${messages[warning]}`);
  if (manifest?.ignored.length) io.log(`\n${messages.manifestIgnored(manifest.ignored)}`);
  if (manifest?.corrupt) io.log(`\n${messages.manifestCorrupt}`);
  if (!options.dryRun) {
    const skipped = ops.filter((op) => op.status === "skip").length;
    if (skipped) io.log(messages.partialInit(skipped));
    else io.log(counts.create || counts.update || counts.delete ? messages.doneInit : messages.noChanges);
  }
  return 0;
}
