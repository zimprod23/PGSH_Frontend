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
