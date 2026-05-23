# ARCHITECTURE.md — Frontend Architecture

This document explains the structural decisions behind the PGSH frontend. The goal is clean, scalable architecture that a new developer can understand in 10 minutes.

---

## Mental Model

```
User interaction
  → React component
    → RTK Query hook (read) or mutation (write)
      → apiSlice base (injects Keycloak token)
        → Vite proxy /api
          → PGSH Backend
            → Keycloak (validates token)
```

For side effects (notifications, error handling):
```
RTK Query middleware
  → errorMiddleware (catches failed actions)
    → notify.error() → Mantine Notifications
  → loadingMiddleware (counts active requests)
    → loadingSlice → GlobalLoader component
```

---

## Folder Responsibilities

### `src/app/`
The Redux store and global infrastructure. Nothing here is visible to the user — it's the engine room.

- `store.ts` — configures Redux store, attaches middleware
- `apiSlice.ts` — RTK Query base with token injection. **All feature API slices extend this.**
- `config.ts` — reads env vars, exports typed config object. Only place `import.meta.env` appears.
- `errorMiddleware.ts` — listens to all Redux actions, shows toast on `rejected` API calls, handles 401/403
- `loadingMiddleware.ts` — counts `pending`/`fulfilled`/`rejected` to drive the global loader
- `loadingSlice.ts` — `{ activeRequests: number }` — only incremented by the middleware
- `state/errorSlice.ts` — stores the last API error for display in error UI components

### `src/common/`
Truly shared code that has no domain knowledge. A component here must not know whether it's used by a student or admin.

- `components/AuthGuard.tsx` — wraps routes, checks Keycloak `initialized` + `authenticated` + role
- `components/Theme.tsx` — Mantine theme configuration (colors, typography, spacing, component defaults)
- `components/GlobalLoader.tsx` — full-screen overlay driven by `activeRequests > 0`, with 250ms delay
- `components/SkeletonCard.tsx` — shimmer placeholder matching card dimensions
- `components/ErrorBoundary.tsx` — React error boundary with retry, used per route segment
- `hooks/useAuth.ts` — thin wrapper over `useKeycloak()` exposing: `isAuthenticated`, `hasRole()`, `login()`, `logout()`, `userId`, `email`
- `hooks/useNotify.ts` — notification service, wraps Mantine Notifications
- `types/index.ts` — shared TypeScript types: `PaginatedResponse<T>`, `ApiError`, `BulkResponse<K,V>`, role types

### `src/features/`
One folder per user role or domain section. Each feature is self-contained.

```
features/<feature>/
  api/          RTK Query endpoints for this feature only
  components/   Feature-specific UI components (not reusable across features)
  hooks/        Custom hooks that wrap feature-specific logic
  pages/        Route-level page components (one per URL path)
  types/        TypeScript interfaces for this feature's domain
```

**Features never import from each other.** If two features need the same type, it belongs in `common/types/`.

### `src/layouts/`
Shell wrappers that define the chrome around page content (sidebar, header, nav). Not route pages — they're the frame. Each role has its own layout.

### `src/routes/`
- `paths.ts` — constants only. `export const STUDENT_DASHBOARD = '/student'`. Used everywhere — never magic strings.
- `index.tsx` — React Router config. Uses `React.lazy()` for every page (automatic code splitting). Wraps each major section in its `<ErrorBoundary>`.

### `src/services/`
Singleton service instances:
- `keycloak.ts` — Keycloak instance, initialized once at app startup
- `signalr.ts` (Phase 4) — SignalR hub connection manager with auto-reconnect and auth

### `src/i18n/` (Phase 1)
- `index.ts` — i18next initialization, language detection, fallback chain
- `locales/fr/` — French translations (default)
- `locales/ar/` — Arabic translations (RTL)
- `locales/en/` — English translations

---

## State Management Strategy

Three distinct layers of state — each has a clear home:

| State type | Tool | Where |
|---|---|---|
| Server data (API responses) | RTK Query cache | Managed automatically by RTK Query |
| Global UI state (loading, last error) | Redux slices | `app/loadingSlice.ts`, `app/state/errorSlice.ts` |
| Local UI state (modal open, tab, form) | `useState` / Mantine hooks | Inside the component |

**Rules:**
- Never put server data in Redux manually — that's what RTK Query is for
- Never put local UI state (is this modal open?) in Redux — use `useDisclosure` or `useState`
- The Redux store should be small: only things that multiple distant components need simultaneously

---

## Authentication Flow

```
App starts
  → KeycloakProvider initializes
    → Keycloak checks session (silent SSO)
      → Authenticated: token available → app loads normally
      → Not authenticated: AuthGuard redirects to Keycloak login page
        → User logs in at Keycloak
          → Redirect back with auth code
            → Token exchanged (PKCE S256)
              → SyncUserMiddleware (backend): links Keycloak sub to local User record
                → App loads
```

Token refresh: the RTK Query base calls `keycloak.updateToken(30)` before every request. If the token is within 30 seconds of expiry, it refreshes silently. No user action needed.

On 401 from backend: `errorMiddleware` calls `keycloak.logout()` immediately.

---

## API Error Handling

```
API call fails
  → RTK Query creates a rejected action
    → errorMiddleware intercepts
      → Parses RFC 7807 ProblemDetails
        → 401: logout()
        → 403: redirect to /unauthorized
        → 422/400 (validation): show validation errors in form (not toast)
        → 409 (conflict): toast error with message
        → 500: toast "Une erreur serveur est survenue"
        → Network error: toast "Impossible de contacter le serveur"
```

**Important:** Validation errors (`status: 400` with `extensions.errors`) are handled at the form level, not by the global middleware. The form component reads `error?.data?.extensions?.errors` from the mutation result and shows field-level messages.

---

## RTL / i18n Architecture

Mantine supports RTL via the `dir` prop on `MantineProvider`. When Arabic is selected:

```tsx
<MantineProvider dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

This flips:
- Sidebar from left to right
- Text alignment
- Padding/margin directional properties
- Icon placement in inputs

The language switcher writes to localStorage and triggers a React state update at the `App` level, re-rendering `MantineProvider` with the new `dir`.

Fonts: `Plus Jakarta Sans` is used for FR/EN. When `dir="rtl"`, the browser uses `Noto Sans Arabic` from the font stack naturally for Arabic characters.

---

## Code Splitting

Every page-level component is lazy-loaded:
```tsx
const ProfilePage = lazy(() => import('../features/student/pages/ProfilePage'));
```

This means the initial bundle only loads the shell (layout, store, Keycloak). Pages load on demand. Suspense fallback is the skeleton for that page type.

---

## Routing Structure

```
/                           → Public zone (no auth)
  /                         → LandingPage
  /about                    → AboutPage

/student                    → AuthGuard (role: Student)
  /student                  → DashboardHomePage (overview)
  /student/profile          → ProfilePage
  /student/stages           → StageListPage
  /student/stages/:id       → StageDetailsPage
  /student/history          → HistoryPage
  /student/demands          → DemandsPage ("Bientôt" until Phase 5)

/admin                      → AuthGuard (role: Scolarite | Secretaire | SuperUser)
  /admin/students           → StudentListPage
  /admin/students/:id       → AdminStudentDetailPage
  /admin/academic-years     → AcademicYearsPage
  /admin/levels             → LevelsPage
  /admin/groups             → GroupsPage
  /admin/stages             → StagesPage
  /admin/stages/:id         → StageDetailPage (with ScheduleGridModal)
  /admin/hospitals          → InfrastructurePage (Centres / Hôpitaux / Services tabs)
  /admin/assignments        → AssignmentsPage

/employee                   → AuthGuard (role: Employee | Professor)
  ...                       → (Phase 3)

/unauthorized               → UnauthorizedPage (no auth required)
/maintenance                → MaintenancePage (shown when VITE_MAINTENANCE_MODE=true)
*                           → ErrorPage (404)
```

---

## Adding a New Feature Module

1. Create `src/features/<feature>/` with subfolders: `api/`, `components/`, `hooks/`, `pages/`, `types/`
2. Define your TypeScript interfaces in `types/` — match `API.md` exactly
3. Create RTK Query endpoints in `api/<feature>Api.ts` — inject into `apiSlice`
4. Build pages in `pages/` — one file per route
5. Add routes to `src/routes/index.tsx` (lazy), paths to `src/routes/paths.ts`
6. Add navigation entry to the relevant layout
7. Add translation keys to `src/i18n/locales/*/`
8. Add `<ErrorBoundary>` wrapper in the route config
