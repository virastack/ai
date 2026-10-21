# Changelog

## [v2.0.0] - Unreleased

### Breaking
- **New file layout:** Rules install to `.claude/rules/virastack/` (Claude Code) and `.cursor/rules/virastack/` (Cursor), or `.agents/rules/virastack/` with `--agent none`. v1's `.cursor/rules/*.mdc`, `docs/MEMORIES.md` and `docs/architecture-guide.md` are no longer written.
- **Renamed rules:** `core-principles` → `core`, `react-best-practices` → `react`, `ui-components` → `ui`, `tanstack-query` → `server-state`, `state-management` → `client-state`. `docs/architecture-guide.md` became the always-loaded `architecture` rule.
- **`AGENTS.md` is no longer replaced.** ViraStack writes only its `virastack-ai` block; your content and the Next.js block stay untouched.
- **`ApiError`** follows ViraStack Start's `src/lib/api.ts` (`message`, `status`, `data`).

### Added
- **`--agent claude,cursor|none`**, `remove`, `--dry-run`, `--yes` and `--framework`.
- **Manifest** `.virastack/ai.json` with file hashes: re-running `init` updates untouched rules, asks before overwriting edited ones, and removes rules a new version drops.
- **Automatic v1 migration:** unedited v1 files are removed, edited ones are kept and listed.
- **Skills:** `virastack-create-feature` in `.agents/skills/` (and `.claude/skills/` for Claude Code).
- **Package manager aware:** commands in the rules use the detected package manager.
- **Conditional content:** the `i18n` rule installs only with `next-intl` or Paraglide; framework-specific lines appear only for the detected framework.

### Changed
- **All 14 rules rewritten** for Next.js 16, React 19.2, TanStack Start, TanStack Query 5, Zustand 5, Zod 4 and Tailwind CSS 4. Rule text is about 30% smaller than v1, with one example per rule that follows its own rules.
- **Next.js 16:** async `params`, `proxy.ts`, `"use cache"` with `cacheComponents`, `preload` instead of `priority`, `ssr: false` only in Client Components.
- **TanStack Start:** `@tanstack/react-start` imports, `ensureQueryData` + `useSuspenseQuery` with the SSR Query integration, no `tsr watch`.
- **TanStack Query:** one `queryOptions` factory per query, thin hooks, optimistic updates only when needed (v5 `variables` first).
- **Zustand:** `useShallow`, per-request stores for SSR, `useIsClient` or `skipHydration` instead of the non-existent `useHydrated`.
- **Testing** assumes Vitest, Testing Library and MSW, as shipped by ViraStack Start.
- **Performance** keeps only LCP, INP and CLS budgets; accessibility moved to `ui`.

### Removed
- Chat-era rules (`INTENTIONAL_TODO`, the blanket comment ban), the `@/data` alias and `*.data.ts` naming, TTI and API p95 budgets.

## [v1.3.2] - 2026-08-06

### Added
- **UI Delivery Checklist:** `ui-components.mdc` now requires keyboard, focus, responsive checks, states, and token checks before UI work is marked done.
- **Focus & Typography Rules:** Overlay focus management and heading hierarchy constraints in `ui-components.mdc`.

### Changed
- **Responsive QA:** Aligned viewport checks with Tailwind defaults (`320` base, `sm` 640, `md` 768, `lg` 1024, `xl` 1280) instead of framework-agnostic widths.
- **Performance Ownership:** `performance.mdc` keeps CWV/assets/CLS; defers interaction/responsive delivery checks to `ui-components.mdc`.
- **Testing Clarity:** `testing.mdc` prefers accessible RTL queries and explicitly keeps Playwright/E2E optional unless already in the project.

## [v1.3.1] - 2026-07-28

### Added
- **Enterprise Error Handling:** Updated `api.mdc` error semantics from `message, status, data` to the industry standard `code, message, details` structure to improve i18n and frontend logic routing.
- **Contract First:** Enforced "Contract First" architecture in `api.mdc`.
- **Branded Types & Discriminated Unions:** Added strict, type-safe state management and ID conventions to `typescript.mdc` to eliminate ID mix-ups and unsafe `any` usages.
- **Keep or Revert Principle:** Added a strict performance rule to `performance.mdc`: any unmeasurable AI optimization must be reverted to prevent code pollution.
- **Optimistic Updates Standard:** Added a zero-fault, standardized `onMutate`, `onError`, `onSettled` optimistic update template to `tanstack-query.mdc`.

### Changed
- **Unbounded Data Fetching:** Added strict rules against unbounded queries (N+1, lack of pagination) in `api.mdc`.

## [v1.3.0] - 2026-07-27

### Added
- **Framework Isolation**: Complete separation of Core, Next.js, and TanStack Start rules. Agents no longer see cross-framework noise.
- **Framework-Specific AGENTS.md**: `AGENTS.md` is now generated specifically for the active framework, preventing hallucination.
- **Mandatory Patterns**: Added strict, non-negotiable coding patterns to rules (e.g., `queryOptions` factory, Zod Safe Parsing, Tailwind `cn()` utility, Safe Return Pattern).
- **CLI Enhancements**: Added `--framework <name>` flag for seamless, non-interactive integration with ViraStack Start CLI.
- **Testing**: Added CLI tests via `vitest`.

### Changed
- **Folder Structure**: Templates are now organized into `core/`, `nextjs/`, and `tanstack/` directories.
- **Rule Refinement**: Rules are now shorter, stricter, and purely in English to optimize token usage and agent comprehension.
- **Performance Rules**: Extracted framework-agnostic performance rules into `core` and moved Next.js specific optimizations (`next/image`, `next/dynamic`, etc.) into `nextjs.mdc` to prevent hallucination in TanStack projects.
- **TanStack Query Rules**: Moved `tanstack-query.mdc` to `core` so both Next.js and TanStack Start projects benefit from strict query boundaries.
- **CLAUDE.md**: Simplified to `@AGENTS.md` as the single entry point for Claude Code.
- **Next.js AGENTS.md**: When the target framework is Next.js, the CLI prepends the official `<!-- BEGIN:nextjs-agent-rules -->` block so scaffolded projects keep Next.js 16 agent guidance alongside ViraStack rules.
- **Tool compatibility**: `AGENTS.md` table updated to reflect the new `CLAUDE.md` → `@AGENTS.md` flow.

## [v1.2.2] - 2026-07-24

### Changed

- **API Errors:** `api.mdc` now standardizes on `ApiError` (`message`, `status`, `data`) instead of the ambiguous `AppError` name.

## [v1.2.1] - 2026-07-24

### Changed

- **API Client SSOT:** Architecture guide and `api.mdc` now treat a native `fetch` wrapper as the ViraStack default; Axios remains optional when present in `package.json`.
- **API Examples:** Correct examples match fetch (`T`) vs axios (`{ data }`) return shapes.
- **Validation Commands:** `AGENTS.md` and `core-principles.mdc` use `pnpm typecheck` (aligned with ViraStack Start scripts).
- **Shared Layer Wording:** Clarified global `src/` folders; removed ambiguous `src/shared` guidance.
- **TanStack Query Ban Example:** Incorrect example no longer implies Axios is required.

## [v1.2.0] - 2026-07-23

### Added

- **Smart Framework Detection**: The `npx @virastack/ai init` command now automatically detects the project's framework (Next.js or TanStack Start) by reading `package.json` and skips copying irrelevant `.mdc` rule files to prevent AI hallucination.
- **Interactive Overwrite & Force Flag**: The CLI now prompts `[y/N]` before overwriting existing files, preventing accidental data loss. You can bypass prompts and overwrite all files using the `--force` or `-f` flag.
- **Turkish Language Support**: Added `--tr` flag to `@virastack/ai init` for Turkish prompts and success messages.
- **Improved UX**: Refined the success message with a modern "Tip:" format for better CLI developer experience, and added a specific informational message when all files are skipped.

## [v1.1.1] - 2026-07-22

### Added

- **CLAUDE.md**: Entry point for Claude Code — points to `AGENTS.md` and `.cursor/rules/` without duplicating content.
- **Tool compatibility table** in `AGENTS.md` for Cursor, Claude Code, and other agents.
- **Tailwind CSS v4 Standards**: Added a rule to `ui-components.mdc` to enforce Tailwind CSS v4 syntax and canonical classes (e.g., `bg-linear-to-*`, `size-*`).

## [v1.1.0] - 2026-07-22

### Added

- **Dynamic Package Checks**: Added `CRITICAL CHECK` logic to rules. AI agents will now inspect `package.json` before writing code to ensure perfect alignment with installed libraries.
- **URL State Protocol**: Added strict rules for managing URL state (pagination, filters). Enforces `nuqs` if installed, otherwise native search params.
- **HTTP Client Agnosticism**: Removed strict `axios` requirement. The API layer rule now dynamically adapts to use either a centralized `axios` instance or a native `fetch` wrapper based on project dependencies.
- **UI Primitives Agnosticism**: Removed strict `Radix UI` assumptions. The UI components rule now dynamically adapts to use `@base-ui/react`, `@radix-ui/*`, or native HTML elements based on project dependencies.
- **Strict Naming Conventions**: Added comprehensive, non-negotiable naming conventions (`kebab-case` for files, `PascalCase` for components) and import alias (`@/`) rules to `core-principles.mdc`.

## [v1.0.0] - 2026-07-22

### Initial Release

- **@virastack/ai**: AI-native architecture kit and high-discipline protocols for modern React applications is now live!
- **CLI**: `npx @virastack/ai init` command to inject specialized `.mdc` files into your `.cursor/rules` directory.
- **Protocols**: Elite engineering protocols for UI/UX, API Layer, Performance, State, and Frameworks (Next.js 16 & TanStack Start).
