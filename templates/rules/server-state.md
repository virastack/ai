---
description: "USE WHEN: Fetching and caching server data with TanStack Query 5: queryOptions, hooks, mutations, invalidation."
paths:
  - "src/features/**/api/**/*.ts"
  - "src/features/**/hooks/**/*.ts"
  - "src/hooks/**/*.ts"
  - "src/lib/query-client.ts"
  - "src/providers/**/*.ts"
  - "src/providers/**/*.tsx"
---

# TanStack Query

## Setup

<!-- nextjs:start -->
- `QueryProvider` (`src/providers/QueryProvider.tsx`) creates the browser `QueryClient` once.
<!-- nextjs:end -->
<!-- tanstack:start -->
- The router context owns the `QueryClient` (`src/providers/root-provider.ts`, wired in `src/router.tsx`).
<!-- tanstack:end -->
- Defaults, including retries, live in `makeQueryClient()` (`src/lib/query-client.ts`). Never share a `QueryClient` across server requests.

## Rules

- Key factory per feature in `api/query-keys.ts` (`all`, `lists()`, `list(filters)`, `details()`, `detail(id)`, `as const`). Page and filters belong in the key.
- Define each query once with `queryOptions()` in `api/`; reuse it in hooks, prefetching, loaders and `setQueryData`.
- Components call a thin hook from `hooks/` (`useUsers`), never `useQuery` or `useSuspenseQuery` directly.
<!-- tanstack:start -->
- Route data loaded in a `loader`: the hook wraps `useSuspenseQuery`. Use `useQuery` only for data the first render does not need, or when the page keeps old data on screen while new data loads.
<!-- tanstack:end -->
- Pass the query function's `signal` to the api function.
- Mutation hooks invalidate the affected keys in `onSettled`.
- Optimistic updates only when the UX needs them: render `mutation.variables` while pending; use `onMutate` with rollback only when several components must show the change.
- Server data stays in the Query cache. Never copy it into a Zustand store.

<example>
```ts
// features/users/api/user.queries.ts
import { queryOptions } from "@tanstack/react-query";

import { getUsers } from "@/features/users/api/get-users.api";
import { userKeys } from "@/features/users/api/query-keys";

export const usersQueryOptions = (page: number) =>
  queryOptions({
    queryKey: userKeys.list({ page }),
    queryFn: ({ signal }) => getUsers(page, signal),
  });
```

```ts
// features/users/hooks/use-users.ts
import { useQuery } from "@tanstack/react-query";

import { usersQueryOptions } from "@/features/users/api/user.queries";

export function useUsers(page: number) {
  return useQuery(usersQueryOptions(page));
}
```
</example>
