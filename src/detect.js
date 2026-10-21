import path from "node:path";
import { FRAMEWORKS } from "./args.js";
import { exists, readText } from "./fs.js";

const I18N_PACKAGES = ["next-intl", "@inlang/paraglide-js"];
const TANSTACK_PACKAGES = ["@tanstack/react-start", "@tanstack/start", "@tanstack/react-router"];

const LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const COMMANDS = {
  pnpm: { dev: "pnpm install && pnpm dev", validate: "pnpm lint && pnpm typecheck", build: "pnpm build" },
  npm: { dev: "npm install && npm run dev", validate: "npm run lint && npm run typecheck", build: "npm run build" },
  yarn: { dev: "yarn install && yarn dev", validate: "yarn lint && yarn typecheck", build: "yarn build" },
  bun: { dev: "bun install && bun run dev", validate: "bun run lint && bun run typecheck", build: "bun run build" },
};

export async function readPackageJson(dir) {
  const text = await readText(path.join(dir, "package.json"));
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function dependencies(pkg) {
  return { ...pkg?.dependencies, ...pkg?.devDependencies };
}

export function detectFramework(pkg) {
  const template = pkg?.virastack?.template;
  if (FRAMEWORKS.includes(template)) return template;

  const deps = dependencies(pkg);
  if (deps.next) return "nextjs";
  if (TANSTACK_PACKAGES.some((name) => deps[name])) return "tanstack";
  return null;
}

export function detectI18n(pkg) {
  const deps = dependencies(pkg);
  return I18N_PACKAGES.some((name) => deps[name]);
}

export async function detectPackageManager(dir, pkg) {
  const declared = typeof pkg?.packageManager === "string" ? pkg.packageManager.split("@")[0] : null;
  if (declared && COMMANDS[declared]) return declared;

  for (const [file, manager] of LOCKFILES) {
    if (await exists(path.join(dir, file))) return manager;
  }
  return "npm";
}

export function packageManagerCommands(manager) {
  return COMMANDS[manager] ?? COMMANDS.npm;
}
