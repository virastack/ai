import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { parseCliArgs, UsageError } from "./args.js";
import { init } from "./commands/init.js";
import { remove } from "./commands/remove.js";
import { RunError } from "./errors.js";
import { createMessages, isYes } from "./i18n.js";
import { colorEnabled, createColors, formatError, formatHelp, plain } from "./ui.js";

const PACKAGE_JSON = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "package.json");

export async function readVersion() {
  return JSON.parse(await fs.readFile(PACKAGE_JSON, "utf8")).version;
}

/**
 * @typedef {object} Io
 * @property {boolean} interactive
 * @property {import("./ui.js").Colors} [colors] Styling for `log`; plain when left out.
 * @property {import("./ui.js").Colors} [errorColors] Styling for `error`; plain when left out.
 * @property {(message: string) => void} log
 * @property {(message: string) => void} error
 * @property {(question: string) => Promise<boolean>} confirm
 */

/** @returns {Io} */
export function terminalIo() {
  return {
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    colors: createColors(colorEnabled(process.stdout)),
    errorColors: createColors(colorEnabled(process.stderr)),
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    confirm: (question) =>
      new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
          rl.close();
          resolve(isYes(answer));
        });
      }),
  };
}

/**
 * Runs the CLI and returns the exit code. `io` is injectable for tests; without `colors` it prints plain text.
 * @param {string[]} argv
 * @param {{ cwd?: string, io?: Io }} [options]
 */
export async function run(argv, { cwd = process.cwd(), io = terminalIo() } = {}) {
  const tr = argv.includes("--tr");
  const messages = createMessages(tr);
  const colors = io.colors ?? plain;
  const errorColors = io.errorColors ?? plain;

  let options;
  try {
    options = parseCliArgs(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    io.error(formatError(errorColors, messages.errors[err.key](...err.params)));
    io.error(`\n${formatHelp(errorColors, messages.usage)}`);
    return 1;
  }

  const version = await readVersion();
  if (options.version) {
    io.log(version);
    return 0;
  }
  if (options.help) {
    io.log(formatHelp(colors, messages.usage));
    return 0;
  }

  const command = options.command === "remove" ? remove : init;
  try {
    const context = { io, messages, version, colors, errorColors };
    return await command(cwd, options, context);
  } catch (err) {
    const detail = err instanceof RunError ? messages.errors[err.key](...err.params) : err.message;
    io.error(formatError(errorColors, `${messages.failed} ${detail}`));
    return 1;
  }
}
