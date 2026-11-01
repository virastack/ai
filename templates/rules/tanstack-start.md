---
description: "USE WHEN: Working on TanStack Start routes, loaders, server functions, middleware and head/SEO."
paths:
  - "src/routes/**/*.ts"
  - "src/routes/**/*.tsx"
  - "src/router.tsx"
  - "src/start.ts"
  - "src/features/**/api/**/*.ts"
---

# TanStack Start

## Routes

- `createFileRoute` with a path that matches the file. Never edit the generated `src/routeTree.gen.ts`.
- Parent routes render `<Outlet />`.
- Validate search params with `validateSearch` and a Zod schema. Route data that depends on them goes through `loaderDeps`. Use `.default().catch()` so `Link` needs no `search` and a bad URL falls back; `stripSearchParams` keeps defaults out of the URL. The router parses `?q=123` as a number, so a text param accepts numbers too.
- `beforeLoad` handles auth redirects for page UX only. It does not protect data: enforce auth in every server function and server route that reads or writes private data.
- `pendingComponent`, `errorComponent` and `notFoundComponent` where a route can wait, fail or miss. Metadata in `head()`.
- Navigate with typed `Link` and `useNavigate`, never string-built URLs.

## Data

- Load route data with `context.queryClient.query({ ...options, staleTime: "static" })` in `loader`, read it with the feature's query hook. If the page shows its own error state, end the prefetch with `.catch(noop)`. To keep the current rows on screen during client navigation, await it only on the server (`if (import.meta.env.SSR) await prefetch`). `@tanstack/react-router-ssr-query` handles hydration; no `HydrationBoundary`.
- Loaders and `beforeLoad` run on server and client: no secrets or database calls there, call a server function.

## Server functions

- `createServerFn` from `@tanstack/react-start`, exported from the feature's `api/` folder, never defined in components or routes.
- Validate input with `.validator(zodSchema)`, not `.inputValidator()`.
- Functions that change state use `{ method: "POST" }`.
- Check auth in `createMiddleware` or at the top of the handler.
- In code consumed by Query or Router, throw on failure: `redirect()`, `notFound()` or an error with a safe message, because thrown messages reach the client. A resolved `{ data, error }` counts as success there.
- Secrets stay in server code; `VITE_` env vars are public.
- `src/start.ts` must keep `createCsrfMiddleware`: defining this file turns off the automatic one. Non-GET server routes need their own same-origin check.
<!-- i18n:start -->

## i18n

- Paraglide JS (`@inlang/paraglide-js`): locale routes under `src/routes/$lang`, so paths start with `/$lang`. See the `i18n` rule.
<!-- i18n:end -->

## Bans

- Route data fetched in a component (`useEffect`, or `useQuery` without a loader prefetch).
- Next.js APIs: `"use server"`, `next/*` imports, `page.tsx` files.

<example>
```tsx
// src/routes/users/$userId.tsx
import { createFileRoute } from "@tanstack/react-router";

import { userQueryOptions } from "@/features/users/api/user.queries";
import { UserProfile } from "@/features/users/components/UserProfile";

export const Route = createFileRoute("/users/$userId")({
  loader: ({ context, params }) =>
    context.queryClient.query({ ...userQueryOptions(params.userId), staleTime: "static" }),
  component: UserPage,
});

function UserPage() {
  const { userId } = Route.useParams();
  return <UserProfile id={userId} />;
}
```
</example>

<incorrect-example>
```tsx
const { data } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard }); // no loader prefetch
```
</incorrect-example>
