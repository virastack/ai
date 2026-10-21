import { hash, readText, removeFile, toAbsolute, writeAtomic } from "./fs.js";
import { MANIFEST_PATH, serializeManifest } from "./manifest.js";

/**
 * An operation is one file the CLI wants to touch:
 * - `{ kind: "write", path, content, status, managed }` where status is
 *   `create`, `update`, `unchanged` or `conflict`
 * - `{ kind: "delete", path, status, legacy }` where status is `delete`,
 *   `conflict` or `kept`
 * `managed` files are tracked by hash in the manifest; blocks are not.
 * Resolved conflicts become `overwrite`/`delete`; unresolved ones `skip`.
 */

/** Classifies a managed file write against disk and the previous manifest. */
export async function planWrite(root, file, content, previousHash) {
  const current = await readText(toAbsolute(root, file));
  if (current === null) return { kind: "write", path: file, content, status: "create", managed: true };
  if (current === content) return { kind: "write", path: file, content, status: "unchanged", managed: true };
  if (previousHash && hash(current) === previousHash) {
    return { kind: "write", path: file, content, status: "update", managed: true };
  }
  return {
    kind: "write",
    path: file,
    content,
    status: "conflict",
    managed: true,
    reason: previousHash ? "reasonModified" : "reasonUnknown",
    previousHash,
  };
}

/** Classifies a block-style write (AGENTS.md, CLAUDE.md); these never conflict. */
export async function planText(root, file, content) {
  const current = await readText(toAbsolute(root, file));
  const status = current === null ? "create" : current === content ? "unchanged" : "update";
  return { kind: "write", path: file, content, status, managed: false };
}

/** Classifies removing a managed file that is no longer wanted. */
export async function planDelete(root, file, previousHash) {
  const current = await readText(toAbsolute(root, file));
  if (current === null) return null;
  if (!previousHash || hash(current) === previousHash) return { kind: "delete", path: file, status: "delete" };
  return { kind: "delete", path: file, status: "conflict", reason: "reasonModified", previousHash };
}

/**
 * Settles conflicts: `--force` takes them, an interactive terminal is asked
 * once with the full list, everything else (CI, `--yes`, `--dry-run`) skips.
 */
export async function resolveConflicts(ops, { force, yes, dryRun, io, messages }) {
  const conflicts = ops.filter((op) => op.status === "conflict");
  if (conflicts.length === 0) return;

  let accept = force;
  if (!accept && !yes && !dryRun && io.interactive) {
    io.log(`\n${messages.conflictList}`);
    for (const op of conflicts) io.log(`  ${op.path} (${messages[op.reason]})`);
    const deleting = conflicts.every((op) => op.kind === "delete");
    accept = await io.confirm(deleting ? messages.confirmDelete : messages.confirmOverwrite);
  }

  for (const op of conflicts) {
    if (accept) {
      op.status = op.kind === "delete" ? "delete" : "update";
    } else {
      op.status = "skip";
      if (!io.interactive && !yes && !dryRun) op.reason = "reasonNoTty";
    }
  }
}

/** Manifest hashes after the run: written files get new hashes, skipped ones keep their old ones. */
export function manifestFiles(ops) {
  const files = {};
  for (const op of ops) {
    if (op.kind === "write" && op.managed) {
      if (op.status === "skip") {
        if (op.previousHash) files[op.path] = op.previousHash;
      } else {
        files[op.path] = hash(op.content);
      }
    }
    if (op.kind === "delete" && op.status === "skip" && op.previousHash) {
      files[op.path] = op.previousHash;
    }
  }
  return files;
}

export async function planManifest(root, data) {
  return planText(root, MANIFEST_PATH, serializeManifest(data));
}

export async function execute(root, ops) {
  for (const op of ops) {
    if (op.kind === "write" && (op.status === "create" || op.status === "update")) {
      await writeAtomic(toAbsolute(root, op.path), op.content);
    }
  }
  for (const op of ops) {
    if (op.kind === "delete" && op.status === "delete") {
      await removeFile(toAbsolute(root, op.path), root);
    }
  }
}

const SYMBOLS = { create: "+", update: "~", delete: "-", skip: "!", kept: "!" };

export function report(ops, { io, messages, dryRun }) {
  const counts = { create: 0, update: 0, delete: 0, skip: 0 };
  for (const op of ops) {
    if (op.status === "unchanged") continue;
    const label = {
      create: messages.created,
      update: messages.updated,
      delete: messages.removed,
      skip: messages.skipped,
      kept: messages.kept,
    }[op.status];
    const reason = op.reason ? `: ${messages[op.reason]}` : "";
    const legacy = op.legacy ? " (v1)" : "";
    io.log(`  ${SYMBOLS[op.status]} ${op.path}${legacy} · ${label}${reason}`);
    if (op.status === "kept") counts.skip++;
    else counts[op.status]++;
  }
  io.log(`\n${messages.summary(counts.create, counts.update, counts.delete, counts.skip)}`);
  if (dryRun) io.log(messages.dryRun);
  return counts;
}
