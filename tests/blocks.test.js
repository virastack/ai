import { describe, expect, it } from "vitest";
import {
  BLOCK_BEGIN,
  BLOCK_END,
  ensureClaudeImport,
  removeBlock,
  removeClaudeImport,
  upsertBlock,
} from "../src/blocks.js";

describe("AGENTS.md block", () => {
  it("creates a file with only the block", () => {
    expect(upsertBlock(null, "Body")).toBe(`${BLOCK_BEGIN}\nBody\n${BLOCK_END}\n`);
  });

  it("appends to user content and removes cleanly", () => {
    const user = "# My project\n\nOwn rules.\n";
    const withBlock = upsertBlock(user, "Body");
    expect(withBlock.startsWith(user)).toBe(true);
    expect(removeBlock(withBlock)).toBe(user);
  });

  it("refreshes only the block and keeps bytes outside it", () => {
    const before = "Top\n\n";
    const after = "\n\nBottom\n";
    const text = `${before}${BLOCK_BEGIN}\nOld\n${BLOCK_END}${after}`;
    expect(upsertBlock(text, "New")).toBe(`${before}${BLOCK_BEGIN}\nNew\n${BLOCK_END}${after}`);
  });

  it("is idempotent", () => {
    const once = upsertBlock("User\n", "Body");
    expect(upsertBlock(once, "Body")).toBe(once);
  });

  it("keeps CRLF files CRLF", () => {
    const user = "# Windows\r\n\r\nRules\r\n";
    const withBlock = upsertBlock(user, "Line 1\nLine 2");
    expect(withBlock.replace(/\r\n/g, "")).not.toContain("\n");
    expect(removeBlock(withBlock)).toBe(user);
  });
});

describe("CLAUDE.md import", () => {
  it("creates the file when missing", () => {
    expect(ensureClaudeImport(null)).toEqual({ text: "@AGENTS.md\n", mode: "created" });
    expect(removeClaudeImport("@AGENTS.md\n", "created")).toBeNull();
  });

  it("inserts the line at the top and removes exactly that", () => {
    const user = "# Claude notes\n";
    const { text, mode } = ensureClaudeImport(user);
    expect(text).toBe("@AGENTS.md\n\n# Claude notes\n");
    expect(removeClaudeImport(text, mode)).toBe(user);
  });

  it("leaves a file that already imports AGENTS.md untouched", () => {
    const user = "Notes\n@AGENTS.md\n";
    expect(ensureClaudeImport(user)).toEqual({ text: user, mode: null });
  });

  it("keeps a created file the user extended", () => {
    expect(removeClaudeImport("@AGENTS.md\n\nMore\n", "created")).toBe("@AGENTS.md\n\nMore\n");
  });
});
