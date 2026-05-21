# PHASES.md — PGSH Frontend Roadmap

**Project:** Plateforme de Gestion des Stages Hospitaliers — Frontend
**Stack:** React 19 · TypeScript · Mantine 8 · RTK Query · React Router 7 · Keycloak · Vite 7

---

## ✅ Phase 0 — Foundation Scaffolding

**Status: Complete**

- Vite + React 19 + TypeScript project initialized
- Mantine 8 + Tabler Icons integrated
- Redux Toolkit + RTK Query store setup with error and loading middleware
- Keycloak PKCE S256 authentication wired via `@react-keycloak/web`
- Feature-based folder structure established
- React Router 7 with role-based `AuthGuard`
- Global loading overlay (250ms debounce, activeRequests counter)
- RFC 7807 ProblemDetails error parsing in errorMiddleware
- Public pages: LandingPage, AboutPage, error pages

---

## ✅ Phase 1 — Infrastructure Rebuild

**Status: Complete (1b deferred to after Phase 2)**

### ✅ 1a — Design system & theme
- `Theme.tsx` fully configured: navy + sky 10-shade palettes, success/warning/danger semantic colors, Plus Jakarta Sans typography, spacing (4px base), radius, shadows, component defaults
- Google Fonts loaded in `index.html`: Plus Jakarta Sans, Noto Sans Arabic, JetBrains Mono
- `index.css` rewritten: global reset, `#F8FAFC` page background, full CSS variable set for all design tokens, subtle scrollbar
- All exact values verified against `design_images/` screenshots
- `DESIGN.md` updated with shell layout, page layout, and component patterns extracted from screenshots

### ⏸️ 1b — Internationalisation (i18n) — deferred to after Phase 2
- Language switcher placeholder is visible in header (FR / AR / EN)
- Wire-up deferred: install `react-i18next`, three locales (fr/ar/en), RTL toggle, migrate all strings

### ✅ 1c — Notification service
- `useNotify` hook: `success()`, `error()`, `warning()`, `info()` with icons, colors, auto-close timers
- `errorMiddleware` fully rewritten: 401 → logout, 403 → toast only, 400/422 → parse `extensions.errors`, 409 → conflict toast, 500+ → server error, `FETCH_ERROR` → network toast

### ✅ 1d — Skeleton stubs for all pages
- All five student pages replaced with clean skeleton stubs (no mock data, no dead imports)
- `DashboardHomePage` added as the `/student` index route
- Skeletons match the content grid structure of each page for Phase 2 rebuild

### ⏸️ 1e — Error boundaries — deferred to Phase 2
- `ErrorBoundary` component to be added per route segment when pages are rebuilt

### ✅ 1f — API type layer
- `src/common/types/index.ts`: all domain enum unions, `PaginatedResponse<T>`, `ApiError` (RFC 7807 with `extensions.errors`), `BulkResponse`, `PGSHToken`
- `src/features/student/types/student.types.ts`: complete student domain types matching `API.md` exactly
- `apiSlice.ts` simplified: removed `baseQueryWithFormat` wrapper — RTK Query hooks return `T` directly
- All `any` types removed from student feature

### ✅ 1g — Env vars and config
- `config.ts` rewritten: no hardcoded URLs, env var fallbacks for standalone dev
- `.env` updated, `.env.example` created with full documentation
- `VITE_API_BASE_URL` removed (Vite proxy via Aspire handles routing)

### ✅ Shell — StudentLayout rebuilt to match designs
- Sidebar: 220px, white, correct nav items in French (Tableau de bord / Mon Profil / Mes Stages / Historique / Demandes / Messages), navy active state (`#E8F1FB`), gradient PS logo, user card at bottom
- Header: breadcrumb + search + bell + language switcher + avatar
- Routes: Dashboard home at `/student` index, all 5 student pages correctly wired
- Keycloak logout fixed: `redirectUri: window.location.origin` — post-logout redirect registered in Keycloak client

### ✅ Other fixes
- `App.tsx`: removed duplicate nested `MantineProvider`
- `useAuth.ts`: full role set (Student / Scolarite / Secretaire / Professor / Employee / SuperUser), `userId` from `keycloak.subject`
- `README.md` replaced: Vite boilerplate → PGSH project README

---

## ✅ Phase 2 — Student Dashboard Rebuild

**Status: Complete (Stage Details partial — see note)**

All pages rebuilt with real API data and design system applied.

### ✅ Dashboard Home (`/student`)
- Greeting from `student.firstName` via `GET /students/me`
- 4 stat cards: Année académique + Statut inscription (live) · Stages effectués + Absences (placeholder — needs InternshipAssignment endpoints)
- "Mon stage actuel" gradient card: shows current registration level + year, explains hospital assignment is pending
- "Activité récente" timeline: last 4 events from `GET /students/{id}/history`, "Tout voir" navigates to History page
- `useGetCurrentStudentQuery` + `useGetStudentHistoryQuery` (skipped until student ID available)

### ✅ Profile Page (`/student/profile`)
- Responsive `Grid` layout: left panel (`span 3`) + tabs (`span 9`), stacks on mobile
- Left panel: gradient header, initials avatar (white border), name, CNE (mono), level badge, Note d'accès stat
- Tabs: Informations personnelles · Cursus académique · Documents (bientôt)
- `ProfileFieldCell` component: icon + uppercase label + value, `mono` flag for identifiers
- All fields mapped to exact backend strings with French formatting (BacSeries, Gender, CivilStatus, etc.)
- Inline edit deferred: no backend PATCH endpoint for student self-update yet

### ✅ Stages Page (`/student/stages`)
- Data: `GET /students/me` → `level.id` → `GET /stages?levelId={id}&pageSize=50`
- **Backend fix**: added `int Id` to `LevelResponse` record (4 handler call sites updated)
- Filter tabs (Tous / En cours / Terminés / Planifiés) with count badges — En cours / Terminés show contextual empty state explaining data will come from InternshipAssignment endpoints
- Responsive 3-col `SimpleGrid`, per-card skeleton, per-filter empty state
- `StageCard`: name, duration in weeks, coefficient, hospital placeholder note, disabled Évaluation button

### ✅ History Page (`/student/history`)
- Full timeline from `GET /students/{id}/history`, grouped by academic year (Sep–Aug cycle)
- `HISTORY_CONFIG` extracted to `utils/historyConfig.tsx` — shared with `ActivityTimeline` on dashboard
- Year headers with event count badge + divider, connector lines between items
- `metadata` rendered as key-value box when present
- Stats card (right): total count + breakdown by type sorted by frequency
- Responsive `Grid`: timeline `span 8` + stats `span 4`, stacks on mobile

### ✅ Demands Page (`/student/demands`)
- "Bientôt disponible" placeholder — permanent until Phase 5

### ⏸️ Stage Details Page (`/student/stages/:id`) — partial
- Currently a Skeleton stub
- Can be partially built: `GET /stages/{id}` returns name, description, coefficient, duration, and full `StageObjective[]` list
- Full build deferred: service info, evaluation scores, and attendance records all require InternshipAssignment endpoints (Phase 5 backend)

---

## 🔄 Phase 3 — Administration Dashboards

**Status: Current focus**

Separate layouts and pages per admin role. All behind `AuthGuard`.

### Scolarité
- Student management: search, create, view, edit
- Registration management: bulk register, validate, update status
- Academic year + group management, auto-arrange groups
- Stage/Cohort management

### Secrétaire
- Attendance recording only
- Read-only student profiles

### Professors / Employees
- View assigned services
- Submit evaluations and objective scores
- View attendance

### Super User
- All Scolarité permissions + hospital/center/service management + user accounts

---

## 🔲 Phase 4 — Real-Time: Notifications & Messaging

**Status: Not started — backend SignalR hub required first**

- `@microsoft/signalr` client, hub connection manager with auto-reconnect
- Notification center: bell icon with unread count, dropdown list, toast on receive
- Direct messaging: student ↔ secretary / professor, real-time via SignalR
- Redux slice for notification + message state

---

## 🔲 Phase 5 — Demands & Digital Signature

**Status: Not started**

- Demand submission (type, title, body, optional file)
- Status lifecycle: Pending → InReview → Signed → Rejected
- External digital signature microservice integration
- SignalR push on status change

---

## 🔲 Phase 6 — Forum with Level Channels

**Status: Not started**

- Channels scoped by Level × AcademicProgram
- Real-time via SignalR (Phase 4 hub)
- Paginated message history, markdown-lite, thread replies

---

## 🔲 Phase 7 — Polish & Production

**Status: Not started**

- i18n Phase 1b completion (FR/AR/EN, RTL)
- Dark theme toggle
- PWA manifest + service worker
- Accessibility audit (WCAG 2.1 AA)
- E2E tests (Playwright)
- CI/CD: GitHub Actions lint + build on PR
- Production environment config, CORS lock-down
