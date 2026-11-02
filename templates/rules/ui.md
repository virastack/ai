---
description: "USE WHEN: Building UI with shadcn/ui and Tailwind CSS 4: components, styling, states, accessibility."
paths:
  - "src/components/**/*.tsx"
  - "src/features/**/components/**/*.tsx"
  - "src/styles/**/*.css"
---

# UI

## Components

- `components/ui`: primitives without data or store access. `components/shared`: reused app components. `features/<feature>/components`: domain UI.
- Add primitives with `{{EXEC_COMMAND}} shadcn@latest add <component>`; do not hand-write them. Ask before using `--overwrite`.
- Find the primitive library first: `style` in `components.json` (`base-…` or `radix-…`), else `package.json` (`@base-ui/react` or `@radix-ui/*`). Never mix them.
- Base UI: `render` instead of `asChild`; `data-open:` and `data-closed:` on popups, `data-popup-open:` on triggers, no `data-[state=open]`. Links styled as buttons use `buttonVariants`, not `render` on `Button`.
- Merge classes with `cn()` from the `cn` package (`@/lib/utils` in projects without it), never template strings.
- Data-driven UI has loading (a skeleton of the final size), empty and error states.
- Prefer CSS transitions; use `motion/react` for gestures, springs, layout and exit animations. Respect reduced motion.

## Tailwind CSS 4

- Colors are semantic tokens only (`bg-background`): no hex, rgb or raw palette like `bg-blue-500`. Sizes come from the scale (`p-4`); arbitrary values only when no utility or token fits. `components/ui` is exempt.
- v4 class names: `bg-linear-to-r` instead of `bg-gradient-to-r`, `size-4` instead of `w-4 h-4`.
- Mobile first. No page-level horizontal scroll at 320 CSS px; tables, maps and code may scroll inside their own container.

## Accessibility

- Semantic HTML: `button` for actions, links for navigation. Headings form a coherent outline.
- Every control has a name: visible text, a `<label>`, or `aria-label` if nothing is visible.
- Everything works by keyboard and focus is visible. Pointer targets are at least 24 by 24 CSS px.
- Dialogs and menus use the primitive's focus handling, never a custom focus trap.
- Text contrast meets WCAG AA (4.5:1). Never show state with color alone.
- Meaningful `alt` text; `alt=""` for decorative images.

## Bans

- `onClick` on `div` or `span`.
- The generic "AI look": indigo or purple defaults, gradients everywhere, `rounded-2xl` on everything, identical card grids. Lorem ipsum.

<example>
```tsx
import { cn } from "cn";

type StatCardProps = { label: string; value: string; className?: string };

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 md:p-6", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
```
</example>
