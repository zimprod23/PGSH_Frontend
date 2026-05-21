# PHASES.md — PGSH Frontend Roadmap

**Project:** Plateforme de Gestion des Stages Hospitaliers — Frontend
**Stack:** React 19 · TypeScript · Mantine 8 · RTK Query · React Router 7 · Keycloak · Vite 7

---

## ✅ Phase 0 — Foundation Scaffolding

**Status: Complete (needs cleanup)**

- Vite + React 19 + TypeScript project initialized
- Mantine 8 + Tabler Icons integrated
- Redux Toolkit + RTK Query store setup with error and loading middleware
- Keycloak PKCE S256 authentication wired via `@react-keycloak/web`
- Feature-based folder structure established
- React Router 7 with role-based `AuthGuard`
- Global loading overlay (250ms debounce, activeRequests counter)
- RFC 7807 ProblemDetails error parsing in errorMiddleware
- Student dashboard pages built with mock data: Profile, Stages, StageDetails, Demands, History
- Public pages: LandingPage, AboutPage, error pages

**Known issues to address in Phase 1:**
- Keycloak URL hardcoded in `config.ts` instead of reading from `VITE_KEYCLOAK_URL`
- All dashboard pages use mock/hardcoded data — no real API wiring
- No i18n — all text is hardcoded French strings
- No skeleton loaders — loading is only the full-page overlay
- Single root error boundary — per-route isolation missing
- No success notifications — only error toasts
- Fonts not yet updated to Plus Jakarta Sans / Noto Sans Arabic
- Code quality inconsistencies across pages

---

## 🔄 Phase 1 — Infrastructure Rebuild

**Status: Current focus**

This phase establishes the foundation everything else builds on. No visible features are added, but the architecture becomes production-grade.

### 1a — Design system & theme
- Implement design tokens from `DESIGN.md` in `Theme.tsx`
- Fonts: Plus Jakarta Sans (Latin), Noto Sans Arabic (Arabic) via Google Fonts
- Light theme fully configured (colors, typography, component defaults, spacing)
- Dark theme prepared but not exposed in UI yet
- Global CSS reset and base styles
- Reference: `design_images/` for visual targets

### 1b — Internationalisation (i18n)
- Install and configure `react-i18next` + `i18next`
- Three locales: `fr` (default), `ar` (RTL), `en`
- Language switcher component: 🇫🇷 FR / 🇲🇦 AR / 🇬🇧 EN in header
- Mantine `dir="rtl"` toggle on Arabic selection
- All hardcoded strings migrated to translation keys
- Namespaces: `common`, `student`, `auth`, `errors`
- Date/number formatting via `Intl` with active locale
- Locale persisted in localStorage

### 1c — Notification service
- `useNotify` hook wrapping Mantine Notifications
- Methods: `notify.success()`, `notify.error()`, `notify.warning()`, `notify.info()`
- Consistent icon + color per type
- Auto-dismiss timers (success: 3s, error: 6s, warning: 5s)
- Used from anywhere including outside React (store middleware)
- Replace direct `showNotification` calls scattered in errorMiddleware

### 1d — Loading & skeleton system
- Per-component `<SkeletonCard>` component matching real card dimensions
- `<SkeletonTable>` for list pages
- `<SkeletonProfile>` for profile page
- Global overlay kept only for route-level navigation
- RTK Query `isLoading` / `isFetching` drives local skeleton visibility
- No more full-page freezes for single-card reloads

### 1e — Error boundaries
- `<ErrorBoundary>` component with retry button and friendly message
- Wraps each major route segment (student section, admin section, etc.)
- Displays different UI for network error vs. code crash
- Root boundary unchanged (catches truly uncaught exceptions)

### 1f — API type layer
- TypeScript interfaces matching all backend responses exactly (see `API.md`)
- Separate files per domain: `student.types.ts`, `registration.types.ts`, `stage.types.ts`, etc.
- Union types for all enum strings: `RegistrationStatus`, `InternshipStatus`, `AttendanceStatus`, etc.
- `PaginatedResponse<T>` generic type
- `ApiError` (RFC 7807 ProblemDetails) type
- Remove all `any` from existing code

### 1g — Fix env vars and config
- Remove hardcoded `http://localhost:8082` from `config.ts`
- All Keycloak + API URLs read from `VITE_*` env vars
- `.env.example` file created for onboarding

---

## 🔲 Phase 2 — Student Dashboard Rebuild

**Status: Not started**

All five existing pages rebuilt with the new design, real data, and full UX polish. Design reference: `design_images/`.

### Dashboard Home (new page)
- Overview page at `/student` (current default is profile — change this)
- 4 stat cards: current academic year, registration status, stages completed/total, absences count
- "Mon stage actuel" card with gradient header, progress bar, stage name/service/dates, CTA button
- "Activité récente" timeline (last 4 history events from real API)
- "Prochaine rotation" horizontal card if a planned ServicePeriod exists
- All data from real API endpoints

### Profile Page — rebuild
- Left sticky sidebar card: avatar (initials), name, CNE, program badge, quick action buttons
- Tabbed content: Informations personnelles / Cursus académique / Documents
- Inline editing (click edit → form fields appear in-place → save/cancel)
- Save calls PATCH/PUT endpoint — optimistic update in RTK cache
- Documents tab: placeholder list with "Bientôt disponible" state

### Stages Page — rebuild
- Segmented control filter: Tous / En cours / Terminés / Planifiés
- Stage cards with real data from `InternshipAssignment` + `ServicePeriod` endpoints (when available)
- Until those endpoints are built: show registrations + cohort data
- Score ring chart if `FinalScore` is set
- Empty state when no stages

### Stage Details Page — rebuild
- Real data from stage + cohort + service + objectives
- Tab 1: Service info (name, hospital, city, capacity, ServiceChef)
- Tab 2: Evaluation — `ObjectiveScore` per `StageObjective` with ring charts
- Tab 3: Attendance — list of `AttendanceRecord` with status badges
- Absence alert if `JustifiedAbsent` or `Absent` count > threshold

### History Page — rebuild
- Real data from `GET /students/{id}/history`
- Timeline grouped by academic year
- Event icons per `HistoryType`
- Metadata rendered contextually per event type
- Right panel: stats card (total events, by type breakdown)

### Demands Page — "Bientôt disponible"
- Full-page "coming soon" component with:
  - Illustration (SVG or Mantine's empty state)
  - Title: "Demandes en ligne — Bientôt disponible"
  - Brief description of the feature
  - No create button, no table
- Will be fully built in Phase 5

---

## 🔲 Phase 3 — Administration Dashboards

**Status: Not started**

Separate layouts and pages per admin role. All behind `AuthGuard` with appropriate roles.

### Scolarité (admin with full permissions)
- Student management: search, create, view, edit
- Registration management: bulk register, validate, update status
- Academic year management: create years, manage groups
- Stage/Cohort management: create stages, assign cohorts
- Level management

### Secrétaire (limited — attendance only)
- Attendance recording: select cohort → select date → mark presence per student
- Read-only view of student profiles
- No access to financial or administrative data

### Professors / Employees
- View assigned services
- Submit evaluations for students in their service
- Record objectives scores
- View attendance

### Super User
- All Scolarité permissions +
- Hospital/Center/Service management
- User account management
- System configuration

---

## 🔲 Phase 4 — Real-Time: Notifications & Messaging

**Status: Not started**

Backend must expose a SignalR hub before this phase begins.

### Notifications
- `@microsoft/signalr` client installed
- `src/services/signalr.ts` — hub connection manager (auto-reconnect, auth header)
- Notification types: registration status change, stage assignment, absence alert, demand update
- In-app notification center: bell icon with unread count badge, dropdown list
- Toast on incoming notification
- Redux slice for notification state

### Messaging
- Direct messaging between student ↔ secretary / student ↔ professor
- Conversation list + message thread layout
- SignalR for real-time message delivery
- Optimistic UI: message appears immediately, confirmed on ACK
- Unread count per conversation
- File attachment support (PDF/image)

---

## 🔲 Phase 5 — Demands & Digital Signature

**Status: Not started**

### Demands workflow
- Student submits demand (type, title, body, optional file)
- Status lifecycle: `Pending → InReview → Signed → Rejected`
- Secretary can review and approve/reject
- On approval: demand sent to external digital signature microservice
- Signed document returned as downloadable PDF
- Student notified via SignalR on each status change

### Integration
- Frontend treats signature service as a black box: status polling or webhook → SignalR push
- File upload: multipart/form-data to backend, backend forwards to signature service
- Download: signed PDF served from backend storage endpoint

---

## 🔲 Phase 6 — Forum with Level Channels

**Status: Not started**

### Structure
- Forum is a separate feature module: `src/features/forum/`
- Channels are scoped by Level × AcademicProgram: "1ère Année Médecine", "4ème Année Pharmacie", etc.
- Students only see channels for their level + program
- Professors can post in all channels
- Admin can moderate (pin, delete)

### Technical
- Real-time via SignalR (same hub infrastructure as Phase 4)
- Paginated message history (infinite scroll)
- Markdown-lite formatting (bold, links, code blocks)
- Thread replies on posts
- Reactions (👍 ✅ 🔥)

---

## 🔲 Phase 7 — Polish & Production

**Status: Not started**

- Dark theme toggle (system preference + manual)
- PWA manifest + service worker for offline support
- Performance: route-level code splitting already done; add image lazy loading
- Accessibility audit (WCAG 2.1 AA)
- E2E tests (Playwright) for critical flows: login, view dashboard, view stages
- CI/CD: GitHub Actions lint + build check on PR
- Production environment config
