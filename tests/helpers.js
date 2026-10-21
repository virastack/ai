import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "../src/cli.js";

export const NEXT_PKG = { dependencies: { next: "16.0.0" } };
export const NEXT_I18N_PKG = { dependencies: { next: "16.0.0", "next-intl": "4.0.0" } };
export const TANSTACK_PKG = { dependencies: { "@tanstack/react-start": "1.0.0" } };
export const TANSTACK_I18N_PKG = {
  dependencies: { "@tanstack/react-start": "1.0.0", "@inlang/paraglide-js": "2.0.0" },
};

/** Creates a temp project with a package.json and optional extra files. */
export async function makeProject(pkg, files = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "virastack-ai-test-"));
  await fs.writeFile(path.join(dir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  for (const [file, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await fs.writeFile(path.join(dir, file), content);
  }
  return dir;
}

export async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

/** Runs the CLI in-process with a fake terminal. `answer` is the reply to any question. */
export async function cli(dir, args, { interactive = false, answer = false } = {}) {
  const out = [];
  const err = [];
  const questions = [];
  const io = {
    interactive,
    log: (message) => out.push(message),
    error: (message) => err.push(message),
    confirm: async (question) => {
      questions.push(question);
      return answer;
    },
  };
  const code = await run(args, { cwd: dir, io });
  return { code, out: out.join("\n"), err: err.join("\n"), questions };
}

/** Every file under `dir` as POSIX path → content. */
export async function readTree(dir, base = dir) {
  const tree = {};
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(tree, await readTree(full, base));
    else tree[path.relative(base, full).split(path.sep).join("/")] = await fs.readFile(full, "utf8");
  }
  return Object.fromEntries(Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)));
}

/** Lines of the per-file report (`+ path · created`), without the summary. */
export function reportLines(output) {
  return output.split("\n").filter((line) => /^ {2}[+~\-!] /.test(line));
}
