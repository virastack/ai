import path from "node:path";
import { FRAMEWORKS } from "./args.js";
import { exists, readText } from "./fs.js";

const I18N_PACKAGES = ["next-intl", "@inlang/paraglide-js"];
const TANSTACK_PACKAGES = ["@tanstack/react-start", "@tanstack/start"];

const LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const YARN_CLASSIC_LOCK = "# yarn lockfile v1";

const COMMANDS = {
  pnpm: {
    install: "pnpm install",
    dev: "pnpm dev",
    testFile: "pnpm vitest run",
    validate: "pnpm lint && pnpm typecheck",
    test: "pnpm test",
    build: "pnpm build",
    exec: "pnpm dlx",
  },
  npm: {
    install: "npm install",
    dev: "npm run dev",
    testFile: "npx vitest run",
    validate: "npm run lint && npm run typecheck",
    test: "npm test",
    build: "npm run build",
    exec: "npx",
  },
  yarn: {
    install: "yarn install",
    dev: "yarn dev",
    testFile: "yarn vitest run",
    validate: "yarn lint && yarn typecheck",
    test: "yarn test",
    build: "yarn build",
    exec: "yarn dlx",
  },
  // Yarn 1 has no `dlx`.
  "yarn-classic": {
    install: "yarn install",
    dev: "yarn dev",
    testFile: "yarn vitest run",
    validate: "yarn lint && yarn typecheck",
    test: "yarn test",
    build: "yarn build",
    exec: "npx",
  },
  bun: {
    install: "bun install",
    dev: "bun run dev",
    testFile: "bunx vitest run",
    validate: "bun run lint && bun run typecheck",
    test: "bun run test",
    build: "bun run build",
    exec: "bunx",
  },
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

export function detectVitest(pkg) {
  return Boolean(dependencies(pkg).vitest);
}

export function detectI18n(pkg) {
  const deps = dependencies(pkg);
  return I18N_PACKAGES.some((name) => deps[name]);
}

/** `dir`, then its parents up to the repository root. Outside a repository, only `dir`. */
async function lockfileFolders(dir) {
  const start = path.resolve(dir);
  const folders = [];
  let current = start;
  while (true) {
    folders.push(current);
    if (await exists(path.join(current, ".git"))) return folders;
    const parent = path.dirname(current);
    if (parent === current) return [start];
    current = parent;
  }
}

export async function detectPackageManager(dir, pkg) {
  const [declared, declaredVersion] = typeof pkg?.packageManager === "string" ? pkg.packageManager.split("@") : [];
  if (declared === "yarn" && declaredVersion?.startsWith("1.")) return "yarn-classic";
  if (declared && COMMANDS[declared]) return declared;

  for (const folder of await lockfileFolders(dir)) {
    for (const [file, manager] of LOCKFILES) {
      const lockfile = path.join(folder, file);
      if (!(await exists(lockfile))) continue;
      if (manager === "yarn" && (await readText(lockfile))?.includes(YARN_CLASSIC_LOCK)) return "yarn-classic";
      return manager;
    }
  }
  return "npm";
}

export function packageManagerCommands(manager) {
  return COMMANDS[manager] ?? COMMANDS.npm;
}
