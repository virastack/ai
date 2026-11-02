---
description: "USE WHEN: Improving Core Web Vitals (LCP, INP, CLS): images, fonts, scripts, bundle size."
paths:
  - "src/app/**/*.tsx"
  - "src/routes/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/features/**/components/**/*.tsx"
---

# Performance

Budgets at the 75th percentile on mobile: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**.

## Rules

- Measure first (Lighthouse, DevTools, React Profiler). Lighthouse cannot measure INP, so test interactions in DevTools. Keep a change only if it measurably helps.
- LCP: load the hero image eagerly with high fetch priority. Never lazy-load it.
- CLS: images and embeds have dimensions or an aspect ratio, skeletons match the final size, web fonts use a metric-matched fallback (`next/font` adds one, or `size-adjust`) or `font-display: optional`.
- INP: keep handlers short. Slow React renders: wrap the state update in `startTransition` or use `useDeferredValue`. Heavy non-React work: split it up or move it to a web worker.
- Lazy-load heavy components below the fold and defer third-party scripts.
- Import single icons and functions, not whole libraries.
- No request waterfalls: run independent requests together, prefetch route data.
<!-- nextjs:start -->
- Use `next/image`, `next/font` and `next/script` (see `nextjs`).
<!-- nextjs:end -->

## Bans

- Render-blocking third-party scripts.
- Long lists without pagination or virtualization.

<example>
```tsx
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const RevenueChart = lazy(() =>
  import("@/features/reports/components/RevenueChart").then((mod) => ({
    default: mod.RevenueChart,
  })),
);

export function ReportsPanel() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <RevenueChart />
    </Suspense>
  );
}
```
</example>
