<div align="center">

<a href="https://github.com/virastack/ai" target="_blank" rel="noreferrer">
  <img src="https://raw.githubusercontent.com/virastack/ai/main/assets/logo.png" alt="ViraStack AI" height="120" style="max-width: 100%;" />
</a>

*Agent rules for modern React in one command: Claude Code, Cursor and AGENTS.md*

[![ViraStack AI](https://img.shields.io/badge/ViraStack-AI-%23e131fa)](https://virastack.com/ai)
[![npm version](https://img.shields.io/npm/v/@virastack/ai)](https://www.npmjs.com/package/@virastack/ai)
[![npm downloads](https://img.shields.io/npm/dt/@virastack/ai)](https://www.npmjs.com/package/@virastack/ai)
[![License: MIT](https://img.shields.io/github/license/virastack/ai)](https://github.com/virastack/ai/blob/main/LICENSE)
[![@virastack](https://img.shields.io/badge/-%40virastack-555?logo=x&logoColor=white)](https://x.com/virastack)

</div>

---

### [See how it works →](https://virastack.com/ai/)

## Features

- **Claude Code and Cursor, one command:** Writes the same rules in each tool's native format. Claude Code gets `.claude/rules`, Cursor gets `.cursor/rules`, every other agent reads `AGENTS.md`.
- **Written for the 2026 stack:** Next.js 16, React 19, TanStack Start, TanStack Query 5, Zustand 5, Zod 4 and Tailwind CSS 4. API rules are checked against each library's current docs, and every example is built in fresh projects.
- **Never overwrites your files:** Rules live in their own `virastack/` folders. `AGENTS.md` and `CLAUDE.md` only get a small managed block or import line; everything else in them stays byte for byte. Unbalanced markers stop the run and leave the file untouched.
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
| `AGENTS.md` | always | Managed `virastack-ai` block: commands, precedence, rule map |
| `.virastack/ai.json` | always | Manifest of installed files. Commit it. |

Without `--agent`, both Claude Code and Cursor are installed. The choice is saved in `.virastack/ai.json` and reused on the next `init`.

## Rules

Two rules are always loaded. The others load when the agent works on matching files.

| Rule | Loaded for |
| :--- | :--------- |
| `core` | Always: workflow, naming, exports, errors |
| `architecture` | Always: folder tree, feature boundaries, imports |
| `typescript` | `src/**/*.{ts,tsx}` |
| `react` | `src/**/*.tsx`, hooks |
| `nextjs` | `src/app/**`, `src/proxy.ts`, `next.config.ts`, feature `actions/` (Next.js only) |
| `tanstack-start` | `src/routes/**`, `src/router.tsx`, `src/start.ts`, feature `api/` (TanStack Start only) |
| `ui` | `src/components/**`, feature components, `src/styles/` |
| `forms` | `*Form*.tsx`, `schemas/` |
| `api` | `src/lib/api.ts`, feature `api/` |
| `server-state` | feature `api/` and `hooks/`, `src/providers/`, `src/lib/query-client.ts` |
| `client-state` | `stores/` |
| `i18n` | `src/messages/`, `src/i18n/`, routes, components (only with `next-intl` or Paraglide) |
| `testing` | `*.test.{ts,tsx}`, `src/test/` |
| `performance` | routes and components |

Commands in the rules (`lint`, `typecheck`, `test`, `shadcn add`) use the package manager detected from your lockfile. The rules assume your project has `lint`, `typecheck` and `test` scripts.

If Prettier formats the files ViraStack AI writes, it reads the rules as edited and stops updating them, and every `init` rewrites `AGENTS.md` again. Add these to `.prettierignore`:

```text
.claude/rules/virastack/
.cursor/rules/virastack/
.agents/rules/virastack/
.virastack/
AGENTS.md
CLAUDE.md
```

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

## Ecosystem

Part of the [ViraStack](https://virastack.com) ecosystem: [Academy](https://github.com/virastack/academy) · [Start](https://github.com/virastack/start) · [Mask](https://github.com/virastack/form/tree/main/packages/mask) · [Password](https://github.com/virastack/form/tree/main/packages/password) · [Address](https://github.com/virastack/form/tree/main/packages/address) · [Guide](https://virastack.com/guide)

## License

[MIT](LICENSE) © [Ömer Gülçiçek](https://omergulcicek.com)
