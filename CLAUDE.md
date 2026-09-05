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

### 1a. Rendre l'état invalide irreprésentable vaut mieux que le désactiver

§1 dit de désactiver un contrôle dont les préconditions ne sont pas réunies, et de dire pourquoi.
Quand deux contrôles s'excluent, il y a mieux : faire en sorte que la combinaison interdite n'existe
pas. `PlacementsPage` a un filtre « Hôpital » et un filtre « Service », et le serveur refuse les deux
ensemble (un service appartient déjà à un hôpital). Plutôt que de désactiver l'un quand l'autre est
rempli — ce qui laisse l'utilisateur deviner lequel effacer — **choisir l'un efface l'autre**. Il n'y
a alors aucun état invalide à expliquer, et aucun aller-retour perdu.

- **Le `disabled` + raison reste la règle** quand la précondition n'est pas un autre contrôle :
  « Exclusivement » sur la même page est désactivé tant qu'aucun lieu n'est choisi, avec la raison
  dans l'infobulle, parce qu'il n'y a rien à effacer — il manque quelque chose.
- Repère : deux champs **mutuellement exclusifs** → effacement croisé. Un champ qui **dépend** d'un
  autre → `disabled` + raison.

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

### 1b-bis ⚠ A list of containers must show how full each one is

`GroupsPage` listed 90 rosters for the 4ᵉ année Médecine 2026-2027 — N°, Libellé, Niveau, Rotation,
Année — and **every one of them was empty**. Nothing on the screen said so; the only way to find out
was to open them one at a time. So « la 4ᵉ année a des groupes » looked true, and the roll export
showing a blank `Groupe` column was reported as a broken export instead of as an unpopulated
promotion. **The server had been sending `studentCount` all along**, with a comment saying it was
there « so the list can show it without loading any student ». The list simply never rendered it.

- **If a row stands for a container — a roster, a cohorte, a service, a partition — the list shows
  its population.** A container list without a count cannot distinguish « découpé et rempli » from
  « découpé et vide », and those call for opposite next acts.
- **Take the count from the server's aggregate**, never by fetching the members (`CLAUDE.md` §1b) and
  never from a page of them.
- **Zero is a state, not an error.** An empty roster between the cut and the répartition is ordinary:
  colour it as a warning (orange), not a failure — but never leave it looking like the others.

### 1b-ter ⚠ A grid is a list too — and paging one moves every number on the screen

`ScheduleGridModal` rendered **every** cohorte of a stage: 105 rows × 10 columns on the current year's
biggest promotion, each cell a `Box` + `Group` + `Stack` + two `Text` + `ActionIcon` + `Badge`. It took
seconds to open **and seconds to close**, and closing issues no request — which is what proved the cost
was the mount, not the query (the SQL behind it measures ~40 ms). Somebody had already replaced the
cells' Mantine `Tooltip` with a native `title` for exactly this reason; the remedy was right and the
row count had since outgrown it.

- **A matrix is not exempt from §1b.** If the number of rows grows with the promotion, it pages.
  `GET stages/{id}/schedule` now takes `pageNumber` / `pageSize` / `rotationGroup`.
- ⚠ **Filter on the server, not on the rows you hold.** Client-side partition filtering answers
  « aucune cohorte » for anyone sitting on page 3, and nothing on the screen distinguishes that from a
  promotion nobody has cut. Reset to page 1 whenever the filter changes, or the first click after
  paging lands past the end of the new selection.
- ⚠ **Every number beside a paged list must come from the server, because the buttons act on the
  selection.** « Publier tout (N) » fires one stage-wide call: an N counted from the visible rows
  promises 25 and publishes 90. Same for the saturation report, and for anything derived —
  « nouveaux créneaux uniquement » read off the page calls a column empty because *this page's*
  cohortes are not in it, and then rewrites a rotation already arranged.
- ⚠ **Some questions are about the rows the filter removed.** « La partition B occupe-t-elle déjà ces
  colonnes ? » cannot be answered from rows filtered to A. That is `summary.partitionUsage`, read
  unfiltered by the server.
- **Say what the page is not showing** — « 1–25 sur 105 cohorte(s) — partition A ». A bounded list has
  a failure mode the unbounded one did not: its last page looks exactly like an empty selection.
- **Kill the modal's exit transition on a heavy tree** (`transitionProps={{ duration: 0 }}`). It keeps
  the whole grid mounted while it plays, so « Fermer » stays slow even after the rows are paged.


### 1b-quater ⚠ A lookup query must respect the server's own page cap

`RevalidateStageModal` asked `getStages` for `pageSize: 200`. `GetStagesQueryValidator` caps it at
**100**, so every call was a 400 — and a rejected *lookup* has no empty state to show: the select
simply never opened. It looked like a dead control, not a failed request.

- **Read the backend validator before choosing a page size.** The server is the source of truth for
  the ceiling, and it is not the same number everywhere.
- ⚠ **This class is invisible to the backend suite** — the validator runs in the pipeline, so a
  handler test passes the malformed request straight through — *and* to type-checking. It is only
  visible by driving the screen. Same family as the `Objectives.NotEmpty()` and CNE-regex incidents.
- **If one page cannot cover the set, the answer is a server-side search, not a bigger page.**

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

- **A filter *inside* the year has to be sent to the server, not applied to the page.** The students
  list filters by promotion (`levelId`), and the pair (level, year) must be resolved on one
  registration row — which only the server can do. Measured on the live base 2026-08-29: « 5ᵉ année
  Médecine, 2026-2027 » is **833** students, while « inscrit en 2026-2027 » ∧ « a été en 5ᵉ année »
  is **2 127**. Filtering the fetched page client-side is worse still: it narrows 15 rows, not 5 930.

### 1d ⚠ Never dispatch before `next(action)` in a middleware

`loadingMiddleware` did, for the whole life of the file, and it silently staled data across the app:

```ts
if (action.type.endsWith("/fulfilled")) api.dispatch(fulfilled());   // ⚠ WRONG — before next()
return next(action);
```

`api.dispatch` runs the entire reducer chain and **notifies every subscriber while the action in
flight has not yet been reduced**. For `api/executeQuery/fulfilled` that means components re-render
reading the query as still `pending` with `data: undefined`, and `useSyncExternalStore` caches that
snapshot.

⚠ **It self-corrects almost everywhere, which is exactly what made it so hard to see.** Any *later*
dispatch notifies again and everyone catches up — so only the query that settles **last on a page**
stays stale, forever. Diagnosed 2026-08-18 on the CNPN page: the effectivity table rendered
« 0 règle(s) » and a permanent "Actualisation…" while `state.api.queries[…]` held the same query as
`fulfilled`, 3 rows, 1 subscriber. The versions table directly above it — same slice, same
invalidating mutation — refreshed correctly throughout, which sent the investigation into the panel
for hours. Nothing was wrong with the panel.

Rules:
- **Always `const result = next(action)` first, dispatch after, return `result`.**
- A component stuck on stale data while the store is correct is *never* an RTK cache problem. Read
  `store.getState().api.queries` and the component's own hook state before touching the component —
  if they disagree, the bug is in the store pipeline, not in the query.
- Suspect this class first when one screen is stale and others are not: it is a race about ordering,
  so it looks arbitrary and per-component when it is neither.

### 1e ⚠ Never toast a rejected request from a component — `errorMiddleware` already did

`errorMiddleware` shows **every** rejected request, queries included: connexion, 401, 403, 400/422,
409, and a catch-all for the rest, each in the server's own words. A component that also calls
`notify.error` prints the same sentence **twice** — one orange « Données invalides », one red
« Erreur », stacked. It is the easiest defect in this codebase to reintroduce: reproduced on the new
export button 2026-08-31, and the same one session 31b removed from four teardown handlers.

- **Default: do not catch to notify.** `await trigger(...).unwrap()` inside a `try` is for the
  *control flow* (stop the spinner, keep the modal open), not for the message.
- **The one gap is a 404 on a query**, which the middleware deliberately swallows — « ceci n'existe
  pas encore » is a state a screen renders itself. A control with **no empty state to render** — a
  download button — must speak there, and only there:
  `if (!isReportedByErrorMiddleware(err)) notify.error(problemMessage(err) ?? '…')`.
- **Read the message with `problemMessage`** (`common/utils/problemMessage.ts`), never
  `err.data.detail` by hand. A *business* refusal puts its sentence in `detail`; a
  **validation-pipeline** failure puts the generic « One or more validation errors occurred » there
  and the real messages in `errors[]`. Four files had each rolled their own `detailOf` reading only
  `detail`, so they showed the useless half of every validation refusal.

### 1f. A download comes from the server named, and goes out through one helper

`common/utils/downloadBlob.ts` + `common/components/ExportButton.tsx`.

- ⚠ **The file name comes from `Content-Disposition`, never rebuilt on the client.** The server names
  the file after the scope it actually *resolved* — an omitted year resolves to the current one — and
  a name rebuilt here is a second opinion that drifts the first time a filter is added on one side
  only. `fileNameFromDisposition` prefers the RFC 5987 `filename*` form, or accented names mojibake.
- ⚠ **`responseHandler` must branch on `response.ok`.** RTK runs it for failures too, so
  `responseHandler: r => r.blob()` turns a problem-details refusal into an opaque Blob and every
  message is lost. Return `response.json()` on a failure and `{ blob, fileName }` on success. The
  older template endpoints (déliberation, inscription, évaluations) still have the unguarded shape —
  fix it when they are next touched.
- **The anchor is appended to the document before clicking and the object URL is revoked on a later
  tick.** A detached anchor does not reliably honour `download`, and revoking synchronously races the
  browser's read of the blob.
- **An export button carries the page's own scope** — the same filters as the list above it, minus
  pagination. A file covering a different population from the table it sits under is worse than no
  file. And a disabled one says *why* through a tooltip: an unresolved scope is a normal state.

### 1g ⚠ Never loop a mutation over a collection — ask for the bulk command

`StageDetailPage.handlePublishAll` fired one publish per cohorte, sequentially. On an over-capacity
plan that produced **one red toast per cohorte** — dozens, arriving one at a time as the loop ground
on — because `errorMiddleware` toasts every rejected mutation (§1e), and each one named a different
service while none named the scale. It also re-did the server's whole occupancy computation N times.

- **If the server has a bulk endpoint, use it.** `publishStageSchedule` existed and the grid modal was
  already using it; only this page looped.
- **If it does not, ask for one** rather than looping — a loop is a client-side transaction with no
  rollback, and it is what turns one refusal into a storm.
- ⚠ **A loop that is deliberate must not toast per iteration.** « Dépublier toutes » still loops
  on purpose (each refusal names what *that* cohorte would lose) and it has the same symptom; it is
  `HANDOFF.md` item 19, not a pattern to copy.

### 1g-bis. Un acte irréversible affiche s'il a un retour en arrière — `SafePointBanner`

`features/admin/components/SafePointBanner.tsx` + `hooks/useSafePointGate.ts`, posés sur la
déliberation, la réinscription par fichier et l'application d'un axe de rotation.

- **Le bouton « Créer un point maintenant » est la fonctionnalité, pas la bannière.** Une sauvegarde
  que quelqu'un doit penser à prendre dans un terminal est une *procédure*, et les procédures sautent
  le jour où elles servent — c'est-à-dire le jour où on écrit une promotion entière. Accessible depuis
  l'acte, elle en devient un effet de bord. ⚠ Prendre le point ne doit **rien perdre** de l'écran :
  le fichier chargé et le rapport affiché survivent, sinon personne ne cliquera dessus deux fois.
- ⚠ **Elle ne bloque pas.** Sans retour en arrière exploitable, le bouton d'application est désactivé
  jusqu'à une **case cochée** — même forme que `ConfirmedDefaultCount` : on confirme ce qui ne se
  défait pas. Bloquer sèchement voudrait dire que le jour où Docker est en panne, la faculté ne peut
  plus clôturer son année.
- ⚠ **Quatre phrases distinctes, pas une phrase paramétrée.** « Le service ne répond pas » et « il n'y
  a aucune sauvegarde » appellent des gestes opposés — réparer le runner, ou prendre un point — et une
  formulation commune est exactement l'écran vide qui les confond. Même famille que
  `RepartitionSummary.DeclaredSlotCount` et `OutsideYearCount`.
- **`state`, `hasUsableUndo` et `schemaMatchesRunning` sont envoyés, jamais recalculés ici.** Même
  règle que `ServicePeriodResponse.State` et `RegistrationHoldResponse.BlocksPlanning` : une règle
  écrite des deux côtés d'une frontière réseau est deux règles que rien n'empêche de diverger.
- Le `useSafePointGate` vit dans `hooks/` et non à côté du composant : un fichier qui exporte un
  composant **et** un hook casse le fast-refresh (`react-refresh/only-export-components`), et `npm run
  lint` le refuse.

### 1h. A write that takes minutes says so, and says what leaving costs

« Générer le plan » writes cohortes, affectations and cells for a whole promotion. A `loading` spinner
on a button reads as a frozen screen after ten seconds, and a user who reloads out of doubt loses the
run for nothing.

- **A panel, not a spinner:** what is being written, roughly how long, and « ne fermez pas l'onglet ».
- **`beforeunload` while the request is in flight.** It is the only thing that catches a closed tab.
- ⚠ **Only promise safety the server actually provides.** « L'opération est écrite d'un seul bloc »
  is true because `GenerateMacroPlanCommandHandler` runs inside one transaction
  (`ExecuteAtomicallyAsync`). Without that, interrupting leaves a plan built for the first three
  stages and nothing for the rest — and the panel would be lying.

### 1i ⚠ Un panneau qui *nomme* son sujet se lit sur `currentData`, jamais sur `data`

RTK Query garde dans **`data`** le dernier résultat obtenu *quel que soit l'argument*&nbsp;;
**`currentData`** ne contient que le résultat de l'argument courant, et se vide dès que l'argument
change ou que la requête est `skip`ée.

Trouvé en pilotant `PlacementsPage` le 2026-09-04 — invisible au type-check, aux tests, et à toute
relecture. Le panneau de faisabilité est `skip`é tant qu'aucun hôpital n'est choisi&nbsp;; lu sur
`data`, il **survivait au skip** et continuait d'afficher « Faisabilité — Hôpital Militaire
Mohammed V » alors que le filtre venait d'être vidé par le choix d'un service ailleurs.

- **Le repère : le composant nomme-t-il ce qu'il décrit&nbsp;?** Un panneau titré « Faisabilité —
  <hôpital> » n'affiche pas une donnée en retard, il affiche une **phrase fausse**. Idem en cours de
  chargement&nbsp;: passer de l'hôpital A à l'hôpital B montrerait les stages de A sous le nom de B.
- **`data` reste le bon choix pour une liste** dont l'en-tête ne prétend rien de plus que ce que la
  liste contient, avec `isFetching` pour le dire — c'est ce que fait la liste des rosters ici, et
  `OccupancyReportPage` avant elle.
- Même famille que §1d&nbsp;: une donnée périmée qui se corrige presque partout, donc qu'on ne voit
  que dans le cas précis où elle ne se corrige pas.

### 2. Debounce every search / free-text-filtered query input

Typing into a field that drives a server query must **not** fire a request per keystroke — it causes the
"laggy input" feel (e.g. the academic-group student search).

Standard pattern (already used in `EmployeesPage`, `GroupsPage`, `InfrastructurePage`, `ScheduleGridModal`):

```ts
const [search, setSearch] = useState('');
const [debouncedSearch] = useDebouncedValue(search, 350);      // @mantine/hooks, 300–350ms
// Page returns to 1 when the term or a filter changes — see usePagedFilters, NOT a useEffect.
const [page, setPage] = usePagedFilters(debouncedSearch, someFilter);
const { data, isFetching } = useGetXxxQuery(
  { searchTerm: debouncedSearch || undefined, pageNumber: page },
  { skip: debouncedSearch.length < 2 },                        // don't query on 0–1 chars
);
```

Rules:
⚠ **Never reset the page in a `useEffect`.** This guide used to prescribe
`useEffect(() => setPage(1), [debouncedSearch])`, and five screens carried it. An effect runs *after*
the render that changed the filter, so that render commits with the **old** page still in the query
arguments — RTK fires a request for page 3 of the new filter which is immediately superseded.
`usePagedFilters` (`common/hooks/usePagedFilters.ts`) adjusts the page *during* render, which React
documents for exactly this case and which `react-hooks/set-state-in-effect` is right to demand.
A list whose search and filters belong in the URL should use `useListParams` instead — it does this
and makes the view shareable.

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
