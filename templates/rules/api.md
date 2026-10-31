---
description: "USE WHEN: Writing HTTP calls with the native fetch wrapper in src/lib/api.ts: endpoints, Zod parsing, ApiError."
paths:
  - "src/lib/api.ts"
  - "src/features/**/api/**/*.ts"
---

# API layer

## Rules

- Every HTTP call lives in `features/<feature>/api/` as `verb-entity.api.ts` (`get-users.api.ts` exports `getUsers`).
- Use the shared client in `src/lib/api.ts` (headers, auth, parsing). Retries belong to TanStack Query, not the client.
- Accept an `AbortSignal` and pass it to the client.
- Parse every response with the feature's Zod schema before it leaves `api/`. Return typed data, never a `Response`.
- Rethrow `AbortError` untouched. Network and schema failures become `ApiError`. Never pass stack traces to the UI.
- List endpoints are paginated or limited.
- Build query strings with `URLSearchParams`, never by concatenating user input.
- Code that runs on the server needs absolute URLs: a relative URL throws there.
- Server code never takes a full URL from input: allow-list the host and build the URL yourself.

## Bans

- `fetch` or `axios` in components, hooks or stores.

<example>
```ts
import { api, ApiError } from "@/lib/api";

import { userSchema } from "@/features/users/schemas/user.schema";
import type { User } from "@/features/users/schemas/user.schema";

const USERS_URL = "https://api.example.com/users";

export async function getUsers(page: number, signal?: AbortSignal): Promise<User[]> {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  const data = await api.get<unknown>(`${USERS_URL}?${params}`, { signal });
  const result = userSchema.array().safeParse(data);

  if (!result.success) {
    throw new ApiError("Unexpected users response", 502, result.error.issues);
  }
  return result.data;
}
```
</example>
