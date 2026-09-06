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

> **▶ NEXT UP (agreed 2026-08-07) — admin evaluation entry.** `adminApi.ts` exposes **no** evaluation
> endpoints, so an administrator cannot enter or amend a `ServiceEvaluation` anywhere in the UI. The
> **backend already permits it** — `ExecutionAuthorizer` bypasses chef-scoping for `Roles.Administrative`, and
> both `POST /service-evaluations` and `PUT /service-evaluations/{id}` honour that (covered by
> `EvaluationHandlerTests.An_administrative_user_may_evaluate_any_service`). This is a pure frontend gap.
> Reuse the chef's `EvaluationModal` from `features/employee/pages/EmployeeServicesPage.tsx` — it already
> handles all three modes (Note 0–20 / Valider le stage / Valider par objectif).
>
> Follow-up in the same stream: **bulk evaluation import from Excel/CSV** (design agreed — see root
> `HANDOFF.md` → "Evaluation import"). Needs an upload screen with a **mandatory preview step** listing every
> row's outcome before anything is applied, plus a "download template" action.
>
> ⚠ Note on wording: admin **"Valider"** means *ratify the professor's evaluation*, not *pass the student*.
> A ratified stage the chef failed stays `NonValidé`. Label and copy accordingly.

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

## ✅ Phase 3.5 — L'inscription : le troisième acte de l'année

**Status: Complete (session 30, 2026-08-30).** `tsc` clean, `npm run build` clean, no new lint error.

`YearClosurePage.tsx` already carries the year's other two acts — déliberation and réinscription. This
is the third, and the three belong on one screen: **a tab, not a page.**

Why it exists: both existing acts start from a registration the student already holds, so neither can
see the September intake, a transfer arriving from another faculty, a returner, or a réorientation.
They hold no registration to be read. See the backend `CLAUDE.md`, « The third act — inscription ».

### Routes

| | |
|---|---|
| `GET /inscription/template?levelId=&academicYearId=` | downloads the .xlsx canvas (a blob, like the déliberation template) |
| `POST /inscription/preview?levelId=&academicYearId=` | multipart `file`; returns `InscriptionReport` |
| `POST /inscription?levelId=&academicYearId=&confirmedStudentCount=` | multipart `file`; same report |
| `POST /inscription/student` | JSON body, one person, no preview; returns one `InscriptionRowReport` |

`levelId` is **required** on all four — nobody on the sheet holds a registration it could be read from.

### What the screen must get right

- ⚠ **This is the only act in PGSH that creates *people*, and there is no undo.** The preview is
  mandatory, and `confirmedStudentCount` must be the number the preview returned in
  `willCreateStudents`, echoed back. Send it wrong or omit it and the apply is refused with
  **409 `Inscription.CreationsNotConfirmed`** — which is the guard working, not a bug. Say the number
  out loud in the confirmation: « 712 étudiants seront créés ».
- ⚠ **Show `generatedEmails` prominently.** An address PGSH manufactured is a *login*
  (`SyncUserMiddleware` matches a Keycloak subject on e-mail). Each row carries its own
  `generatedEmail`; the count belongs in the summary, not buried in a table.
- **`alreadyRegistered` is a skip, not an error** — the file is meant to be re-sent with the late
  arrivals appended. Do not colour it red.
- **Order rows refusals-first** (the server already does) and respect `rowsTruncated`: the counts stay
  exact, the row list is capped at 1 000.
- **Above the first year the provenance is required.** The single-student form should reveal the
  équivalence fields when the chosen level's `year > 1`, and all three of establishment / last year /
  reference go together — two of three is refused.
- **The single-row refusal names the field**, with the code `Inscription.<Action>` in `title` and the
  sentence in `detail` — surface `detail`, not a generic message. (`StagesPage`'s bare `catch` losing
  the server's sentence is the mistake to avoid; see `GroupsPage` for the pattern.)

### What shipped

- `types/inscription.types.ts` — the action union, its labels, and the report/request shapes.
- `api/adminApi.ts` — `getInscriptionTemplate` (blob), `previewInscription`, `applyInscription`,
  `inscribeStudent`. The two writing ones invalidate `Student:LIST`, `Registration:LIST` and
  `Level:GROUPS`: newcomers land in « Non réparti », so the roster lists are stale too.
- `components/InscriptionSection.tsx` — the third card on `YearClosurePage`, keyed on a **required**
  promotion select, with the amber warning above the first year and the generated-address panel.
- `components/InscribeStudentModal.tsx` — the one-student form, its pre-flight blocker mirroring the
  server's rules, and the refusal shown *inline* (the middleware already toasts; a second
  `notify.error` is the double-toast the other panels still carry).

⚠ **A found bug, fixed while here.** `ReinscriptionAction` was missing `FinalYearBlocked` — added to
the backend with the final-year gate and never mirrored. Its badge rendered blank, and the « à
traiter » table filtered on a literal pair (`NoOutcome`, `NextLevelMissing`) so those rows **never
appeared at all**: the count said N and the list showed nothing. Measured on the live base, 60 of the
686 6ᵉ année Médecine are refused entry to the 7ᵉ — the ordinary case, invisible. The filter now reads
`REINSCRIPTION_NEEDS_ATTENTION`, kept beside the union so a new action cannot be added without
deciding whether it belongs there. `finalYearBlocked` and `finalYearWaived` are surfaced as badges.

### Verified in the running app, 2026-08-30

`SMOKE-TEST.md` §28, driven through this screen against the live base. Every conditional behaved:
the promotion select gates both buttons and says why; choosing a 3ᵉ année raises the amber warning and
clears the previous report; a file without its provenance comes back `0 à créer` · `2 erreurs` with
**no apply button at all**; the generated-address panel listed `nour_zaimi@` and `nour_zaimi2@` for two
homonyms; the confirmation checkbox gated the apply, and after it the badge flipped to
« 2 étudiant(s) créé(s) ». Re-uploading the same file gave « 2 déjà inscrit(s), ignoré(s) » in grey.

The modal opens with **Inscrire** disabled and flips its divider to « Provenance — obligatoire » with
the required markers when the chosen level is above the first year.

⚠ **The `FinalYearBlocked` fix is confirmed on real data**: the réinscription's table holds 1000 rows —
942 « Aucune décision » and **58 « Stage antérieur non validé »** — where before the 58 were counted in
the badge and absent from the list.

### Polish left over (none blocking)

- The « Cas » badge truncates to `PROVENANCE REQU…`; the column needs more width or the badge needs to
  wrap. The message column carries the meaning, so this is cosmetic.
- The errors table shows the **Apogée** under a column headed « CNE » when the row has no CNE. Head it
  « Identifiant », or show both.
- On a file where every row is skipped, the apply button is **enabled** and reads « Inscrire 0
  étudiant(s) ». Harmless — the server does nothing — but it should be disabled.
- Changing the navbar year leaves the previous report on screen, labelled with the year it was run
  for. Both this card and the réinscription card do it. The report carries `academicYearLabel`;
  either display it or clear on year change.

---

## ✅ Phase 3.6 — Les exports Excel

**Built 2026-08-31, verified against the live base the same day.**

- **`ExportButton`** (`common/components/`) and **`downloadBlob` / `fileNameFromDisposition`**
  (`common/utils/`) — one place that knows what happens between a click and a saved file.
- **`StageRecordExportMenu`** (`features/admin/components/`) — two named items rather than a
  checkbox, because the difference between « état des lieux » and « PV » is what the document *is*.
- Wired into three screens, each passing **its own scope**:
  - `StudentListPage` → « Exporter (.xlsx) », with the year, the programme, la promotion and the
    search term already selected.
  - `RepartitionPage` → « Dossier de stages (.xlsx) » for the promotion. ⚠ Enabled even when
    « Imprimer / PDF » is not: a promotion can have stages served with no grid authored at all —
    which is exactly the state of every imported year.
  - `AssignmentsPage` → beside « Importer les notes », scoped to the stage in view. One puts the
    verdicts in, the other takes the record out.
- **`problemMessage`** replaced four private copies of `detailOf`, none of which read `errors[]` —
  so every validation refusal had been showing its useless half.

**Found and fixed during the smoke test:** the new button toasted every refusal **twice**
(`errorMiddleware` + the component). Now `isReportedByErrorMiddleware` gates it — see `CLAUDE.md`
§1e, which is the rule the rest of the app should be swept against (root `HANDOFF.md` item 4).

---

## ✅ Phase 3.7 — « Étudiants » sur la liste des groupes

**2026-08-31.** One column, and it closes the report that produced Phase 3.6's notes.

`GroupsPage` showed 90 rosters for 4MED 2026-2027 with no indication that all 90 were empty — the
count had to be discovered by opening each one. `AcademicGroupResponse.studentCount` had always
carried it. The column is now rendered, orange at 0 and teal above it.

Verified against the live base: 2026-2027 → every row **0** (orange); 2025-2026 → 12, 15, 13, 3, 7…
and « Non réparti » at **4 725** (teal). The contrast is the point.

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

- ✅ **The planning grid rendered every cohorte of a stage** — 105 rows × 10 columns on the
  current year’s biggest promotion, ~1 000 cell components mounted at once. It took seconds to
  open **and to close**, and closing issues no request, which is what proved the cost was the
  mount rather than the query. Fixed in session 33: `GET stages/{id}/schedule` is paged
  (`pageNumber` / `pageSize` / `rotationGroup`) and carries a `summary` so every number on the
  screen still describes the whole selection. ⚠ The general rule is `CLAUDE.md` §1b-ter — a grid
  is a list too, and paging one moves every count on the screen to the server.

- ✅ **« Publier toutes » looped one mutation per cohorte**, so `errorMiddleware` printed one red
  toast per cohorte on an over-capacity plan. One stage-wide call now (`CLAUDE.md` §1g).
  ⚠ « Dépublier toutes » still loops on purpose — see `HANDOFF.md` item 19.

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

### Parcours — « Année redoublée » (2026-09-01)

`ParcoursRecord`'s `YearPanel` states, above the stage list, that a failed year is redone in full and
that the stages under it — **including the validated ones** — do not count as acquired.

⚠ Without it the page is actively misleading: « Chirurgie — Validé » nested under a « Redoublant »
badge reads as a stage the student is done with, and the server stopped counting it that day
(`RegistrationStatus.AnnulsItsStages`, backend `NOTES.md`). The year badge alone was not enough —
it says what happened to the *year*, not what that does to the *stages*.

The API also carries the fact explicitly on the level-dossier read (`DossierAttempt.YearOutcome` and
`AnnulledByFailedYear`), but that endpoint has no consumer in this app yet.

## La page Stages nomme le texte, au lieu d'affirmer le chiffre du catalogue — session 36

`StageCatalogueFigure`, dans les colonnes Durée et Coefficient de `StagesPage`.

`Stage.coefficient` / `Stage.durationInDays` sont **dupliqués** par le `CurriculumStage` de chaque
texte. Ils ne coïncidaient que tant qu'aucun texte n'avait repondéré un stage ; l'arrêté 1650.25 est
le premier à le faire, et il est appliqué depuis le 01/09/2026. La page affichait le chiffre du
catalogue seul — donc une valeur qu'aucun CNPN n'énonce forcément, sans rien à l'écran disant qu'un
texte dit autre chose.

- Les en-têtes disent « (catalogue) », et la cellule montre toujours cette valeur : c'est elle que le
  formulaire d'édition réécrit. Rien n'a été déplacé.
- ⚠ **Le marqueur ne s'allume que si un texte est en désaccord.** Muet quand ils concordent, muet
  quand aucun texte ne mentionne le stage — « aucun texte ne le mentionne » n'est pas « un texte dit
  0 ». Un indicateur qui s'allume quoi que disent les données est du bruit, et le bruit se fait
  ignorer : c'est alors le vrai cas qu'on ne voit plus. Même règle que les notes d'export.
- L'infobulle nomme chaque texte et son chiffre, et dit qu'aucun des deux n'est faux — un étudiant qui
  revalide un crédit sous l'ancien texte reste régi par ses chiffres.
- `StageSummaryResponse.textFigures` arrive par une **seconde requête plate** côté serveur, jamais
  comme une collection dans la projection de ligne. Le champ peut être absent d'une réponse mise en
  cache : la page lit `stage.textFigures ?? []`.

⚠ **La moitié de fond n'est pas faite** : décider lequel des deux chiffres fait foi suppose que
`Stage.LevelId` devienne indicatif, puisqu'un stage rattaché à deux niveaux n'a plus une ligne de
catalogue unique pour en porter un. Backend `PHASES.md` §15.1.

## La revalidation avait un acte et aucune porte — session 36

`RevalidateStageModal`, ouvert par « Revalider un stage » sur **chaque carte d'inscription** de la
page étudiant (admin).

`POST stages/revalidate` existait depuis le début, gardé et testé, et **aucun composant de cette
application ne l'appelait** : il n'était atteignable que par Scalar, par quelqu'un détenant un id
d'inscription, un id de stage et un id de cohorte. C'est cette porte.

- **Sur chaque carte, et c'est voulu** : le rattrapage se raccroche toujours à l'inscription que
  l'étudiant détient *aujourd'hui*, jamais à l'année de l'échec.
- ⚠ **La fenêtre proposée vient du texte qui le régit, jamais du catalogue.** MED3 Chirurgie annonce
  30 j.o. au catalogue depuis l'alignement sur 1650.25 ; les étudiants qui la doivent encore sont
  régis par 2174.18, qui en dit **66** — et la seule fenêtre de ce type au dossier a duré 65 j.o. Une
  revalidation est par construction un étudiant sur un texte plus ancien : le catalogue est faux pour
  exactement la population qui atteint cet écran. Les deux chiffres sont affichés côte à côte quand
  ils divergent — le but est de rendre le désaccord visible, pas de trancher en silence.
- **Rien n'est déduit quand le texte ne dit rien** : aucune fenêtre proposée, et la boîte le dit.
  Une valeur inventée depuis le catalogue serait indiscernable d'une valeur saisie.
- **`canOpen` vient du serveur**, décidé par les règles mêmes que la commande applique
  (`RevalidationPlanner`, partagé). Une boîte qui propose un acte que la commande refusera ensuite
  est pire que pas de boîte.
- ⚠ **Pas de `notify.error` dans le `catch`** (CLAUDE.md §1e) : `errorMiddleware` toaste déjà tout
  refus dans les mots du serveur. Le `catch` est du contrôle de flux — garder la boîte ouverte sur ce
  qui a été saisi — pas un second message.
- ⚠ **Les dates sont *dérivées* de la proposition, avec un override**, pas synchronisées par un
  `useEffect`. Synchronisées, elles gardaient la fenêtre du stage précédent pendant un rendu après un
  changement de stage — et la fenêtre est tout l'objet de cette boîte. (`react-hooks/set-state-in-effect`
  le refusait aussi, à juste titre.)
- **Garde pré-vol** : le placement est tout-ou-rien côté serveur, donc une fenêtre à moitié remplie
  est désactivée avec sa raison plutôt que de dépenser l'aller-retour.

⚠ **Nécessite un redémarrage de l'API** : l'écran lit `GET registrations/{id}/revalidation-context`,
ajouté en même temps. Un processus antérieur répond 404 — à distinguer d'un 401, qui dit seulement
que l'appel n'était pas authentifié.

## Une page « Sauvegardes », et une bannière dans chaque acte irréversible — session 40

`pages/BackupsPage.tsx` (`/admin/sauvegardes`), `components/SafePointBanner.tsx`,
`hooks/useSafePointGate.ts`.

**La bannière est la fonctionnalité ; la page est l'administration.** Ce qui manquait n'était pas la
capacité de prendre un `pg_dump` — elle existait, en ligne de commande, et a servi trois fois — mais
le fait qu'un humain devait y penser, le jour même où il applique une déliberation sur une promotion
entière. « Créer un point maintenant » est donc **dans** la confirmation de l'acte : la déliberation,
la réinscription par fichier, l'application d'un axe de rotation.

- ⚠ **Elle ne bloque pas.** Sans retour en arrière exploitable, l'application est désactivée jusqu'à
  une case cochée — la forme de `ConfirmedDefaultCount`. Bloquer sèchement voudrait dire que le jour
  où Docker est en panne, la faculté ne peut plus clôturer son année.
- ⚠ **Cinq états, quatre phrases, et surtout deux états là où on aurait mis un booléen** :
  « le service de sauvegarde ne répond pas » n'est pas « il n'y a aucune sauvegarde ». Réparer le
  runner et prendre un point sont des gestes opposés ; un seul écran rouge pour les deux, et
  l'utilisateur clique sur un bouton qui échoue puis conclut que la page est cassée.
- ⚠ **`state` / `hasUsableUndo` / `schemaMatchesRunning` viennent du serveur.** Recalculer la
  comparaison de schéma en TypeScript, ce serait une règle des deux côtés du réseau.
- **Il n'y a pas de bouton « Restaurer », et ce n'est pas une lacune** : un processus ne peut pas
  remplacer la base dont il se sert. Le modal affiche le **coût chiffré** table par table — effacées
  d'un côté, rétablies de l'autre — puis la commande exacte, la pile arrêtée.
- La page suit les règles de volume habituelles : liste paginée, effectifs demandés au serveur, et
  les deux gestes destructifs pré-volés (libellé vide → bouton désactivé ; point le plus récent →
  icône désactivée avec l'infobulle qui dit pourquoi).
- L'encart Keycloak dit que le realm **n'est pas** couvert. Une lacune énoncée vaut mieux qu'une
  lacune supposée réglée : restaurer la base sans le realm laisse `SyncUserMiddleware` apparier un
  `sub` contre des `User` disparus, et son repli est l'adresse e-mail.

⚠ **Ce qui reste** : `BackupVerification.Restored` est une valeur que rien ne pose — l'écran sait
faire relire la table des matières d'une archive, pas la restaurer à blanc. Backend `PHASES.md` §18.2,
recette `SMOKE-TEST.md` §41.

## Une demande nominative se résout par un groupe — session 41

`PlacementsPage` (`/admin/placements`), plus `HospitalCoveragePanel` et `RosterPlacementCard`.

Trois demandes réelles : « cet étudiant fait tous ses stages à l'hôpital militaire », « ces deux
étudiantes ensemble, stage A en S1 et stage B en S2 », « ces frères dans le même service ». Elles se
résolvent toutes par un **roster** — et la réponse la moins chère, « un groupe y va déjà », était
inatteignable : rien ne permettait de demander quel groupe est au HMIMV.

- **La page est un outil de décision, pas un tableau.** Elle porte l'ordre du moins cher au plus cher
  (transférer vers un roster existant · un roster partagé par contrainte · épingler · un roster
  dédié) parce que c'est la question que l'utilisateur pose réellement en arrivant.
- ⚠ **L'état contradictoire est rendu irreprésentable plutôt que désactivé.** Le serveur refuse
  `serviceId` + `hospitalId` ensemble (400) ; ici, choisir l'un **efface** l'autre. C'est plus fort
  qu'un contrôle désactivé — il n'y a pas d'état invalide à expliquer. Le commutateur
  « Exclusivement », lui, est bien *désactivé avec sa raison* : il n'a rien à quoi être exclusif tant
  qu'aucun lieu n'est nommé.
- ⚠ **Trois verdicts, trois phrases — jamais une phrase paramétrée.** « Aucun groupe ne correspond »
  et « rien n'est encore réparti » sont séparés par `summary.placedRosters`, et la couleur change
  avec eux. C'est l'état de la base aujourd'hui, donc c'est le premier écran que l'utilisateur voit.
- ⚠ **Aucun verdict n'est recalculé côté client** — `hospitalPlacement` et `coverage` viennent du
  serveur. Même règle que `ServicePeriodResponse.State` et `RegistrationHoldResponse.blocksPlanning` :
  une règle écrite des deux côtés d'une frontière réseau est deux règles.
- **La liste est un contenant : chaque roster affiche son effectif** (§1b-bis), et un roster de 1-2
  étudiants porte un avertissement — il occupe dans la file d'un service une place dimensionnée pour
  un roster moyen. Rien côté serveur ne le signale ; c'est ici que ça se dit, là où quelqu'un choisit.
- Paginée pour de vrai, filtres dans l'URL (`useListParams`), promotion obligatoire — la requête est
  `skip`ée tant qu'elle manque plutôt que d'aller chercher un 400.

**Reste ouvert (backend `PHASES.md` §19.2)** : rien ne distingue une cellule choisie par un humain
d'une cellule calculée, donc un placement épinglé est détruit au prochain « auto-répartir ce stage ».
Tant que ce marqueur n'existe pas, publier cohorte par cohorte après avoir épinglé.

### Ce que le pilotage dans le navigateur a trouvé (2026-09-04)

`tsc --noEmit` propre, `npm run lint` propre, 1 474 tests backend verts — et **deux défauts**, tous
deux du genre qu'aucune de ces trois vérifications ne peut voir.

1. ⚠ **Le panneau de faisabilité survivait au `skip`.** Lu sur `data` au lieu de `currentData`, il
   affichait encore « Faisabilité — Hôpital Militaire Mohammed V » après que le choix d'un service
   d'un *autre* hôpital eut vidé le filtre hôpital. Un panneau qui **nomme** son sujet ne montre pas
   une donnée en retard, il montre une phrase fausse. Voir `CLAUDE.md` §1i.
2. ⚠ **La réponse vide avait trois causes, pas deux.** La 6ᵉ MED 2026-2027 n'a **aucun groupe** ;
   le message écrit pour « des groupes existent mais rien n'est réparti » disait alors « Les 0
   groupe(s) de cette promotion ne tiennent aucune cellule » et renvoyait vers la répartition —
   alors que le premier geste est de **découper** la promotion. C'est exactement le défaut que
   `placedRosters` existe pour éviter, reproduit un cran plus haut. Trois états, trois phrases.

**Vérifié à l'écran, sur la base vivante :**

| ce qui a été piloté | résultat |
|---|---|
| arrivée sans promotion | aucun appel à `/groups/placements` — le `skip` tient |
| 3ᵉ MED 2026-2027 | 134 groupes, le croisement lisible : partition A = Cardio P1 → Chirurgie P2 → Endocrino P3 → Médecine P4 → Pneumo P5 → Rhumato P6 |
| 4ᵉ MED 2026-2027 | **Pédiatrie · P1, P2** — une série `SingleService` pliée en une entrée portant deux créneaux |
| faisabilité 6ᵉ MED / HMIMV | « Toute la rotation peut se faire ici » — 6/6 |
| faisabilité 5ᵉ MED / HMIMV | « **impossible pour cette promotion** », nommant *Santé Publique* (1 service autorisé, ailleurs) |
| Hôpital puis Service | l'hôpital se vide seul, l'URL perd `hospital=2` — l'état interdit est irreprésentable |
| « Exclusivement » sans lieu | désactivé, raison dans l'infobulle |
| 6ᵉ MED 2026-2027 | orange « Cette promotion n'a aucun groupe » (0 roster) |
| 6ᵉ MED 2025-2026 | orange « Rien n'est encore réparti » (100 rosters, 0 réparti) + « reste à répartir » par stage |
| 5ᵉ MED 2026-2027 + Exclusivement | **gris** « Aucun groupe ne correspond » (121 répartis) |
| changement d'année | la liste se recharge, les filtres de lieu survivent |

## « Qui a fait ça, et quand ? » — session 42

`AuditLogPage` (`/admin/journal`, Système) + `components/audit/auditActions.ts`.

Le 02/09/2026, 66 rosters sont apparus sur la 7ᵉ MED et personne n'a pu dire d'où. Le registre
existait — 35 commandes y écrivaient — mais **rien ne pouvait l'ouvrir** : ni route, ni écran.

- **Un code sans libellé français s'affiche tel quel**, jamais masqué ni renommé « Autre ». La table
  de libellés est une amélioration de lisibilité, pas un filtre : c'est le serveur qui décide de ce
  qui existe, et un acte que l'écran ne sait pas nommer reste un acte qui a eu lieu. L'infobulle le
  dit.
- **Les métadonnées sont analysées dans un `try/catch` et rendues brutes si elles ne parsent pas.**
  Les commandes les plus anciennes interpolent leur JSON à la main ; une entrée illisible reste une
  entrée.
- ⚠ **Trois états d'auteur, trois rendus.** « Quelqu'un », « non résolu » (identifiant présent, compte
  introuvable) et « système » (aucun identifiant, tâche planifiée). Un blanc les confondrait, et
  c'est justement quand quelque chose a mal tourné qu'on les distingue.
- ⚠ **La page ignore l'année de la barre du haut, délibérément** — une entrée est datée d'une
  horloge. C'est le seul écran d'administration dans ce cas, et le bandeau le dit pour que l'absence
  d'effet du sélecteur ne se lise pas comme une panne.
- ⚠ **Elle rendait `null` en cas d'erreur** — trouvé au premier pilotage, l'API tournant sans la
  route : filtres, puis un vide absolu. `errorMiddleware` laisse volontairement passer les 404 sur
  une lecture (§1e), donc c'est à l'écran de rendre cet état. Une 404 a maintenant sa phrase — « le
  processus API est plus ancien que cette page » — distincte d'une panne de service.

### Ce que le pilotage a trouvé sur le journal (04/09/2026)

Deux défauts, aucun visible au type-check, au lint ni aux 1 509 tests.

1. ⚠ **`String(value)` sur une métadonnée imbriquée.** `ApplyRotationCycleCommand` écrit `stages`
   comme un tableau d'objets ; la colonne Critères affichait
   « `stages : [object Object],[object Object]…` » sur les cinq lignes de bloc de rotation. Cette
   colonne existe pour dire *ce qui a été demandé à l'acte* — une valeur illisible y est pire
   qu'absente, parce qu'elle occupe la place de la réponse. Les objets sont désormais sérialisés,
   les tableaux de valeurs simples restent joints (`stageIds : 3, 6, 5, 4, 7`), et toute valeur
   longue est tronquée avec l'intégralité en infobulle.
2. ⚠ **Le filtre de dates comparait dans un autre repère que l'affichage.** Trois entrées lues
   « 03/09/2026 » et un filtre « du 3 au 3 » n'en rendait que deux : celle de 22:16 UTC, affichée
   « 03/09 00:16 » ici, tombait hors d'une fenêtre bornée à minuit **UTC**. Les bornes sont
   maintenant des instants, et **c'est la page qui définit la journée** (`dayStartUtc`) — le serveur
   ne suppose plus aucun fuseau. Voir la note dans `audit.types.ts`.

**Vérifié à l'écran, sur le journal réel :** les 11 entrées dans l'ordre décroissant, les libellés
français, les actes destructeurs en rouge, l'auteur résolu, le filtre par type avec « N sur M au
total dans le journal », les deux états vides distincts, et les filtres conservés dans l'URL.

⚠ **Non vérifié : le filtre de dates après correction** — l'API en cours porte encore les bornes
`DateOnly`, donc la requête reste en attente. Elle nécessite un redémarrage. C'est aussi une
occurrence vivante de `HANDOFF.md` item 15 : sans timeout RTK Query, une API muette est
indiscernable d'un chargement.

---

## Un stage fait hors faculté, pour toute une promotion — session 48

**La demande.** Un formulaire propose aux étudiants d'aller à **Kénitra** vu la saturation ; il fallait
pouvoir enregistrer ça pour beaucoup d'étudiants à la fois, et saisir ensuite les validations
rapportées sur papier.

### Ce qui a changé côté écran

- **`ServiceFormModal` — « Service hors faculté »**, décoché par défaut. La description dit la
  **conséquence** plutôt que de nommer le réglage : « ne peut pas figurer dans la rotation d'un stage
  ni dans une cellule du planning, et sa capacité n'entre dans aucun calcul de charge ».
- **La liste des services marque l'état rare** (§1k) : un badge « hors faculté » à côté du nom, et
  **aucun nombre** dans la colonne Capacité — un service que la faculté ne gère pas n'a pas de plafond
  que quelqu'un aurait saisi, et en afficher un invite à une décision de capacité qui ne s'applique
  jamais.
- **La fiche d'un service externe remplace toute la carte « Limite en vigueur »** par ce qu'il est.
  Imprimer un plafond qui ne gouverne rien est précisément l'erreur de lecture que cette carte existe
  pour empêcher, dans l'autre sens.
- **`BulkDelocalizationModal`** — aperçu puis application, sélection par groupes + liste collée de
  CNE/Apogée. Le bouton porte **le nombre de l'aperçu** et n'est armé que par lui.
- **La modale de délocalisation d'un étudiant** accepte désormais une note /20 et porte **l'annulation
  à côté de l'acte** — un stage délocalisé par erreur se corrige là, par la personne qui vient de le
  faire.
- **La grille dit « dont N hors CHU »** sur la ligne d'un roster. Sans ça, un effectif plein devant des
  cellules qui ne chargent rien se lit comme un bug.

### ⚠ Ce que la relecture des règles maison a rattrapé

- **Le double toast (§1e).** La modale existante faisait `notify.error(...)` dans son `catch` alors
  qu'`errorMiddleware` affiche déjà la phrase du serveur — deux messages pour un refus. Supprimé ; le
  `catch` ne sert plus qu'au contrôle de flux.
- **Une liste non bornée dans un objet unique (§1b).** L'aperçu renvoyait une ligne par étudiant, et
  une sélection *est* une promotion entière quand on la demande. Le serveur plafonne désormais à 200
  lignes, **refus d'abord**, et porte les compteurs mesurés **avant** le plafond — un nombre recompté
  depuis une liste tronquée est un nombre qui se lit bas en silence.
- **Lire `e.currentTarget` hors de l'updater (§1l)** sur les deux nouveaux interrupteurs.

### Ce qui reste

- **Rien n'a été piloté au navigateur** — `SMOKE-TEST.md` §49, et il faut d'abord créer le service
  « Stage hors CHU — Kénitra », qui n'existe dans aucune base.
- **La validation par objectif ne se saisit pas dans la modale de délocalisation** : elle a besoin des
  objectifs du stage, et la requête existante est indexée par *période* — laquelle n'existe pas encore
  au moment où on enregistre. Elle se saisit après coup depuis le dossier de l'étudiant, sur la
  période créée, par le chemin normal.
