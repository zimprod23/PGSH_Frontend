import { useCallback, useMemo } from 'react';
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
  /** Raw search text — feed this to the input, and `useDebouncedValue` to the query. */
  search: string;
  setSearch: (value: string) => void;

  filters: TFilters;
  /** Setting any filter resets to page 1 — page 3 of the old filter is rarely page 3 of the new one. */
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;

  page: number;
  setPage: (page: number) => void;

  /** True when anything is narrowing the list — for a «réinitialiser» affordance. */
  isFiltered: boolean;
  reset: () => void;
};

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

  const search = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  /**
   * Absent and default are the same thing, so a default value is removed rather than written. That
   * keeps `/admin/stages` clean until you actually narrow something, and keeps two routes that mean
   * the same thing from having two different URLs.
   */
  const patch = useCallback(
    (next: Record<string, string | null>) => {
      setParams(
        (current) => {
          const merged = new URLSearchParams(current);
          for (const [key, value] of Object.entries(next)) {
            if (value === null || value === '') merged.delete(key);
            else merged.set(key, value);
          }
          return merged;
        },
        // A filter change is not a new place — it must not stack history entries you have to press
        // back through one at a time to leave the page.
        { replace: true },
      );
    },
    [setParams],
  );

  return {
    search,
    setSearch: useCallback((value: string) => patch({ q: value, page: null }), [patch]),

    filters,
    setFilter: useCallback(
      (key, value) => patch({ [key as string]: value, page: null }),
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
