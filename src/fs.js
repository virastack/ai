import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

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

/** Writes through a temp file and rename, so an interrupted run never leaves half a file. */
export async function writeAtomic(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.virastack-${process.pid}-${Date.now()}.tmp`;
  try {
    await fs.writeFile(temp, content, "utf8");
    await fs.rename(temp, file);
  } catch (err) {
    await fs.rm(temp, { force: true });
    throw err;
  }
}

/** Removes a file, then every parent directory that became empty, stopping at `root`. */
export async function removeFile(file, root) {
  await fs.rm(file, { force: true });
  let dir = path.dirname(file);
  const stop = path.resolve(root);
  while (path.resolve(dir) !== stop && path.resolve(dir).startsWith(stop)) {
    try {
      await fs.rmdir(dir);
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
}

/** Manifest keys are POSIX paths relative to the project root on every OS. */
export function toAbsolute(root, relative) {
  return path.join(root, ...relative.split("/"));
}
