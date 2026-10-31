import { toCursorRule, toMarkdownRule } from "./convert.js";

/** Where each agent reads rules from, and how a rule is written for it. */
export const ADAPTERS = {
  claude: {
    label: "Claude Code",
    dir: ".claude/rules/virastack",
    extension: ".md",
    render: toMarkdownRule,
  },
  cursor: {
    label: "Cursor",
    dir: ".cursor/rules/virastack",
    extension: ".mdc",
    render: toCursorRule,
  },
  none: {
    label: "AGENTS.md",
    dir: ".agents/rules/virastack",
    extension: ".md",
    render: toMarkdownRule,
  },
};

/** `[]` (from `--agent none`) installs the plain Markdown copy only. */
export function adaptersFor(agents) {
  return agents.length === 0 ? [ADAPTERS.none] : agents.map((agent) => ADAPTERS[agent]);
}
