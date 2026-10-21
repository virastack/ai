import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adaptersFor } from "./adapters.js";
import { parseMdc } from "./convert.js";
import { packageManagerCommands } from "./detect.js";
import { FRAMEWORK_NAMES, FRAMEWORK_RULES, selectRules } from "./rules.js";

const TEMPLATES = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "templates");

async function readTemplate(relative) {
  return fs.readFile(path.join(TEMPLATES, relative), "utf8");
}

/** Values for the `{{NAME}}` placeholders in rules and the AGENTS.md block. */
function templateValues(ctx) {
  const commands = packageManagerCommands(ctx.packageManager);
  return {
    FRAMEWORK_NAME: FRAMEWORK_NAMES[ctx.framework],
    FRAMEWORK_RULE: FRAMEWORK_RULES[ctx.framework],
    DEV_COMMAND: commands.dev,
    VALIDATE_COMMAND: commands.validate,
    TEST_COMMAND: commands.test,
    BUILD_COMMAND: commands.build,
    EXEC_COMMAND: commands.exec,
  };
}

function fill(text, values) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => values[key] ?? match);
}

/**
 * Renders every managed rule file for the context.
 * Returns the files (POSIX path → content) and rule metadata for the AGENTS.md map.
 */
export async function renderRules(ctx) {
  const values = templateValues(ctx);
  const rules = [];
  for (const rule of selectRules(ctx)) {
    const source = fill(await readTemplate(`rules/${rule.name}.mdc`), values);
    const { data } = parseMdc(source);
    rules.push({ name: rule.name, source, description: data.description ?? "", always: data.alwaysApply === true });
  }

  const files = new Map();
  for (const adapter of adaptersFor(ctx.agents)) {
    for (const rule of rules) {
      files.set(`${adapter.dir}/${rule.name}${adapter.extension}`, adapter.render(rule.source, ctx));
    }
  }
  return { files, rules };
}

const READ_HINT = `read the "Always" rules at the start of every task and the matching rule before editing, from`;

function ruleLocations(agents) {
  const adapters = adaptersFor(agents);
  if (agents.length === 0) {
    return `- **All agents:** ${READ_HINT} \`${adapters[0].dir}/\`.`;
  }
  const lines = adapters.map((adapter) => `- **${adapter.label}:** \`${adapter.dir}/\` (loaded automatically)`);
  lines.push(`- **Other agents:** ${READ_HINT} \`${adapters[0].dir}/\`.`);
  return lines.join("\n");
}

function ruleRow(rule) {
  const description = rule.description.replace(/^USE WHEN:\s*/i, "").replace(/\|/g, "\\|");
  return `| \`${rule.name}\` | ${description} |`;
}

/** Body of the managed AGENTS.md block (without the BEGIN/END markers). */
export async function renderAgentsBlock(ctx, rules) {
  return fill(await readTemplate("agents.md"), {
    ...templateValues(ctx),
    RULE_LOCATIONS: ruleLocations(ctx.agents),
    RULE_TABLE: rules.map(ruleRow).join("\n"),
  });
}
