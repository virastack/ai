---
description: "USE WHEN: Writing React 19 components and hooks: state, effects, composition, React Compiler."
paths:
  - "src/**/*.tsx"
  - "src/hooks/**/*.ts"
  - "src/features/**/hooks/**/*.ts"
---

# React 19

## Rules

- One exported component per file; private helpers may stay beside it. `components/ui` is exempt.
- Compose with `children` and slots instead of drilling props past two levels.
- Derive values during render. Never mirror props or other state into state.
- Business logic goes into hooks; components render.
- List keys are stable ids, never the index.
- `useEffect` only syncs with external systems (subscriptions, DOM APIs). Handle user actions in event handlers.
- Reset state with `key`, not an Effect. For Effect-only events use `useEffectEvent`, never to skip dependencies.
- When React Compiler is enabled: do not add `useMemo`, `useCallback` or `memo` for speed; use them only for precise control, such as a stable Effect dependency. Without it: only for a measured problem. Do not remove existing memoization in passing.

## State

- Server data: TanStack Query (`server-state`). Form input: React Hook Form (`forms`).
<!-- nextjs:start -->
- Filters, page, sort and tabs: URL search params with `nuqs`. Parsers live in the feature's `schemas/`, shared by the server loader and the client hook.
<!-- nextjs:end -->
<!-- tanstack:start -->
- Filters, page, sort and tabs: URL search params with `validateSearch`, `Route.useSearch()` and `navigate({ search })`.
<!-- tanstack:end -->
- One component's UI state: `useState`. Client state shared across the app: Zustand (`client-state`).
- Zustand: read one value per selector, never call a store hook without one. A selector that builds a new object or array needs `useShallow` from `zustand/react/shallow`; without it React throws.

## React 19 APIs

- `ref` is a regular prop. Do not use `forwardRef` in new code.
- `use()` reads a promise or context.
- Actions: `useActionState`, `useFormStatus` and `useOptimistic` (TanStack Query mutations: see `server-state`).

## Bans

- Fetching data with `useEffect` in a Client Component. Use query hooks or server loading (async Server Components may `await`).
- Silencing `react-hooks/*` rules.

<example>
```tsx
import type { Task } from "@/features/tasks/types/task.types";

type TaskListProps = { tasks: Task[]; showDone: boolean };

export function TaskList({ tasks, showDone }: TaskListProps) {
  const visible = showDone ? tasks : tasks.filter((task) => !task.done);

  return (
    <ul>
      {visible.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```
</example>

<incorrect-example>
```tsx
const [visible, setVisible] = useState(tasks);

useEffect(() => {
  setVisible(showDone ? tasks : tasks.filter((task) => !task.done));
}, [tasks, showDone]);
```
</incorrect-example>
