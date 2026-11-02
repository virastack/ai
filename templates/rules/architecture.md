---
description: "USE WHEN: Always. Where code lives in src/, feature boundaries and import rules."
---

# Architecture

## Folder tree

Create folders only from this tree.

```text
src/
<!-- nextjs:start -->
├── app/                 # routes only
<!-- nextjs:end -->
<!-- tanstack:start -->
├── routes/              # routes only
<!-- tanstack:end -->
├── features/<feature>/  # api, components, constants, helpers, hooks, icons,
│                        # schemas, stores, types
<!-- nextjs:start -->
│                        # actions (Server Actions)
<!-- nextjs:end -->
├── components/          # layout, shared, ui
<!-- nextjs:start -->
<!-- i18n:start -->
├── i18n/
<!-- i18n:end -->
<!-- nextjs:end -->
<!-- i18n:start -->
├── messages/            # one JSON file per locale
<!-- i18n:end -->
├── assets/  config/  constants/  helpers/  hooks/  lib/
├── providers/  schemas/  stores/  styles/  test/  types/
└── env.ts
```

## Placement

- Code starts in `features/<feature>/` and moves to the shared `src/` folders when a second feature needs it.
- A feature creates only the subfolders it needs.
- Features never import each other: share through the shared folders or compose at the route level.
- Imports flow one way: shared folders, then features, then routes. Shared folders never import features or routes.
- Route files only load data, set metadata and render feature components.
- `constants/`: static lists and config objects.
- `helpers/`: pure functions without package imports; anything importing a package goes to `lib/`.
- `lib/`: configured library instances (`api.ts`, `query-client.ts`, `utils.ts`).
- `schemas/`: Zod schemas, the single source for API functions, forms and types.
- `assets/`: files imported by code; URL-served files go to `public/`.

## Imports

- Use the `@/*` path alias; do not add others.
- Parent-relative imports (`../`) are banned; same-folder `./` is fine.
