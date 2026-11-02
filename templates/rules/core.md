---
description: "USE WHEN: Always. Working agreement, naming, exports and error handling for every task."
---

# Core

## Workflow

- Read the files you will change and their neighbors first; follow their patterns.
- Change only what the task needs. No drive-by refactors.
- Ask before adding a dependency, changing a public API (exports, props, routes, schemas), or changing boundaries, routing or rendering, state or infrastructure.
- Check that a package exists on npm before proposing it; a name from memory counts as unverified.
- If a path or API is unknown, look it up in the repo and installed docs; if it is still unknown, say so.
- Before you finish, run `{{VALIDATE_COMMAND}}` and `{{TEST_COMMAND}}` and fix what you broke.

## Naming and exports

- Code, types and identifiers are in English.
- Files and folders: `kebab-case` (`query-client.ts`). Components: `PascalCase.tsx` (`UserList.tsx`). UI primitives: `button.tsx`. Hooks: `use-users.ts` exports `useUsers`.
- Suffixes: `*.api.ts`, `*.action.ts`, `*.queries.ts`, `*.schema.ts`, `*.store.ts`, `*.types.ts`, `*.constants.ts`, `*.test.ts(x)`.
- Types: `User`, never `IUser`, `TUser` or `UserType`.
- Named exports only; default exports only where a framework requires them. No barrel files in application code: import from the defining file.

## Errors

- Never swallow an error. A `catch` rethrows with `{ cause: error }`, returns a typed error, or reports it.
- Place Error Boundaries at route and feature boundaries, not around every component.
- Never log secrets or `.env` values.

## Comments and cleanup

- Comment why, never what. JSDoc for exports whose behavior the signature does not show.
- Remove unused imports, `console.log` calls and dead code in what you touched.

<example>
```ts
try {
  await saveProfile(input);
} catch (error) {
  throw new ProfileSaveError("Could not save the profile", { cause: error });
}
```
</example>
