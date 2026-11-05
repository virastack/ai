import { stripVTControlCharacters } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { run } from "../src/cli.js";
import { createMessages } from "../src/i18n.js";
import { colorEnabled, createColors, formatError, formatHelp, formatTitle, plain } from "../src/ui.js";
import { cleanup, makeProject, NEXT_PKG } from "./helpers.js";

const color = createColors(true);
const ESC = "\u001b[";

/** Runs the CLI with colors on for both streams. */
async function colorCli(dir, args) {
  const out = [];
  const err = [];
  const io = {
    interactive: false,
    colors: color,
    errorColors: color,
    log: (message) => out.push(message),
    error: (message) => err.push(message),
    confirm: async () => false,
  };
  const code = await run(args, { cwd: dir, io });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

describe("colorEnabled", () => {
  const tty = { isTTY: true };
  it("colors an interactive terminal only", () => {
    expect(colorEnabled(tty, {})).toBe(true);
    expect(colorEnabled({ isTTY: false }, {})).toBe(false);
    expect(colorEnabled(undefined, {})).toBe(false);
    expect(colorEnabled(tty, { TERM: "dumb" })).toBe(false);
  });
  it("follows NO_COLOR and FORCE_COLOR", () => {
    expect(colorEnabled(tty, { NO_COLOR: "1" })).toBe(false);
    expect(colorEnabled(tty, { NO_COLOR: "" })).toBe(true);
    expect(colorEnabled({ isTTY: false }, { FORCE_COLOR: "1" })).toBe(true);
    expect(colorEnabled(tty, { FORCE_COLOR: "0" })).toBe(false);
    expect(colorEnabled(tty, { FORCE_COLOR: "false" })).toBe(false);
    expect(colorEnabled({ isTTY: false }, { NO_COLOR: "1", FORCE_COLOR: "1" })).toBe(false);
  });
});

describe("formatTitle", () => {
  it("is plain text without colors", () => {
    expect(formatTitle(plain, "2.2.0")).toBe("ViraStack AI v2.2.0");
  });
  it("shows the name as a cyan badge and dims the version", () => {
    const title = formatTitle(color, "2.2.0");
    expect(title).toContain(`${ESC}46m`);
    expect(stripVTControlCharacters(title)).toBe(" ViraStack AI  v2.2.0");
  });
});

describe("formatHelp", () => {
  for (const tr of [false, true]) {
    const { usage } = createMessages(tr);
    it(`only adds colors, the text stays the same (${tr ? "tr" : "en"})`, () => {
      expect(formatHelp(plain, usage)).toBe(usage);
      expect(stripVTControlCharacters(formatHelp(color, usage))).toBe(usage);
    });
  }
  it("makes headings bold and commands and flags cyan", () => {
    const help = formatHelp(color, createMessages(false).usage);
    expect(help).toContain(`${ESC}1mCommands:${ESC}22m`);
    expect(help).toContain(`${ESC}36minit${ESC}39m`);
    expect(help).toContain(`${ESC}36m-h, --help${ESC}39m`);
  });
});

describe("formatError", () => {
  it("marks the first line", () => {
    expect(formatError(plain, "Unknown command: x")).toBe("✖ Unknown command: x");
    expect(formatError(color, "Unknown command: x")).toBe(`${ESC}31m✖${ESC}39m ${ESC}31mUnknown command: x${ESC}39m`);
  });
  it("keeps only the last lines of a long message, dimmed", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
    const message = formatError(plain, ["Failed", ...lines].join("\n")).split("\n");
    expect(message).toHaveLength(9);
    expect(message[0]).toBe("✖ Failed");
    expect(message[1]).toBe("  line 13");
    expect(message.at(-1)).toBe("  line 20");
    expect(formatError(color, "Failed\ndetail")).toContain(`${ESC}2mdetail${ESC}22m`);
  });
});

describe("CLI output", () => {
  let dir;
  afterEach(async () => {
    if (dir) await cleanup(dir);
    dir = undefined;
  });

  it("prints plain text when io has no colors", async () => {
    dir = await makeProject(NEXT_PKG);
    const out = [];
    const err = [];
    const io = { interactive: false, log: (m) => out.push(m), error: (m) => err.push(m), confirm: async () => false };
    expect(await run(["--help"], { cwd: dir, io })).toBe(0);
    expect(out.join("\n")).toBe(createMessages(false).usage);
    expect(await run(["nope"], { cwd: dir, io })).toBe(1);
    expect(err[0]).toBe("✖ Unknown command: nope");
    expect(err.join("\n")).not.toContain(ESC);
  });

  it("colors --help, the title and errors", async () => {
    dir = await makeProject(NEXT_PKG);
    const help = await colorCli(dir, ["--help", "--tr"]);
    expect(help.out).toContain(`${ESC}1mKomutlar:${ESC}22m`);

    const init = await colorCli(dir, ["init", "--dry-run"]);
    expect(init.code).toBe(0);
    expect(init.out.split("\n")[0]).toContain(`${ESC}46m`);

    const bad = await colorCli(dir, ["init", "--framework", "vue"]);
    expect(bad.code).toBe(1);
    expect(bad.err.split("\n")[0]).toBe(formatError(color, "Unknown framework: vue. Use nextjs or tanstack."));
  });
});
