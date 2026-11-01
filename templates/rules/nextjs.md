---
description: "USE WHEN: Working on Next.js 16 App Router routes, layouts, Server Components, Server Actions, caching and proxy.ts."
paths:
  - "src/app/**/*.ts"
  - "src/app/**/*.tsx"
  - "src/proxy.ts"
  - "next.config.ts"
  - "src/features/**/actions/**/*.ts"
---

# Next.js 16

Check unfamiliar APIs in `node_modules/next/dist/docs/`.

## Rendering

- `src/app` files are Server Components by default; `error.tsx` and `global-error.tsx` must be Client Components. `"use client"` only on leaf components that need state, effects, events or browser APIs, never on `page.tsx` or `layout.tsx`.
- `params`, `searchParams`, `cookies()` and `headers()` are async: `const { id } = await params`. Type pages with the generated `PageProps<"/route">`.
- With `cacheComponents` (on in new `create-next-app` projects), read `params`, `searchParams`, `cookies()` and `headers()` under `<Suspense>`; otherwise the build fails.
- Stream with `loading.tsx` and `<Suspense>`; add `error.tsx` and `not-found.tsx` where a segment can fail or miss. In `error.tsx`, use `retry()` rather than `reset()`.
- Metadata via `metadata` or `generateMetadata`, never manual `<head>` tags.
- `next/dynamic` with `{ ssr: false }` works only inside Client Components.

## Data and caching

- Prefetch TanStack Query on the server and hand off with `HydrationBoundary`; clients read it with the feature's query hook. Patterns, including Cache Components: `node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`.
- `"use cache"` (`cacheLife`, `cacheTag`) only with `cacheComponents: true` in `next.config.ts`. Cached scopes cannot read `cookies()`, `headers()` or `searchParams`: read them outside and pass the value in.
- After a write: `updateTag(tag)` inside a Server Action for read-your-writes; `revalidateTag(tag, "max")` for stale-while-revalidate.
- Pass only serializable, non-sensitive data to Client Components. Import `server-only` in server-only modules (Next.js resolves it, so no install is needed).

## Server Actions

- One file per action in `features/<feature>/actions/` (`create-project.action.ts`), `"use server"` at the top. Never inline.
- Every action is a public POST endpoint. Authenticate, validate with the feature's Zod schema and use only the parsed data, authorize the specific record, then call the api layer (no direct database access). Return `{ data, error }` with only the fields the UI needs, never raw errors.
- Use actions for mutations. They run one at a time per client, so read data in Server Components or Route Handlers.

## proxy.ts

- `src/proxy.ts` replaces `middleware.ts`. Only optimistic cookie checks, redirects, rewrites, headers and locale; no slow data fetching. Set a matcher that excludes static assets. Enforce auth next to the data, not only here.

## Assets

- `next/image`, `next/font` and `next/script`. LCP image: `loading="eager"` with `fetchPriority="high"`; never the deprecated `priority`.
<!-- i18n:start -->

## i18n

- `next-intl`: routes live under `src/app/[locale]`, config in `src/i18n/`. See the `i18n` rule.
<!-- i18n:end -->

<example>
```tsx
import { Suspense } from "react";

import { dehydrate, HydrationBoundary, noop } from "@tanstack/react-query";

import { makeQueryClient } from "@/lib/query-client";

import { userQueryOptions } from "@/features/users/api/user.queries";
import { UserProfile } from "@/features/users/components/UserProfile";

export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <Suspense>
      <User params={params} />
    </Suspense>
  );
}

async function User({ params }: Pick<PageProps<"/users/[id]">, "params">) {
  const { id } = await params;
  const queryClient = makeQueryClient();
  await queryClient.query(userQueryOptions(id)).catch(noop);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserProfile id={id} />
    </HydrationBoundary>
  );
}
```
</example>

<incorrect-example>
```tsx
"use client";

export default function Page() {
  useEffect(() => {
    fetch("/api/user").then(setUser);
  }, []);
}
```
</incorrect-example>
