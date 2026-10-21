import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { parseCliArgs, UsageError } from "./args.js";
import { init } from "./commands/init.js";
import { remove } from "./commands/remove.js";
import { createMessages, isYes } from "./i18n.js";

const PACKAGE_JSON = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "package.json");

export async function readVersion() {
  return JSON.parse(await fs.readFile(PACKAGE_JSON, "utf8")).version;
}

export function terminalIo() {
  return {
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
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

/** Runs the CLI and returns the exit code. `io` is injectable for tests. */
export async function run(argv, { cwd = process.cwd(), io = terminalIo() } = {}) {
  const tr = argv.includes("--tr");
  const messages = createMessages(tr);

  let options;
  try {
    options = parseCliArgs(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    io.error(messages.errors[err.key](...err.params));
    io.error(`\n${messages.usage}`);
    return 1;
  }

  const version = await readVersion();
  if (options.version) {
    io.log(version);
    return 0;
  }
  if (options.help) {
    io.log(messages.usage);
    return 0;
  }

  const command = options.command === "remove" ? remove : init;
  try {
    return await command(cwd, options, { io, messages, version });
  } catch (err) {
    io.error(`${messages.failed} ${err.message}`);
    return 1;
  }
}
