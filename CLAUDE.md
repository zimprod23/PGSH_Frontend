# CLAUDE.md — PGSH Frontend

This file provides guidance to Claude Code when working in `PGSH.Frontend/`.

See [`DESIGN.md`](DESIGN.md) for the full design system, [`API.md`](API.md) for backend contract, [`ARCHITECTURE.md`](ARCHITECTURE.md) for structural decisions, and [`PHASES.md`](PHASES.md) for the roadmap.

Visual reference screens are in [`design_images/`](design_images/).

---

## Commands

```bash
npm run dev        # Vite dev server (port from VITE_PORT in .env)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

The full stack (including Keycloak + API) runs via Aspire from the repo root:
```bash
dotnet run --project ../PGSH.AppHost
```

---

## Stack

| Concern | Library | Version |
|---|---|---|
| UI components | Mantine | 8.3.13 |
| Icons | Tabler Icons | 3.36.1 |
| State / API cache | Redux Toolkit + RTK Query | 2.11.2 |
| Auth | @react-keycloak/web + keycloak-js | 3.4.0 / 26.2.2 |
| Routing | React Router DOM | 7.13.0 |
| i18n | react-i18next + i18next | (Phase 1) |
| Real-time | @microsoft/signalr | (Phase 4) |
| Runtime | React 19 + TypeScript 5.9 + Vite 7 |

---

## Folder Structure

```
src/
├── app/                    # Redux store, RTK Query base, middleware
│   ├── store.ts
│   ├── apiSlice.ts         # RTK Query base with auth header injection
│   ├── config.ts           # Environment config (read from import.meta.env)
│   ├── errorMiddleware.ts  # Global API error handler → toast
│   ├── loadingMiddleware.ts
│   ├── loadingSlice.ts
│   └── state/
│       └── errorSlice.ts
│
├── common/                 # Truly shared across all features
│   ├── components/
│   │   ├── AuthGuard.tsx       # Role-based route protection
│   │   ├── GlobalLoader.tsx    # Full-page loading overlay (navigation only)
│   │   ├── SkeletonCard.tsx    # Reusable skeleton for cards (Phase 1)
│   │   ├── ErrorBoundary.tsx   # Per-route error boundary (Phase 1)
│   │   └── Theme.tsx           # Mantine theme config
│   ├── hooks/
│   │   ├── useAuth.ts          # Keycloak auth hook
│   │   └── useNotify.ts        # Notification service hook (Phase 1)
│   └── types/
│       └── index.ts            # Shared TS types (ApiError, PaginatedResponse, etc.)
│
├── features/               # One folder per domain/role
│   ├── public/             # Landing page, about (unauthenticated)
│   ├── student/            # Student dashboard (Phase 1–2)
│   │   ├── api/            # RTK Query endpoints for this feature
│   │   ├── components/     # Feature-specific components
│   │   ├── hooks/          # Feature-specific hooks
│   │   ├── pages/          # Route-level page components
│   │   └── types/          # TypeScript types for student domain
│   ├── admin/              # Scolarité + Secrétaire (Phase 3)
│   ├── employee/           # Professors (Phase 3)
│   └── errors/             # Error pages (404, 403, 500, maintenance)
│
├── layouts/                # Shell wrappers per role
│   ├── StudentLayout.tsx   # Sidebar (desktop) + bottom nav (mobile)
│   ├── AdminLayout.tsx     # (Phase 3)
│   └── SimpleLayout.tsx    # Minimal wrapper for error/public pages
│
├── routes/
│   ├── index.tsx           # React Router config + lazy loading
│   └── paths.ts            # Route constant strings — never use magic strings
│
├── services/
│   ├── keycloak.ts         # Keycloak instance (singleton)
│   └── signalr.ts          # SignalR hub connections (Phase 4)
│
├── i18n/                   # Translation files (Phase 1)
│   ├── index.ts
│   ├── locales/fr/
│   ├── locales/ar/
│   └── locales/en/
│
└── main.tsx                # Entry: KeycloakProvider > ReduxProvider > RouterProvider
```

---

## Key Patterns

### Adding a new page

1. Create `src/features/<feature>/pages/MyPage.tsx`
2. Add the route in `src/routes/index.tsx` with `lazy(() => import(...))`
3. Add the path constant in `src/routes/paths.ts`
4. Add a sidebar/nav entry in the relevant Layout

### Adding a new API endpoint

1. Define the TypeScript types in `src/features/<feature>/types/`
2. Add the RTK Query endpoint in `src/features/<feature>/api/<feature>Api.ts`
3. Use the generated hook (`useGetXxxQuery`, `useCreateXxxMutation`) in your component
4. Never call `fetch` or `axios` directly — always go through RTK Query

### Showing a notification

```ts
// From a React component
const notify = useNotify();
notify.success('Inscription validée');
notify.error('Une erreur est survenue');
notify.info('Votre demande est en cours de traitement');
```

### Handling loading states

- **Page-level navigation**: `GlobalLoader` handles this automatically via the loading middleware
- **Data fetching inside a page**: use RTK Query's `isLoading` / `isFetching` with `SkeletonCard`
- Never show the global overlay for a single card reload

### Error boundaries

Every major route segment has its own `<ErrorBoundary>`. A crash in the History page does not kill the rest of the app. The root boundary handles uncaught errors with a full-page error UI.

---

## i18n Rules (Phase 1+)

- All user-visible strings must be wrapped in `t('key')` — no hardcoded French/English
- Namespace per feature: `t('student:profile.title')`, `t('common:actions.save')`
- Arabic locale uses `dir="rtl"` — Mantine handles this via the `dir` prop on `MantineProvider`
- Date formatting uses `Intl.DateTimeFormat` with the active locale — never manually format dates
- Never use `new Date().toLocaleDateString()` directly — use the i18n date utility

---

## Conventions

- File names: `PascalCase.tsx` for components, `camelCase.ts` for utilities/hooks
- Hook prefix: always `use` — `useAuth`, `useNotify`, `useStageEvaluation`
- Component exports: named export only, no default exports (makes refactoring easier)
- Avoid barrel `index.ts` files inside feature folders — import directly from the file
- No `any` types — use `unknown` and narrow properly
- Enum values from backend come as strings (`"Pending"`, `"Validated"`) — define as TypeScript union types, not enums
- All backend dates are ISO 8601 strings — parse with `new Date(str)` at the component boundary

---

## Performance & Pre-flight Validation

Two recurring quality rules — apply them everywhere, not just where the examples below are called out.

### 1. Guard actions on the client before they can fail (pre-flight validation)

**Validate as much as possible on the frontend before sending a request.** A request that the server is
guaranteed to reject (or that is a no-op) should never leave the browser — disable the control and tell the
user why. This avoids wasted round-trips, DB hits, error toasts, and confusing partial states.

Rules:
- **Disable any submit/action button whose preconditions aren't met**, and surface the reason inline
  (helper text, a dimmed hint, or a tooltip on the disabled control). Never let the user click an action that
  can only fail.
- Mirror the backend's required fields and invariants in the form (required selects, non-empty reason,
  enum-in-range, FK selected, at least one item checked, a target period chosen, etc.). The backend
  `FluentValidation` is the source of truth — the client guard is the fast path, not a replacement.
- Prefer **`disabled` + reason** over letting the click through and showing an error toast.
- The server still validates — client guards are UX/perf, never security.

**A search must also show ALL its matches.** `GroupsPage.tsx` fetched candidates then silently kept `items[0]`,
so searching a common surname displayed an arbitrary student's group. If a term can match more than one row,
render every match and let the user pick — never resolve ambiguity behind their back. And always destructure
`isFetching` from the query: a search with no visible loading state reads as broken, not slow.

Known offenders to fix when touched (this list is tracked in root `HANDOFF.md` → "Optimization sweep"):
- **Planning grid / `ScheduleGridModal`**: "Répartition automatique" is clickable even when **no period /
  slot exists** for the stage — it should be disabled with "ajoutez d'abord des périodes". (Same class of
  bug the Suivi bar already fixed with `selectionHasTargetPeriod`.)
- Audit every page's primary mutation for an equivalent "can this even succeed right now?" guard.

### 1b. Never render an unbounded list — the data is bigger than the fixtures were

The legacy import replaced seeded fixtures with real history, and every list that had no pagination
became a crash. Current baseline: **1,003 groups**, **13,604 cohorts**, and a single "Non réparti"
group holding **4,725 students** for 2025-2026. A promotion of 1,000 students adds ~100 groups a year.

Rules:
- A screen that **displays** a list paginates for real (`Pagination` + `totalPages`, `isFetching`
  spinner, `setPage(1)` on a new search term).
- A screen that uses a list as a **lookup** (dropdown, filter, assignment grid) uses the `*Options`
  query variants — `getAcademicGroupOptions`, `getCohortOptionsByStage`. They still call the paged
  endpoint, ask for one large page, and unwrap `.items`; they are not a licence to fetch everything.
- **To show a count, request `pageSize: 1` and read `totalCount`.** `AdminDashboardPage` used to fetch
  all 1,003 groups to render one number.
- ⚠ **Never compute a count, a total or a grouping from a page.** An `*Options` query asks for one
  large page; anything derived from it inherits that ceiling *silently*. The Plan macro tab derived
  its partitions, each one's size and « N groupes sans partition » from `/groups` at `pageSize: 200`,
  and a promotion adds ~100 rosters a year — past 200 every one of those numbers read low, including
  the one whose only job is to say a gap-fill is owed. Raising the page size moves the cliff; the fix
  is an aggregate endpoint (`getPromotionPartitioning`). If a number must be right, the server counts it.
- **Anything year-scoped passes `academicYearId` to the server.** `AttendancePage` fetched every
  year's cohorts and filtered client-side; `StageDetailPage` did the same. Both now scope the query.

### 1c. The navbar year is the only year, and it must be in the query key

There is one academic-year selector, in `AdminLayout`, exposed by `useAcademicYear()`. Two rules:

- **Read it from the context — never add a second picker.** `StageTimelinePage` had its own `Select`,
  so the page could sit on a different year from every other admin screen with nothing saying so. A
  screen that legitimately needs a *different* year (provisioning next year's cohorts from this
  year's stage page) defaults to `currentYearId` and follows it until the user overrides — see the
  `yearOverride` pattern in `StageDetailPage`'s cohort-creation modal.
- **Pass `academicYearId` into the RTK Query arg, not just into a client-side filter.** This is what
  makes changing the year revalidate: the arg is the cache key, so the refetch is automatic. A query
  that omits it shows stale data from the previous year and no amount of `refetchOnMountOrArgChange`
  will fix it, because as far as RTK Query is concerned the arg never changed.
- **Mutations need it too.** Every stage-wide action (`start` / `complete` / `pause` / `resume` /
  `publish` / `auto-arrange` / `assign-all` / the évaluation import) sends it. The server resolves an
  omitted year to the *current* one, so a page left on 2024-2025 that forgets the field does not
  widen — it silently acts on the wrong promotion, which is worse.

### 2. Debounce every search / free-text-filtered query input

Typing into a field that drives a server query must **not** fire a request per keystroke — it causes the
"laggy input" feel (e.g. the academic-group student search).

Standard pattern (already used in `EmployeesPage`, `GroupsPage`, `InfrastructurePage`, `ScheduleGridModal`):

```ts
const [search, setSearch] = useState('');
const [debouncedSearch] = useDebouncedValue(search, 350);      // @mantine/hooks, 300–350ms
// reset pagination when the term changes
useEffect(() => setPage(1), [debouncedSearch]);
const { data, isFetching } = useGetXxxQuery(
  { searchTerm: debouncedSearch || undefined, pageNumber: page },
  { skip: debouncedSearch.length < 2 },                        // don't query on 0–1 chars
);
```

Rules:
- Bind the **input** to the raw `search` state (so typing stays instant); feed only the **debounced** value
  to the query.
- `skip` the query until the term is meaningful (`length < 2`) to avoid a full-table fetch on the first
  keystroke.
- Use `isFetching` (not `isLoading`) for the in-place "refreshing" spinner so the list doesn't unmount.
- For purely **client-side** filtering of an already-loaded small list, memoize the filter
  (`useMemo`) instead of recomputing on every render.

---

## Environment Variables

All vars must be prefixed `VITE_` to be accessible in the browser.

| Variable | Purpose |
|---|---|
| `VITE_KEYCLOAK_URL` | Keycloak server URL |
| `VITE_KEYCLOAK_REALM` | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | Keycloak client ID |
| `VITE_API_BASE_URL` | Backend API base URL (proxied in dev) |
| `VITE_PORT` | Vite dev server port |
| `VITE_MAINTENANCE_MODE` | `"true"` to show maintenance page |

**Never hardcode URLs in `config.ts` or anywhere else.** Always read from `import.meta.env.VITE_*`.
