import { describe, expect, it } from "vitest";
import { parseAgents, parseCliArgs, UsageError } from "../src/args.js";

describe("parseAgents", () => {
  it("keeps Claude Code first and drops duplicates", () => {
    expect(parseAgents("cursor,claude,cursor")).toEqual(["claude", "cursor"]);
  });

  it("accepts claude-code as an alias", () => {
    expect(parseAgents("claude-code")).toEqual(["claude"]);
  });

  it("maps none to an empty selection", () => {
    expect(parseAgents("none")).toEqual([]);
  });

  it("rejects none combined with an agent", () => {
    expect(() => parseAgents("none,claude")).toThrow(UsageError);
  });

  it("rejects unknown agents", () => {
    expect(() => parseAgents("windsurf")).toThrow(UsageError);
  });
});

describe("parseCliArgs", () => {
  it("reads every flag", () => {
    expect(
      parseCliArgs(["init", "--agent=claude", "--framework", "tanstack", "-f", "--dry-run", "-y", "--tr"]),
    ).toEqual({
      command: "init",
      agents: ["claude"],
      framework: "tanstack",
      force: true,
      dryRun: true,
      yes: true,
      tr: true,
      help: false,
      version: false,
    });
  });

  it("leaves agents unset when the flag is missing", () => {
    expect(parseCliArgs(["init"]).agents).toBeNull();
  });

  it("allows --help and --version without a command", () => {
    expect(parseCliArgs(["--help"]).help).toBe(true);
    expect(parseCliArgs(["-v"]).version).toBe(true);
  });

  it.each([[[]], [["build"]], [["init", "extra"]], [["init", "--framework", "remix"]], [["init", "--nope"]]])(
    "rejects %j",
    (argv) => {
      expect(() => parseCliArgs(argv)).toThrow(UsageError);
    },
  );
});
