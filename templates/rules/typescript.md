---
description: "USE WHEN: Writing TypeScript types and Zod 4 schemas: strict mode, unions, inference."
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# TypeScript and Zod

## Rules

- `strict` and `noUncheckedIndexedAccess` are on: handle `undefined` from index access, do not assert it away.
- Zod first for outside data (API, forms, search params, env): write the schema, derive the type with `z.infer`.
- Zod 4 APIs: `z.email()`, `z.url()`, `z.uuid()`, `z.iso.datetime()` instead of `z.string().email()` and similar; `z.strictObject()` and `z.looseObject()` instead of `.strict()` and `.passthrough()`; `z.flattenError()` or `z.treeifyError()` instead of `.flatten()`. Custom messages are a string or `{ error }`.
- `type` by default (team convention). `interface` for declaration merging or for composing object types with `extends`.
- `satisfies` checks a value against a type without changing its inferred type. Add `as const` to keep literals.
- Model variants as discriminated unions.
- `as const` objects or `z.enum` instead of `enum`.
- Derive variants from schemas with `.pick()`, `.omit()` and `.extend()`, not nested utility types.

## Bans

- `any`. Use `unknown` and narrow it.
- `as` casts outside tests and low-level wrappers in `src/lib/`. Parse with Zod instead. `as const` is fine.
- Non-null assertions (`!`).

<example>
```ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.enum(["admin", "member"]),
});

export type User = z.infer<typeof userSchema>;

export type SaveState =
  { status: "idle" } | { status: "saved"; savedAt: Date } | { status: "failed"; reason: string };

export const roleLabels = {
  admin: "Admin",
  member: "Member",
} as const satisfies Record<User["role"], string>;
```
</example>

<incorrect-example>
```ts
interface IUser {
  id: any;
}
const schema = z.object({ email: z.string().email() });
const user = data as IUser;
```
</incorrect-example>
