import { parseArgs } from "node:util";

export const AGENTS = ["claude", "cursor"];
export const FRAMEWORKS = ["nextjs", "tanstack"];
export const COMMANDS = ["init", "remove"];

const AGENT_ALIASES = { "claude-code": "claude" };

export class UsageError extends Error {
  constructor(key, ...params) {
    super(key);
    this.key = key;
    this.params = params;
  }
}

/**
 * Parses `--agent` values. Returns `[]` for `none`, otherwise the selected
 * agents in canonical order (Claude Code first), without duplicates.
 */
export function parseAgents(value) {
  const list = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => AGENT_ALIASES[item] ?? item);

  if (list.length === 0) throw new UsageError("invalidAgent", value);
  if (list.includes("none")) {
    if (list.length > 1) throw new UsageError("noneCombined");
    return [];
  }

  const unknown = list.find((item) => !AGENTS.includes(item));
  if (unknown) throw new UsageError("invalidAgent", unknown);

  return AGENTS.filter((agent) => list.includes(agent));
}

export function parseCliArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        agent: { type: "string" },
        framework: { type: "string" },
        force: { type: "boolean", short: "f" },
        "dry-run": { type: "boolean" },
        yes: { type: "boolean", short: "y" },
        tr: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    throw new UsageError("badOption", err.message);
  }

  const { values, positionals } = parsed;
  const command = positionals[0] ?? null;

  if (!values.help && !values.version) {
    if (!command) throw new UsageError("missingCommand");
    if (!COMMANDS.includes(command)) throw new UsageError("unknownCommand", command);
    if (positionals.length > 1) throw new UsageError("unexpectedArgument", positionals[1]);
  }

  if (values.framework !== undefined && !FRAMEWORKS.includes(values.framework)) {
    throw new UsageError("invalidFramework", values.framework);
  }

  return {
    command,
    agents: values.agent === undefined ? null : parseAgents(values.agent),
    framework: values.framework ?? null,
    force: Boolean(values.force),
    dryRun: Boolean(values["dry-run"]),
    yes: Boolean(values.yes),
    tr: Boolean(values.tr),
    help: Boolean(values.help),
    version: Boolean(values.version),
  };
}
