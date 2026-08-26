import { type Middleware, type UnknownAction } from "@reduxjs/toolkit";
import { pending, fulfilled, rejected } from "./loadingSlice";

/**
 * Tracks in-flight RTK Query requests so the global loader knows when the app is busy.
 *
 * ⚠ **The dispatch must come *after* `next(action)`, and the ordering is load-bearing.** It used to
 * come first, and that is a re-entrant dispatch: `api.dispatch(...)` runs the whole reducer chain and
 * notifies every subscriber *before* the action currently in flight has been reduced. Subscribers
 * therefore re-render reading state one action out of date — for `api/executeQuery/fulfilled` that
 * means the query still reads `pending`, with `data: undefined`, and `useSyncExternalStore` caches
 * that stale snapshot.
 *
 * It self-corrected almost everywhere, which is why it survived so long: any *later* dispatch
 * notifies again and every component catches up. The query that settles **last** on a page has
 * nothing after it, so it stays pending forever. Diagnosed 2026-08-18 on the CNPN page, where the
 * effectivity table rendered « 0 règle(s) » and a permanent "Actualisation…" while the store held the
 * same query as `fulfilled` with three rows and one subscriber attached — see `SMOKE-TEST.md` §20f.
 *
 * Forwarding first keeps the store consistent: by the time anything is notified, the action that
 * caused the notification has been applied.
 */
export const loadingMiddleware: Middleware =
  (api) => (next) => (action) => {
    const result = next(action);

    const type = (action as UnknownAction)?.type;
    if (typeof type === "string" && type.startsWith("api/")) {
      if (type.endsWith("/pending")) {
        api.dispatch(pending());
      } else if (type.endsWith("/fulfilled")) {
        api.dispatch(fulfilled());
      } else if (type.endsWith("/rejected")) {
        api.dispatch(rejected());
      }
    }

    return result;
  };
