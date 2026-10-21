---
name: virastack-create-feature
description: "USE WHEN: Creating a new feature module under src/features/ that follows the ViraStack architecture."
---

# Create a feature

The `architecture` rule decides where everything goes. This skill only orders the steps.

1. Get the feature name from the request, or ask for it. Use kebab-case (`order-history`).
2. Stop and report if `src/features/<name>/` already exists.
3. Create only the folders the feature needs now, from the `architecture` tree. Each folder gets an `index.ts` that re-exports its public files.
4. Typical first files, each following its rule:
   - `schemas/<entity>.schema.ts`: Zod schema and inferred type (`typescript`).
   - `api/get-<entities>.api.ts` and `api/query-keys.ts` (`api`, `server-state`).
   - `hooks/use-<entities>.ts` (`server-state`).
   - `components/<Name>.tsx` (`ui`, `react`).
5. Create `src/features/<name>/index.ts` and export only what other layers use.
6. Connect the feature to a route only when asked (`{{FRAMEWORK_RULE}}`).
7. Add tests next to the logic you wrote (`testing`).
8. Run `{{VALIDATE_COMMAND}}` and `{{TEST_COMMAND}}`. Fix every error before you finish.
