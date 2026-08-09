import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps a list page's search, filters and page number in the URL instead of in component state.
 *
 * Why it matters beyond ergonomics: RTK Query keys its cache by query arguments, so a page whose
 * filters reset to their defaults on every visit is a *different* cache key and refetches. Restoring
 * them from the URL hits the cache that is already there. It also makes back/forward behave, and the
 * view shareable — «regarde les stages de 3ème année» becomes a link.
 *
 * The academic year deliberately stays out of here: it is app-wide state driven by the navbar, and
 * duplicating it per page would let two places disagree about which year you are looking at.
 */
export type ListParams<TFilters extends Record<string, string | null>> = {
  /**
   * Raw search text — bind the input to this so typing stays instant.
   *
   * ⚠ It is deliberately local state, not read back from the URL. A text input bound directly to the
   * query string is lossy: writing the URL is a navigation, and it does not complete between
   * keystrokes, so each one re-renders from a stale value and only the last character survives —
   * typing "aabab" landed `q=b`. The URL is written from the debounced value instead.
   */
  search: string;
  setSearch: (value: string) => void;
  /** The settled value — feed *this* to the query. The hook owns the debounce. */
  debouncedSearch: string;

  filters: TFilters;
  /** Setting any filter resets to page 1 — page 3 of the old filter is rarely page 3 of the new one. */
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  /** Several filters at once. Prefer this to consecutive setFilter calls — see the note on patch. */
  setFilters: (values: Partial<TFilters>) => void;

  page: number;
  setPage: (page: number) => void;

  /** True when anything is narrowing the list — for a «réinitialiser» affordance. */
  isFiltered: boolean;
  reset: () => void;
};

/**
 * A value equal to its default is written as absent, so the URL only ever carries what actually
 * narrows the list. Without this a "all programmes" or "15 / page" choice would sit in the query
 * string meaning nothing, and two URLs would describe the same view.
 */
function forUrl(
  key: string,
  value: string | null | undefined,
  defaults: Record<string, string | null>,
): string | null {
  const next = value ?? null;
  return next === (defaults[key] ?? null) ? null : next;
}

export function useListParams<TFilters extends Record<string, string | null>>(
  defaultFilters: TFilters,
): ListParams<TFilters> {
  const [params, setParams] = useSearchParams();

  // Written on every change, so the identity has to be stable or every consumer re-renders.
  const filterKeys = useMemo(() => Object.keys(defaultFilters), [defaultFilters]);

  const filters = useMemo(
    () =>
      filterKeys.reduce((acc, key) => {
        acc[key] = params.get(key) ?? defaultFilters[key];
        return acc;
      }, {} as Record<string, string | null>) as TFilters,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, filterKeys],
  );

  const urlSearch = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  /**
   * Holds what we have asked for but not yet had rendered back to us.
   *
   * ⚠ `setSearchParams` is not a React state setter: its function form receives the params as of the
   * last *render*, not the pending value. So two calls in one tick both start from the same stale base
   * and the second silently discards the first — which is exactly how selecting a stage on the
   * Affectations page stopped working, because the handler set the stage and then cleared the status
   * filter. Composing through this ref makes consecutive calls accumulate instead of clobbering.
   */
  const pending = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [params]);

  /**
   * Absent and default are the same thing, so a default value is removed rather than written. That
   * keeps `/admin/stages` clean until you actually narrow something, and keeps two routes that mean
   * the same thing from having two different URLs.
   */
  const patch = useCallback(
    (next: Record<string, string | null>) => {
      const merged = new URLSearchParams(pending.current ?? params);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') merged.delete(key);
        else merged.set(key, value);
      }
      pending.current = merged;

      // A filter change is not a new place — it must not stack history entries you have to press
      // back through one at a time to leave the page.
      setParams(merged, { replace: true });
    },
    [params, setParams],
  );

  // Local so typing is instant and lossless; the URL is written from the settled value below.
  const [search, setSearch] = useState(urlSearch);
  const [debouncedSearch] = useDebouncedValue(search, 350);

  useEffect(() => {
    if (debouncedSearch !== urlSearch) patch({ q: debouncedSearch, page: null });
    // patch is intentionally excluded: it changes identity on every params change, which would make
    // this effect re-run and write the URL again in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // The URL moving on its own — back/forward, or a pasted link — has to reach the input.
  useEffect(() => {
    if (urlSearch !== debouncedSearch) setSearch(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  return {
    search,
    setSearch,
    debouncedSearch,

    filters,
    setFilter: useCallback(
      (key, value) => patch({ [key as string]: forUrl(key as string, value, defaultFilters), page: null }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [patch],
    ),

    setFilters: useCallback(
      (values: Partial<TFilters>) => {
        const next: Record<string, string | null> = { page: null };
        for (const [key, value] of Object.entries(values))
          next[key] = forUrl(key, value as string | null, defaultFilters);
        patch(next);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [patch],
    ),

    page,
    setPage: useCallback((next: number) => patch({ page: next <= 1 ? null : String(next) }), [patch]),

    isFiltered:
      search.trim().length > 0 ||
      filterKeys.some((key) => (params.get(key) ?? defaultFilters[key]) !== defaultFilters[key]),

    reset: useCallback(() => {
      setParams(new URLSearchParams(), { replace: true });
    }, [setParams]),
  };
}
