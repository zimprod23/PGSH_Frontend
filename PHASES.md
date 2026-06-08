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

**Status: In progress**

Separate layouts and pages per admin role. All behind `AuthGuard`.

---

### 3a — Shared infrastructure ✅
- `AdminLayout.tsx`: sidebar (220px), header (60px), gradient PS logo, nav items, user card with logout
- `adminApi.ts`: all admin RTK Query endpoints in one slice (students, academic-years, levels, registrations)
- `admin.types.ts`: all admin TypeScript interfaces matching API.md exactly
- Routes: `/admin/*` zone with `AuthGuard requiredRole={['Scolarite','SuperUser','Secretaire']}`

---

### 3b — Student management ✅
- **Route**: `/admin/students`
- `StudentListPage`: single search input (debounced 350ms), page size selector, paginated table (avatar + name + email / CNE / Appogee / Filière badge / CIN), skeleton rows while loading, empty state
- **Route**: `/admin/students/:id`
- `AdminStudentDetailPage`: Inscriptions tab (primary) + Profile tab (secondary)
  - Inscriptions tab: registration cards (year label + level + status badge), inline status Select per card, "Nouvelle inscription" button → `CreateRegistrationModal`
  - `CreateRegistrationModal`: year Select (from `GET /academic-years`), level Select filtered by student's program (from `GET /levels`), status Select — backend enforces program-mismatch and chronological-consistency rules

---

### 3c — Reference data management ✅
- **Route**: `/admin/academic-years`
- `AcademicYearsPage`: table (label / start / end / isCurrent badge), "Nouvelle année" button → create modal (label + date inputs + isCurrent checkbox); backend `POST /academic-years` created — auto-unsets other current years when `IsCurrent: true`
- **Route**: `/admin/levels`
- `LevelsPage`: SegmentedControl filter by program (Tous/Médecine/Pharmacie/Master/Doctorat), table (label / year / program badge / edit icon), "Nouveau niveau" → create modal, edit icon → edit modal; shared `LevelFormModal` component; level `AcademicProgram` enum type fixed across backend (was `int`, now proper enum)

---

### 3d — Group management ✅
- **Route**: `/admin/groups`
- `GroupsPage`: year Select + level Select (searchable, grouped by program) + group size NumberInput (2–60) → "Lancer la répartition" → result card (groups created / students assigned / failures)
- Warning alert in form: re-running creates additional groups on top of existing ones
- `AutoArrangeGroupsCommandHandler` step-comments removed (clean code)
- Groups list (GET /groups) not built — backend endpoint does not exist yet; add when needed

---

### 3e — Stage & Cohort management ✅
- **Route**: `/admin/stages` → `StagesPage`
  - Search + level filter (Select), paginated table (name / level badge / duration / coefficient)
  - Row actions: Cohortes (→ detail), Modifier (drawer), Supprimer (confirm dialog)
  - `StageFormDrawer`: right-side drawer with basic fields + dynamic objectives list (add/remove rows with label, weight, isMandatory)
- **Route**: `/admin/stages/:id` → `StageDetailPage`
  - Stage info card (duration, coefficient, description) + objectives list (weight badges, mandatory flag)
  - Cohorts panel: cohort cards with student count, slot count badge ("X créneaux" when configured, "Publié" teal badge when published), "Nouvelle cohorte" button → modal
  - "Grille de planning" button per cohort → `ScheduleGridModal` (90vw wide modal)
  - Delete cohort with confirmation
  - Publish/unpublish cohort schedule via `usePublishScheduleMutation` / `useUnpublishScheduleMutation`
- **`ScheduleGridModal`** (`components/ScheduleGridModal.tsx`): full grid view
  - Columns = StageSlots (P1, P2...) with add/delete slot actions
  - Rows = Cohorts with publish/unpublish button per row
  - Cells = `ServicePicker` — Popover with searchable Combobox, shows service name + capacity badge, clear button
  - Capacity indicator: red text when `occupiedSeats ≥ serviceCapacity`
  - RTK Query tags: `schedule-${stageId}` — invalidated by all slot/assignment mutations
- `CreateStageCommand` stray `using System.Windows.Input` removed
- Nav: new "Formation" group containing Stages

---

### 3f — Hospital / Center / Service management ✅
- **Route**: `/admin/hospitals` → `InfrastructurePage` (3-tab layout: Centres | Hôpitaux | Services)
- **Centres tab**: search, paginated table (name / type badge / city), create/edit modal (name + type Select + city)
- **Hôpitaux tab**: search + center filter dropdown, paginated table (name / center / type / city), create/edit modal (name + center Select + type + city + email + description)
- **Services tab**: search + hospital filter dropdown, paginated table (name / hospital / type / capacité / chef de service), create/edit modal (name + hospital Select + type + capacity + description)
- Each tab has skeleton loading, empty state, edit + delete row actions (confirm dialog on delete)
- `GetServicesQuery.ServiceType` fixed from `int?` to `ServiceType?`; handler cast removed; `ToPaginatedResponseAsync` used

---

### 3g — Secrétaire / Employee views 🔄
- ✅ Attendance recording page — admin `AttendancePage`, `AuthGuard` includes `Secretaire` (secrétaire records absences)
- ✅ Employee chef zone — `EmployeeServicesPage`: view services I'm chef of, list active rotations, **Terminer** a rotation (`PUT /service-periods/{id}/complete`), then submit/update its evaluation
- ✅ **Server-side chef scoping** — execution writes (complete / create-eval / update-eval) and the worklist read are scoped per service chef via `ExecutionAuthorizer` (admin override for Scolarite/Secretaire/SuperUser); new `ErrorType.Forbidden` → 403. The chef worklist comes from `GET /employees/me/service-periods` (chef's services derived server-side). See NOTES.md "Execution authorization".
- ✅ Per-objective scoring in the chef evaluation modal — `GET /employees/me/service-periods/{periodId}/objectives` (chef-scoped) feeds a per-objective grade + remark; the final note is the weight-weighted average (mirrors backend `RecomputeFinalScore`). Falls back to a manual total when the stage has no objectives. Also fixed `CreateServiceEvaluationCommandHandler` to attach `StageObjective` so the persisted weighted `FinalScore` is correct (previously every objective weighed 1). Per-row "Terminer" loader fixed to spin only the clicked row.
- ✅ Chef sees the **academic groups** in his service — `ServicePeriodResponse` carries `academicGroupLabel`; `EmployeeServicesPage` shows a "Groupes : A, B" summary per service header and a group badge per student row.
- ✅ Student list richer + faster — admin `StudentListPage` adds a **Filière** SegmentedControl quick-filter (`GetStudentsQuery.Program`) and **Niveau / Groupe** + **Inscription status** columns (`StudentSummaryResponse.CurrentLevelLabel/CurrentGroupLabel/CurrentStatus`, from the student's most recent registration). CNE/Apogée merged into one column.
- ✅ Student stage-status UX — `StageListPage` cards now carry a status icon, a colored left accent, and a status-tinted stage icon (Planifié/En cours/Terminé/Évalué/Validé/Rejeté/Non planifié).
- ✅ Chef worklist restructured by **granularity** — `EmployeeServicesPage` `ServiceCard` now groups periods into **time windows → academic groups → students** instead of three flat tables. Each window Paper shows its date range, per-status count badges, and one sub-Paper per group with a student table (name + **CNE / Apogée**, status badge, contextual action: Terminer / Évaluer / Modifier). Added a **search box** (name/CNE/Apogée) and a **status SegmentedControl** (Tous / En cours / À évaluer / Évalués with counts). `ServicePeriodResponse` now carries `StudentCne` + `StudentAppogee`; a single `GET /employees/me/service-periods` call replaces the prior active+done double-fetch.
- ✅ Two-level **collapsibility** in the chef worklist — the whole **service** card body collapses to a compact header (name + status/group count badges) via a chevron, and each **group** collapses to its header (Groupe X + per-status dot counts) so the chef drills into one group's students at a time. A **"Tout déplier / replier"** button toggles all groups. Collapse state is search-aware: while a query is active every matching group is forced open (and the manual toggles disabled), reverting to the user's manual expansion when the search clears — no effects, all derived from `searching = q.length > 0`.
- ✅ **Bug fix** — `submitEvaluation`/`updateEvaluation` invalidated `periods-${servicePeriodId}` (a Guid) instead of `periods-${serviceId}` (the tag the worklist provides), so the chef list never refreshed after an evaluation. Now thread `serviceId` through both mutations and invalidate the correct tag.
- ✅ **Bug fix — chef worklist truncation** — the chef worklist (`GET /employees/me/service-periods`) was fetched with `pageSize: 100`, but a busy service holds **160+** ServicePeriods. Because the data is grouped client-side, the page-100 cap silently dropped students from whichever groups straddled the boundary (e.g. a group of 8 rendering as 2). `GetMyServicePeriodsQueryHandler` now returns **all** matching periods for the chef's services (no pagination — the chef genuinely needs the full set to group it); the frontend no longer sends a `pageSize`. Confirmed against seed data: groups that showed 0/2/3/7 now resolve to their true 8.
- ✅ **Perf — allowed-services add/remove felt laggy** — adding a service to a stage waited on two sequential round-trips (POST, then a full `getStageById` refetch) before the chip appeared. Now `addAllowedService`/`removeAllowedService` do an **optimistic cache patch** (`onQueryStarted` + `updateQueryData`) so the chip toggles instantly, rolling back only on error; the tag invalidation still reconciles with server truth in the background. Add now passes the full `AllowedServiceSummary` (id/name/hospital) so the optimistic chip renders correctly.
- ✅ **Perf — planning grid open/close lag** — every cell of the schedule grid mounted a full `ServicePicker` (Combobox + debounce + service query + 2 mutation subscriptions); a 20×8 grid = ~160 of them, so opening/closing the modal mounted/unmounted hundreds of heavy components. Refactored to **click-to-edit**: a shared pure `CellFace` renders the cell, a lightweight memoized `ServiceCell` is what the grid actually mounts per cell, and the heavy `ServicePicker` editor is mounted **only for the one cell being edited**. Clear (X) lifted to a single parent-owned mutation. Also memoized the grid's derived arrays (`partitions`, `slots`, `visibleCohorts`, `emptySlotPeriods`, `targetPeriodNumbers`, `conflictingPartitions`) which previously recomputed O(cohorts×slots) every render. Behavior/visuals unchanged; `editing` resets on modal close. Verified tsc + lint clean.
- ✅ **Pagination guardrail (DB protection)** — only 3 of 11 paginated queries capped `pageSize`, so a client could request an unbounded page and hammer the DB. Added a central `MaxPageSize = 200` clamp in `QueryableExtensions.ToPaginatedResponseAsync` (also floors `pageNumber`/`pageSize` at 1). The response still returns the true `TotalCount`/`TotalPages`, so nothing is hidden — callers can still page through everything. Zero behavior change for current traffic (frontend's largest request is `pageSize: 200`). Audit conclusion: the bulk-write paths (affectation, partition assignment, macro plan) are **criteria-driven server-side** (they send `stageId`/`levelId`/`partition`, never a capped page of rows), so the chef-worklist truncation was the only silent-loss instance.
- ✅ **Endpoint hardening — `GET /service-periods` is now administrative-only** — it previously had no authorization beyond authenticated, so any user (even a student) could enumerate every service period. `GetServicePeriodsQueryHandler` now returns `StageErrors.AdministrativeOnly` (403) unless the caller holds an administrative role (`Roles.Administrative`); chefs already use the scoped `GET /employees/me/service-periods`. Note: the generic `POST/PUT /service-evaluations` are **already** correctly enforced at handler level by `ExecutionAuthorizer` (chef-of-that-service or admin) — and chefs legitimately use them — so they were intentionally left open at the route and not restricted to admin-only.

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

---

## 🔲 Phase 8 — Frontend Performance Hardening

**Status: Not started — run after Phase 7, before first large cohort**

Known issues identified during design review.

### High (UX correctness)

- **GlobalLoader fires on all RTK Query requests**: The loading middleware increments `activeRequests` for every RTK Query action including background cache refreshes triggered by `invalidatesTags`. This causes the full-page overlay to flicker on every mutation. Fix: add a `skipGlobalLoader` metadata flag to the RTK Query base and only increment the counter for requests tagged with it (navigation-level fetches), not for silent background refetches.

### Medium (unnecessary network traffic)

- **`useGetLevelsQuery` fetches `pageSize: 100` unconditionally**: All level selects fetch up to 100 levels at once on every component mount. At current scale (~13 levels) this is fine. When the level catalogue grows, replace with a single `GET /levels?pageSize=200` call cached at the app level (RTK Query `keepUnusedDataFor: Infinity`) rather than per-component fetches.

- **RTK Query tag invalidation audit**: Several mutations use list-level tags (`{ type: 'Student', id: 'LIST' }`) which invalidate and refetch the entire paginated list. Where possible, invalidate only the specific item tag (`{ type: 'Student', id }`) and let the list re-use cached data.

### Low (bundle hygiene)

- **Verify no eager route imports**: Run `vite build --mode analyze` and confirm all page-level components are in separate chunks. Any page imported directly (not via `lazy()`) in `routes/index.tsx` will land in the initial bundle.

- **Attendance endpoint has no pagination**: `GET /service-periods/{periodId}/attendance` returns the full array. Fine for 30-day rotations (~30 records). If rotation durations extend to semesters, add cursor-based pagination matching the `PaginatedResponse<T>` contract already in place.

---

## 🔣 Phase 9 — Stage Timeline / Calendar Visualization

**Status: Phase A complete (2026-06-04) · range picker done · Phase B (drag-to-edit) planned.**
Backend counterpart in root `PHASES.md` Phase 7.6. Read-only Gantt now live at `/admin/timeline`
(`StageTimelinePage`, nav "Calendrier"): year picker, sticky month axis, collapsible level rows,
stage bars → partition-window drawer, saturation flags, horizontal scroll. Custom CSS timeline
(date→% via dayjs) — no Gantt dependency. The slot start/end range picker (`DatePickerInput type="range"`,
`@mantine/dates` + `DatesProvider locale=fr`) shipped with it.

### Hierarchy (drill-down)
`Année → Niveaux (1Med, 2Med…) → Stages (barres Gantt) → clic sur un stage → Partitions (calendrier des fenêtres)`.
Optional deepest level (Partition → rotation micro par service) reuses the existing `ScheduleGridModal`.

### Phase A — read-only viewer
- **New feature folder** under `features/admin/` (e.g. `components/StageTimeline/`, a page or a tab
  on the existing planning area). Data via a new RTK Query hook `useGetYearTimelineQuery({ academicYearId, levelId? })`
  hitting `GET /academic-years/{id}/timeline` (see backend Phase 7.6).
- **Rendering approach**: build a **custom timeline with CSS** (map each date to a `%` offset on a
  shared month/week axis; bars are absolutely positioned `div`s styled with the Mantine theme).
  Prefer this over a heavy Gantt dependency to keep the design system consistent and the bundle small;
  only evaluate a library (`frappe-gantt`, `gantt-task-react`) if interactions outgrow custom code.
- **Layout**: sticky time axis (months/weeks) on top; collapsible **Level** rows; each Stage is a bar
  spanning its derived `min start … max end`; bar shows stage name + partition count; color by stage.
  Saturated partitions flagged (reuse the saturation signal from the backend).
- **Stage click** → Drawer/modal with the **partition calendar**: one bar per partition (A, B, C…)
  positioned on the same axis showing its window (A→P1–2, B→P3–4), with cohort count + saturation dot.
- **Empty/loading**: skeleton bars; clear empty state when a level/year has no slots yet (ties into the
  Phase 7.5 "validate referenced periods exist" gap — stages with no slots show "non planifié").
- **Responsive**: horizontal scroll on mobile with a frozen label column.

### Phase B — editable (later)
- Drag to move / resize handles to change a bar's start/end → PUT `StageSlot` dates; re-run the
  cross-stage capacity check server-side and surface `CapacityExceeded`; confirm-before-save + undo.

### Interactive range date picker (from → to) — ships independently
- Replace the paired single date inputs for `StageSlot` start/end (in `ScheduleGridModal`) and the
  macro window setup with **Mantine `DatePickerInput type="range"`** (or inline `DatePicker type="range"`):
  one visual range selection, presets ("ce mois", "4 semaines"), `minDate`/`maxDate` guards bound to the
  academic year. Smallest item here; do it first as a quick UX win.
