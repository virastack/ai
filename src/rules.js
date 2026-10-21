/**
 * Rule catalog in map order. `when` limits a rule to projects that need it;
 * every other rule is installed in every project.
 */
export const RULES = [
  { name: "core" },
  { name: "architecture" },
  { name: "react" },
  { name: "typescript" },
  { name: "ui" },
  { name: "forms" },
  { name: "api" },
  { name: "server-state" },
  { name: "client-state" },
  { name: "i18n", when: (ctx) => ctx.i18n },
  { name: "performance" },
  { name: "testing" },
  { name: "nextjs", when: (ctx) => ctx.framework === "nextjs" },
  { name: "tanstack-start", when: (ctx) => ctx.framework === "tanstack" },
];

export const FRAMEWORK_NAMES = { nextjs: "Next.js 16", tanstack: "TanStack Start" };
export const FRAMEWORK_RULES = { nextjs: "nextjs", tanstack: "tanstack-start" };

/** Skills installed in every project, under `templates/skills/<name>/SKILL.md`. */
export const SKILLS = ["virastack-create-feature", "virastack-audit"];

export function selectRules(ctx) {
  return RULES.filter((rule) => !rule.when || rule.when(ctx));
}
