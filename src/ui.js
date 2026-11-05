// Terminal styling without dependencies: a few ANSI codes, off when the output is not a terminal.
// The text stays the same without colors, so pipes, CI logs and tests read plain text.

const SHOWN_ERROR_LINES = 8;

const wrap = (open, close) => (text) => `\u001b[${open}m${text}\u001b[${close}m`;

/**
 * @typedef {{ enabled: boolean, bold: (s: string) => string, dim: (s: string) => string,
 *   red: (s: string) => string, cyan: (s: string) => string, badge: (s: string) => string }} Colors
 */

/** @type {Colors} */
export const plain = {
  enabled: false,
  bold: (s) => s,
  dim: (s) => s,
  red: (s) => s,
  cyan: (s) => s,
  badge: (s) => s,
};

/** @type {Colors} */
const ansi = {
  enabled: true,
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  cyan: wrap(36, 39),
  // Black on the terminal's own cyan, the accent ViraStack Start uses, so it follows the user's theme.
  badge: (s) => wrap(46, 49)(wrap(30, 39)(s)),
};

/**
 * Whether to color a stream. A non-empty NO_COLOR (https://no-color.org) turns colors off and wins;
 * FORCE_COLOR turns them on, or off when it is "0" or "false". Otherwise only an interactive terminal gets them.
 * @param {{ isTTY?: boolean } | undefined} stream
 * @param {NodeJS.ProcessEnv} [env]
 */
export function colorEnabled(stream, env = process.env) {
  if (env.NO_COLOR) return false;
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== "0" && env.FORCE_COLOR !== "false";
  return Boolean(stream?.isTTY) && env.TERM !== "dumb";
}

/** @param {boolean} enabled */
export function createColors(enabled) {
  return enabled ? ansi : plain;
}

/** `ViraStack AI v2.2.0`: the name as a badge in the accent color, the version dimmed. */
export function formatTitle(colors, version) {
  return colors.enabled ? `${colors.badge(" ViraStack AI ")} ${colors.dim(`v${version}`)}` : `ViraStack AI v${version}`;
}

/**
 * Colors the help text: headings bold, commands and flags in the accent color.
 * Only colors change, so the layout is the same without them.
 * @param {Colors} colors
 * @param {string} text
 */
export function formatHelp(colors, text) {
  return text
    .split("\n")
    .map((line, index) => {
      if (index === 0) return line.replace(/^(\S+:)(.*)$/, (_, label, rest) => `${colors.bold(label)}${colors.cyan(rest)}`);
      if (/^\S.*:$/.test(line)) return colors.bold(line);
      const match = line.match(/^(\s+)(\S.*?)(\s{2,})(\S.*)$/);
      return match ? `${match[1]}${colors.cyan(match[2])}${match[3]}${match[4]}` : line;
    })
    .join("\n");
}

/**
 * A failure: a red mark and the first line, then at most the last few lines dimmed.
 * @param {Colors} colors
 * @param {string} message
 */
export function formatError(colors, message) {
  const [summary, ...rest] = message.split("\n");
  const details = rest.filter((line) => line.trim()).slice(-SHOWN_ERROR_LINES).map((line) => `  ${colors.dim(line.trim())}`);
  return [`${colors.red("✖")} ${colors.red(summary)}`, ...details].join("\n");
}
