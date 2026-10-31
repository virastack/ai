import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { RunError } from "./errors.js";

/** Hash of the content with line endings normalized, so CRLF checkouts match. */
export function hash(content) {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

export async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readText(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "EISDIR") return null;
    throw err;
  }
}

/** Real path of a file, or `null` when it is missing or a broken link. */
async function realPath(file) {
  try {
    return await fs.realpath(file);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/** True when both paths reach the same existing file, as a linked CLAUDE.md and AGENTS.md do. */
export async function isSameFile(a, b) {
  const realA = await realPath(a);
  return realA !== null && realA === (await realPath(b));
}

/**
 * Writes through a temp file and rename, so an interrupted run never leaves half a file.
 * A symlink is followed, because renaming over it would replace the link with a regular file.
 */
export async function writeAtomic(file, content) {
  const target = (await realPath(file)) ?? file;
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.virastack-${process.pid}-${Date.now()}.tmp`;
  try {
    await fs.writeFile(temp, content, "utf8");
    await fs.rename(temp, target);
  } catch (err) {
    await fs.rm(temp, { force: true });
    throw err;
  }
}

/** Removes a file, then every parent directory that became empty, stopping at `root`. */
export async function removeFile(file, root) {
  await fs.rm(file, { force: true });
  let dir = path.dirname(file);
  while (isInside(root, dir)) {
    try {
      await fs.rmdir(dir);
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
}

function isInside(root, file) {
  const relative = path.relative(root, file);
  return (
    relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
  );
}

/** Manifest keys are POSIX paths relative to the project root on every OS. */
export function toAbsolute(root, relative) {
  const file = path.join(root, ...relative.split("/"));
  if (!isInside(root, file)) throw new RunError("outsideProject", relative);
  return file;
}

