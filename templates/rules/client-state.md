---
description: "USE WHEN: Writing Zustand 5 stores: placement, actions, server rendering and persist."
paths:
  - "src/stores/**/*.ts"
  - "src/features/**/stores/**/*.ts"
---

# Zustand

## Rules

- Stores live in `src/stores/` or `features/<feature>/stores/` (`cart.store.ts` exports `useCartStore`).
- Actions live in the store and only update state. Side effects such as API calls live in hooks.
- Never read `window` or `localStorage` while creating a store, except through `persist`'s `createJSONStorage(() => localStorage)`.
- Request or user data: `createStore` in `useState` inside a context provider. Module-level `create()` only for client-only UI state (project decision). Server Components never read or write a store.
- `persist`: show persisted values only on the client, gated with `useIsClient()` (`usehooks-ts`) or `skipHydration: true` plus `persist.rehydrate()`.

## Bans

- Keystroke-frequency values in a store.

<example>
```ts
import { create } from "zustand";

import type { CartItem } from "@/features/cart/types/cart.types";

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  clear: () => void;
};

// Client-only UI state, so a module-level store is fine.
export const useCartStore = create<CartState>()((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
  clear: () => set({ items: [] }),
}));
```
</example>
