<div align="center">

<a href="https://github.com/virastack/ai" target="_blank" rel="noreferrer">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/virastack/ai/main/assets/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/virastack/ai/main/assets/logo-light.png">
    <img src="https://raw.githubusercontent.com/virastack/ai/main/assets/logo-light.png" alt="ViraStack AI" height="120" style="max-width: 100%;" />
  </picture>
</a>

*Agent rules for modern React in one command: Claude Code, Cursor and AGENTS.md*

[![ViraStack AI](https://img.shields.io/badge/ViraStack-AI-%23e131fa)](https://virastack.com/ai)
[![npm version](https://img.shields.io/npm/v/@virastack/ai?color=e131fa)](https://www.npmjs.com/package/@virastack/ai)
[![npm downloads](https://img.shields.io/npm/dt/@virastack/ai?color=e131fa)](https://www.npmjs.com/package/@virastack/ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/virastack/ai/blob/main/LICENSE)
[![@virastack](https://img.shields.io/badge/-%40virastack-black?logo=x&logoColor=white)](https://x.com/virastack)

</div>

---

### [See how it works →](https://virastack.com/ai/)

## Features

- **Claude Code and Cursor, one command:** Writes the same rules in each tool's native format. Claude Code gets `.claude/rules`, Cursor gets `.cursor/rules`, every other agent reads `AGENTS.md`.
- **Written for the 2026 stack:** Next.js 16, React 19.2, TanStack Start, TanStack Query 5, Zustand 5, Zod 4 and Tailwind CSS 4. About 30% shorter than v1, with every example following its own rules.
- **Never overwrites your files:** Rules live in their own `virastack/` folders. `AGENTS.md` and `CLAUDE.md` only get a small managed block or import line; everything else in them stays byte for byte.
- **Smart Framework Isolation:** Detects Next.js or TanStack Start from `package.json` and installs only that framework's rules. The `i18n` rule is installed only when `next-intl` or Paraglide is in the project.
- **Safe updates:** `.virastack/ai.json` records what was installed. Re-running `init` updates untouched rules, asks before touching rules you changed, and cleans up rules a new version no longer ships.

## Quick Start

```bash
npx @virastack/ai init
```

**Starting a new project?** [ViraStack Start](https://virastack.com/start/) scaffolds Next.js or TanStack Start with these rules pre-installed.

## Supported tools

| Tool | Native rules | From the `AGENTS.md` map |
| :--- | :----------: | :----------------------: |
| Claude Code | ✅ `.claude/rules/virastack/` | ✅ |
| Cursor | ✅ `.cursor/rules/virastack/` | ✅ |
| Codex | | ✅ |
| GitHub Copilot | | ✅ |
| Gemini CLI | | ✅ (one setting, below) |
| Aider | | ✅ (one setting, below) |
| Other tools that read `AGENTS.md` (Windsurf, Zed, …) | | ✅ |

"From the map" means the agent reads the managed `AGENTS.md` block, which lists every rule with its file path and when to read it.

- **Gemini CLI:** add `{ "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }` to `.gemini/settings.json`.
- **Aider:** add `read: AGENTS.md` to `.aider.conf.yml`.

## What gets installed

| Path | When | Purpose |
| :--- | :--- | :------ |
| `.claude/rules/virastack/*.md` | `--agent claude` | Claude Code rules, loaded by file path |
| `CLAUDE.md` | `--agent claude` | Gets an `@AGENTS.md` import line if missing |
| `.cursor/rules/virastack/*.mdc` | `--agent cursor` | Cursor rules, loaded by file path |
| `.agents/rules/virastack/*.md` | `--agent none` | Plain Markdown rules for any agent |
| `AGENTS.md` | always | Managed `virastack-ai` block: persona, commands, rule map |
| `.virastack/ai.json` | always | Manifest of installed files. Commit it. |

Without `--agent`, both Claude Code and Cursor are installed. The choice is saved in `.virastack/ai.json` and reused on the next `init`.

## Rules

Two rules are always loaded. The others load when the agent works on matching files.

| Rule | Loaded for |
| :--- | :--------- |
| `core` | Always: workflow, naming, exports, errors |
| `architecture` | Always: folder tree, feature boundaries, imports |
| `react` | `src/**/*.tsx`, hooks |
| `typescript` | `src/**/*.{ts,tsx}` |
| `ui` | `src/components/**`, feature components |
| `forms` | `*Form*.tsx`, `schemas/` |
| `api` | `src/lib/api.ts`, feature `api/` |
| `server-state` | feature `api/` and `hooks/`, `src/providers/`, `src/lib/query-client.ts` |
| `client-state` | `stores/` |
| `i18n` | `messages/`, `src/i18n/`, components (only with `next-intl` or Paraglide) |
| `performance` | routes and components |
| `testing` | `*.test.{ts,tsx}`, `src/test/` |
| `nextjs` | `src/app/**`, `src/proxy.ts`, `next.config.ts` (Next.js only) |
| `tanstack-start` | `src/routes/**`, `src/router.tsx`, `src/start.ts` (TanStack Start only) |

Commands in the rules (`lint`, `typecheck`, `test`, `shadcn add`) use the package manager detected from your lockfile.

## Commands

| Command | Description |
| :------ | :---------- |
| `init` | Install the rules, or update an existing install. |
| `remove` | Remove every managed file, the `AGENTS.md` block and the `CLAUDE.md` import. Files you changed are kept unless you confirm or pass `--force`. |

## Options

| Flag | Description |
| :--- | :---------- |
| `--agent <list>` | `claude`, `cursor` (comma separated) or `none`. Default: `claude,cursor`. |
| `--framework <name>` | `nextjs` or `tanstack`. Overrides detection. |
| `--force`, `-f` | Also overwrite (or, with `remove`, delete) managed files you changed. Content outside the `AGENTS.md` block is never touched. |
| `--dry-run` | Print the plan without writing anything. |
| `--yes`, `-y` | Answer every question with its default (never overwrite). |
| `--tr` | Turkish output. |
| `--help`, `-h` | Show help. |
| `--version`, `-v` | Show the version. |

In CI or any non-interactive shell, changed files are skipped with a warning instead of a question.

## Upgrading from v1

Run `npx @virastack/ai@latest init` in the project. Rule files and `docs/` written by v1.x are removed if you never edited them. Edited ones are kept and listed so you can delete them yourself.

## Ecosystem

Part of the [ViraStack](https://virastack.com) ecosystem: [Academy](https://github.com/virastack/academy) · [Start](https://github.com/virastack/start) · [Mask](https://github.com/virastack/form/tree/main/packages/mask) · [Password](https://github.com/virastack/form/tree/main/packages/password) · [Address](https://github.com/virastack/form/tree/main/packages/address) · [Guide](https://github.com/virastack/guide)

## License

[MIT](LICENSE) © [Ömer Gülçiçek](https://omergulcicek.com)
