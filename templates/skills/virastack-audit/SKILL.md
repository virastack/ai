---
name: virastack-audit
description: "USE WHEN: Auditing the project against the ViraStack rules. Reports findings and changes no files."
---

# Audit

Read-only: never edit, create or delete files during an audit.

1. Run `{{VALIDATE_COMMAND}}` and keep its errors for the report.
2. Search `src/` for each check below.

| Check | Look for | Rule |
| :-- | :-- | :-- |
| Feature imports another feature | `@/features/<other>` inside `src/features/<name>/` | `architecture` |
| Parent-relative import | `from "../` | `architecture` |
| Folder outside the tree | `src/` folders missing from the tree | `architecture` |
| `any` | `: any`, `as any`, `<any>` | `typescript` |
| Default export | `export default` outside route and config files | `core` |
| HTTP in UI | `fetch(` or `axios` in `components/`, `hooks/`, `stores/` | `api` |
| `useQuery` in a component | `useQuery(` in `components/` | `server-state` |
<!-- nextjs:start -->
| Raw image | `<img` in `.tsx` files | `nextjs` |
<!-- nextjs:end -->

3. Report a table grouped by rule: `file:line`, the finding and a one-line fix. End with totals per rule.
4. Offer to fix the findings. Change nothing until the user agrees.
