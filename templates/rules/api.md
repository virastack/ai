---
description: "USE WHEN: Writing HTTP calls with the native fetch wrapper in src/lib/api.ts: endpoints, Zod parsing, ApiError."
paths:
  - "src/lib/api.ts"
  - "src/features/**/api/**/*.ts"
---

# API layer

## Rules

- Every HTTP call lives in `features/<feature>/api/` as `verb-entity.api.ts` (`get-users.api.ts` exports `getUsers`).
- Use the shared client in `src/lib/api.ts`; auth headers go in its `getHeaders`, which never reach absolute URLs. Retries belong to TanStack Query, not the client.
- Accept an `AbortSignal` and pass it to the client.
- Pass the feature's Zod schema as `schema`, so every response is parsed before it leaves `api/`. Return typed data, never a `Response`.
- Rethrow `AbortError` untouched. HTTP, network, timeout and schema failures become `ApiError` with a `kind`. Never pass stack traces to the UI.
- List endpoints are paginated or limited.
- Pass query values as `params`, never by concatenating user input.
- Code that runs on the server needs absolute URLs: a relative URL throws there.
- Server code never takes a full URL from input: allow-list the host and build the URL yourself.

## Bans

- `fetch` or `axios` in components, hooks or stores.

<example>
```ts
import { api } from "@/lib/api";

import { userSchema } from "@/features/users/schemas/user.schema";
import type { User } from "@/features/users/schemas/user.schema";

export function getUsers(page: number, signal?: AbortSignal): Promise<User[]> {
  return api.get("/users", { params: { page, limit: 20 }, schema: userSchema.array(), signal });
}
```
</example>
