/**
 * Rule catalog in map order. `when` limits a rule to projects that need it;
 * every other rule is installed in every project.
 */
export const RULES = [
  { name: "core" },
  { name: "architecture" },
  { name: "typescript" },
  { name: "react" },
  { name: "nextjs", when: (ctx) => ctx.framework === "nextjs" },
  { name: "tanstack-start", when: (ctx) => ctx.framework === "tanstack" },
  { name: "ui" },
  { name: "forms" },
  { name: "api" },
  { name: "server-state" },
  { name: "client-state" },
  { name: "i18n", when: (ctx) => ctx.i18n },
  { name: "testing" },
  { name: "performance" },
];

export function selectRules(ctx) {
  return RULES.filter((rule) => !rule.when || rule.when(ctx));
}
