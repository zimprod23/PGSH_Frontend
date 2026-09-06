# API.md — Backend API Contract

> ⚠ **This file stopped being maintained around Phase 7 and is now a partial contract.** Checked
> 2026-08-30: it documents **none** of the CNPN routes, the déliberation / réinscription / inscription
> acts, the rotation cycle, the working-day calendar, service occupancy, the final-year waivers, the
> promotion partitioning or the chef-de-service worklist. **An endpoint's absence here says nothing
> about whether it exists** — that is how somebody concludes a backend feature has not been built and
> writes it again. The authority is the backend's own `PGSH.API/Endpoints/`, plus `/scalar/v1` against
> a running stack; the backend `CLAUDE.md` explains what each act is for.

All requests go through the Vite proxy at `/api` → backend. In production, replace with direct base URL.

**Authentication:** Every request includes `Authorization: Bearer <keycloak_token>`. Handled automatically by the RTK Query base in `src/app/apiSlice.ts`.

**Error format:** RFC 7807 ProblemDetails. All failures return:
```json
{
  "type": "https://...",
  "title": "Error.Code",
  "status": 400,
  "detail": "Human readable description",
  "extensions": {
    "errors": [{ "code": "Field.Rule", "description": "..." }]
  }
}
```

## Exports (.xlsx) — added 2026-08-31

The two routes that return a **file** rather than JSON. Both are admin-only (403 otherwise), both
resolve an omitted `academicYearId` to the **current** year, and both name the file after the scope
they resolved — read it from `Content-Disposition`, never rebuild it (see `CLAUDE.md` §1f).

| Route | Query params | Returns |
|---|---|---|
| `GET /students/export` | `academicYearId?` `levelId?` `program?` `academicGroupId?` `status?` `searchTerm?` | one sheet, one row per **registration** |
| `GET /stages/assignments/export` | `academicYearId?` `levelId?` `stageId?` `academicGroupId?` `onlyEvaluated?` | three sheets: **Stages** (one row per affectation), **Périodes** (one row per période), **Synthèse** (verdicts per stage) |

- `students/export` carries `Programme` and `Niveau` as **columns**; `levelId` cuts the
  per-promotion file with the columns still in place.
- ⚠ **`status` exists so the file can take the same scope as the list it is downloaded from.** A
  screen showing « diplômés » whose export carries the whole promotion is worse than no button. On
  `GET /students` the same parameter is resolved on the **same registration row** as the level and
  the year — a student diplômé one year and re-registered the next satisfies each half on a different
  row, and in a thesis year that is the ordinary case.
- `stages/assignments/export` is scoped by the **registration's** level, so a rattrapage of an earlier
  year's stage is on its own promotion's file, with `Niveau du stage` naming where the stage belongs.
- `onlyEvaluated=true` narrows to the affectations carrying a verdict (a PV). Left off, the unmarked
  ones are in the document — that is what makes a missing évaluation visible.
- ⚠ **A `SingleService` run is one période covering several créneaux**, and both sheets now say so:
  `Nb créneaux` / `Créneaux` (« P1-P3 »), plus `Détail des créneaux` on the Périodes sheet giving each
  column its own window. The rows stay one per période — a run is marked once — and a période that
  came from no grid leaves the count blank rather than printing `0`.
- Both sheets carry `Chef de service` with an `Origine du chef` beside it (« Affectation » /
  « Note (import) » / « Mixte »): 140 of the 148 services name their professor only in an **undated**
  legacy note, and the file must not pass that off as the dated record.
- ⚠ **Since 2026-09-03 the name comes from that note *alone*** — the base's 2 chef affectations are
  test links, so `ServiceChefPolicy.InForce` is `SourceNoteOnly` (server-side, and it governs the
  répartition document too). Expect « Note (import) » on every row, **no name at all** on a service
  named only by an affectation, and a sentence under the caption of the two chef sheets saying so.
  Nothing in the response shape changed, so no client change was needed — but « rattacher un chef dans
  Personnel puis ré-exporter » no longer flips the column, which is worth knowing before it is
  reported as a bug.

⚠ **`GET services/{id}` carries the resolved chef, and a screen prints *that*** —
`chefAttribution: { name, fromSourceNote, linkedChefWithheld }`, resolved server-side by
`ServiceChefDirectory` as of today. **Do not re-rank `serviceChef` / `chefFromSourceNote` /
`chefHistory` on the client**: that is what the service page used to do, and it headlined
« Pr.N.Elhafidi » on a service whose export said « Youssef Alaoui ». `linkedChefWithheld` is « a chef
*is* linked and is deliberately not the name above » — it is what makes « Désignez un chef de
service » the right advice on 140 services and the wrong one on the two that have one. `serviceChef`
and `chefHistory` remain, as the *configuration* an admin edits.
- Refusals are ordinary ProblemDetails: `Export.NotAllowed` (403), `Export.TooManyRows` (400, naming
  the count and the axis that narrows it), an unknown level (400) or stage (404).

⚠ **A `404` on these is silent** — `errorMiddleware` deliberately swallows a 404 from a query, so a
download control must handle that one case itself (`isReportedByErrorMiddleware`).

---

**Enum values:** All enums are serialized as **strings** (e.g., `"Pending"`, `"Medecine"`). Never integers.

**Pagination:** All paginated responses use `PaginatedResponse<T>`:
```typescript
interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

---

## TypeScript Type Definitions

### Shared types

```typescript
// Registration status lifecycle
type RegistrationStatus = 'Pending' | 'Active' | 'Validated' | 'Failed' | 'Withdrawn';

// Internship assignment status
type InternshipStatus = 'Planned' | 'Ongoing' | 'Completed' | 'Evaluated' | 'Validated' | 'Rejected';

// Stage result
type StageAssignmentResult = 'NonÉvalué' | 'Validé' | 'NonValidé';

// Attendance
type AttendanceStatus = 'Present' | 'Absent' | 'JustifiedAbsent' | 'Late';

// Academic history event
type HistoryType = 'Inscription' | 'ValidationStage' | 'NonValidation' | 'Fraud' | 'Revalidation';

// Enum fields
type AcademicProgram = 'Medecine' | 'Pharmacie' | 'Master' | 'Doctorat';
type HospitalType = 'None' | 'CHU' | 'Central' | 'Spetialité' | 'LHOMA' | 'Autre';
type CenterType = 'None' | 'CHU' | 'Regional' | 'Militaire';
type ServiceType = 'Biologie' | 'Chirurgie' | 'Medical';
type Gender = 'Male' | 'Female';
type AgreementType = 'None' | string;
```

---

## Endpoints

### Users

#### GET `/users/{id}`
Get user by ID. Returns the authenticated user's own profile.
```typescript
// Response
interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
```

---

### Students

#### GET `/students/me`
Returns the full profile of the currently authenticated student (via Keycloak sub → User lookup).

```typescript
// Response
interface StudentResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cin: string | null;
  gender: string;
  civilStatus: string;
  nationalityStatus: string;
  dateOfBirth: string | null;    // ISO 8601 date
  placeOfBirth: string | null;
  fullAddress: string | null;
  cne: string;
  appogee: string;
  academicProgram: AcademicProgram;
  bacSeries: string;
  bacYear: string;
  accessGrade: number;
  ranking: number | null;
  currentRegistration: StudentRegistrationSummary | null;
}

interface StudentRegistrationSummary {
  id: string;
  academicYear: string;          // e.g. "2025-2026"
  status: RegistrationStatus;
  level: LevelSummary;
}

interface LevelSummary {
  label: string | null;
  year: number;
  academicProgram: AcademicProgram;
}
```

#### GET `/students`
Paginated student list (admin use).

⚠ **`levelId`, `academicYearId` and `status` are resolved on the *same* registration row**, never as
independent conditions. 2 635 students in this base have repeated, and the final year is
re-registered every September until the thesis is defended — so a student who satisfies each half on
a different row is the ordinary case. Measured live: « 5ᵉ année Médecine, 2026-2027 » is **833**
students as one `Any` and **2 127** as two.
```typescript
// Query params
interface GetStudentsQuery {
  searchTerm?: string;
  cne?: string;
  appogee?: string;
  cin?: string;
  program?: AcademicProgram;
  levelId?: number;
  academicYearId?: number;
  status?: RegistrationStatus;   // the verdict on THAT year's registration
  pageNumber?: number;   // default 1
  pageSize?: number;     // default 10, max 100
}

// Response: PaginatedResponse<StudentSummaryResponse>
interface StudentSummaryResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cne: string;
  appogee: string;
  academicProgram: AcademicProgram;
  cin: string | null;
}
```

#### GET `/students/{id}`
Full student detail. Same shape as `GET /students/me`.

#### POST `/students`
Create a student. Body = `CreateStudentCommand` shape:
```typescript
interface CreateStudentRequest {
  email: string;
  firstName: string;
  lastName: string;
  cin?: string;
  cne: string;
  appogee: string;
  accessGrade: number;
  academicProgram: AcademicProgram;
  bacSeries: string;
  bacYear: string;
  gender: Gender;
  civilStatus: 'Civil' | 'Militaire';
  nationalityStatus: 'Marocaine' | 'Etrangaire';
  placeOfBirth?: string;
  fullAddress?: string;
  dateOfBirth?: string;
  academy?: string;
  province?: string;
  ranking?: number;
}
// Response: 201 Created, body: Guid (student id as string)
```

#### DELETE `/students/{id}`
Delete student. Response: `204 No Content`.

#### GET `/students/{id}/history`
```typescript
// Response: StudentHistoryResponse[] (array, not paginated)
interface StudentHistoryResponse {
  id: string;
  historyType: HistoryType;
  createdAt: string;   // ISO 8601 datetime
  metadata: Record<string, unknown> | null;
}
```

---

### Registrations

#### Signalements — `GET /registrations/holds` · `POST /registrations/holds/{id}/release`

Registrations PGSH created but will **not plan** until somebody settles them: cut into no roster,
given no cohorte, published no période. They keep their status, their verdict and everything already
published under them — a hold only stops *new* work being built on a registration nobody confirmed.

```typescript
interface RegistrationHoldsRequest {
  academicYearId?: number;             // omitted → the current year, never "all"
  reason?: 'OutstandingPriorStages' | 'AbsentFromReinscriptionRoll';
  filter?: 'Active' | 'Released' | 'All';   // default Active — the worklist
  searchTerm?: string;                 // nom / CNE / Apogée, server-side, debounce 350 ms
  pageNumber?: number;
  pageSize?: number;                   // default 25
}
// Response: PaginatedResponse<RegistrationHold>

interface ReleaseHoldRequest { holdId: string; releaseNote: string; }  // note required
// Response: { registrationId, released, stillHeld }
```

- ⚠ **The year is the *registration's*, not the flag's.** One réinscription roll raises holds on the
  closing year's registrations and creates the opening year's in the same act, so the 182 final-year
  debts sit on **2026-2027** and the 1 267 absentees on **2025-2026**. The navbar year drives the page.
- ⚠ **`stillHeld` is not decoration.** Two reasons can stand on one registration, so « c'est réglé »
  and « il en reste un » are different facts and only the server knows which.
- ⚠ **There is no bulk release**, deliberately: it would undo in one click the only thing that made a
  1 267-row inference safe to record. Each hold is a different question.
- The evidence is a **snapshot** taken when the flag was raised and is never re-derived on read. If it
  no longer holds, that is the discovery that releases it.

#### POST `/reinscription/sheet/export` — the roll's report as .xlsx

Same multipart upload as `/reinscription/sheet/preview` (`file`, `fromAcademicYearId`,
`toAcademicYearId`), returns a three-sheet workbook: **Synthèse · Lignes · Absents**.

- ⚠ **Uncapped.** The on-screen report stops at 1 000 rows and orders attention-first so a browser
  survives it; the real roll needs ~1 450 walked one at a time. The document is written from the plan,
  not from the capped report, and « Lignes » is in *sheet order* so line 4 312 is line 4 312.
- ⚠ **It writes nothing**, so it is offered before the confirmation and **on a roll the apply would
  refuse** — « donne-moi la liste des erreurs » is the request, and a refusal naming only the first
  offending line cannot answer it.

#### POST `/registrations`
```typescript
interface CreateRegistrationRequest {
  studentId: string;
  academicYearId: number;
  levelId: number;
  status?: RegistrationStatus;   // default: "Pending"
}
// Response: 201 Created, body: registration id (string)
```

#### POST `/registrations/bulk`
```typescript
interface CreateManyRegistrationsRequest {
  studentIds: string[];
  academicYearId: number;
  levelId: number;
  status?: RegistrationStatus;
}
// Response: BulkResponse
interface BulkResponse<TId, TResult> {
  items: BulkItemResult<TId, TResult>[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  hasFailures: boolean;
}
```

#### GET `/registrations/{id}`
```typescript
interface RegistrationResponse {
  id: string;
  studentId: string;
  studentFullName: string;
  academicYear: string;
  levelId: number;
  status: RegistrationStatus;
  failureDescription: string | null;
  failureNotes: string[];
  cheat: boolean;
}
```

#### GET `/students/{studentId}/registrations`
```typescript
// Response: StudentRegistrationResponse[]
interface StudentRegistrationResponse {
  id: string;
  academicYearId: number;
  academicYear: string;
  levelId: number;
  levelLabel: string | null;
  status: RegistrationStatus;
  hasFailures: boolean;
  failureDescription: string | null;
}
```

#### PUT `/registrations/{id}`
```typescript
interface UpdateRegistrationRequest {
  studentId: string;
  status: RegistrationStatus;
  academicYearId: number;
  levelId: number;
  failureDescription?: string;
  failureNotes?: string[];
  cheat?: boolean;
}
// Response: 204 No Content
```

#### DELETE `/registrations/{id}`
Response: `204 No Content`. Blocked if status is `Validated`.

---

### Stages

#### GET `/stages`
```typescript
interface GetStagesQuery {
  searchTerm?: string;
  levelId?: number;
  pageNumber?: number;
  pageSize?: number;
}
// Response: PaginatedResponse<StageSummaryResponse>
interface StageSummaryResponse {
  id: number;
  name: string;
  coefficient: number;
  durationInDays: number;
  levelLabel: string | null;
}
```

#### GET `/stages/{id}`
```typescript
interface StageResponse {
  id: number;
  name: string;
  coefficient: number;
  description: string | null;
  durationInDays: number;
  levelResponse: LevelSummary | null;
  stageObjectiveResponse: StageObjectiveResponse[];
  /** In ROTATION order — the order RotationArranger walks — never alphabetical. */
  allowedServices: AllowedServiceSummary[];
}
interface AllowedServiceSummary {
  id: number;
  name: string;
  hospitalName: string;
  /** 1-based position in the rotation queue. 0 = nobody has authored an order for this stage. */
  rank: number;
}
interface StageObjectiveResponse {
  label: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
}
```

#### POST `/stages` — `CreateStageCommand` body
#### PUT `/stages/{id}` — `UpdateStageCommand` body
#### DELETE `/stages/{id}` — `204 No Content`

#### POST `/stages/{id}/allowed-services` — `{ serviceId }`, `204`
Appended **last** in the rotation order. A newly authorised service has no claim on a position
somebody chose for the others.

#### DELETE `/stages/{id}/allowed-services/{serviceId}` — `204`
The survivors keep their relative order with the hole closed.

#### PUT `/stages/{id}/allowed-services/order` — `{ serviceIds: number[] }`, `204`
Authors the order the services are walked in when a rotation is arranged.

⚠ **A planning input, not a display preference.** `BuildServiceQueue` emits each service's block of
the queue consecutively and the first période takes phase 0, so **the service ranked 1 receives the
first run of group numbers**. That is what lets a nominative placement fall out of the plan instead
of being a cell edited on the grid afterwards — an edit the printed répartition shows, because a
range cannot merge across the hole it leaves.

⚠ **Send the WHOLE list, in the order wanted.** A partial one is refused (`409`,
`Stages.ServiceOrderNotAPermutation`) rather than completed: a short list is far likelier to be a
page opened before somebody else authorised a service than an intention to leave one last. The
refusal names which of missing / unknown / duplicated applies.

It writes no cell — the order is read by the **next** auto-arrange.

---

### Levels

#### GET `/levels`
```typescript
interface GetLevelsQuery {
  searchTerm?: string;
  academicProgram?: AcademicProgram;
  pageNumber?: number;
  pageSize?: number;
}
// Response: PaginatedResponse<LevelResponse>
interface LevelResponse {
  id: number;
  label: string | null;
  year: number;
  academicProgram: AcademicProgram;
}
```

#### POST `/levels` — body: `{ label, year, academicProgram }`
#### PUT `/levels/{id}` — same body shape

---

### Cohorts

#### GET `/cohorts/{id}`
```typescript
interface CohortDetailResponse {
  id: number;
  stageId: number;
  stageName: string;
  academicGroupId: number;
  academicGroupLabel: string;
  label: string;
  studentAssignmentCount: number;
  isSchedulePublished: boolean;
  slotAssignments: CohortSlotDetail[];
}

interface CohortSlotDetail {
  assignmentId: number;
  stageSlotId: number;
  periodNumber: number;
  periodLabel: string | null;
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  serviceId: number;
  serviceName: string;
  hospitalName: string;
}
```

#### GET `/stages/{stageId}/cohorts`
Returns list of cohorts for a stage.
```typescript
interface CohortResponse {
  id: number;
  stageId: number;
  stageName: string;
  academicGroupId: number;
  academicGroupLabel: string;
  label: string;
  studentAssignmentCount: number;
  slotAssignmentCount: number;
  isSchedulePublished: boolean;
  academicYearId: number;
  academicYearLabel: string;
  rotationGroup: string | null;
  /**
   * ⚠ The columns of the axis this cohorte stands in. Read here rather than folded out of the
   * planning grid's cells, which only worked while that response shipped every cohorte and every
   * cell — past its first page, every cohorte would read as running in no period at all.
   */
  periodNumbers: number[];
}
```

#### POST `/cohorts` — `CreateCohortCommand` body
#### PUT `/cohorts/{id}` — `UpdateCohortCommand` body
#### DELETE `/cohorts/{id}` — `204 No Content`

#### POST `/cohorts/{id}/publish-schedule`
Creates `ServicePeriod` records for each student in the cohort × each `CohortSlotAssignment`. Runs capacity check (sum of students per StageSlot × Service ≤ Service.Capacity).
Response: `204 No Content`

Errors: `Schedule.NotConfigured` (no slot assignments), `Schedule.AlreadyPublished`, `Schedule.CapacityExceeded`

#### DELETE `/cohorts/{id}/publish-schedule`
Removes all ServicePeriods created by the published schedule (where `CohortSlotAssignmentId != null`).
Response: `204 No Content`

Error: `Schedule.NotPublished`

---

### Stage Schedule Grid

#### GET `/stages/{stageId}/schedule`
The planning grid for one stage and one year: the columns of the axis, **a page of cohorte rows**, and
a summary describing the whole selection.

⚠ **The rows are paged and the partition is filtered server-side.** The current year's biggest stage
carries 105 cohortes over ten columns — a thousand cells in one payload, and a thousand cell
components mounted at once, which is what made the grid slow to open *and* to close.

```
?academicYearId=22&rotationGroup=A&pageNumber=1&pageSize=25
```
| param | meaning |
|---|---|
| `academicYearId` | omitted = the current year, never all of them |
| `rotationGroup` | one partition label; omitted = the whole promotion |
| `pageNumber` / `pageSize` | default 1 / 25; a non-positive value is read as *unstated*, never as one row |

```typescript
interface StageScheduleResponse {
  stageId: number;
  slots: StageSlotResponse[];                      // every column — bounded by T, never paged
  cohorts: PaginatedResponse<CohortScheduleRow>;   // one page of rows
  summary: StageScheduleSummary;                   // the whole selection
}

/**
 * ⚠ Every number here is measured over the selection, in the store — never over the page. The
 * buttons beside them act on the selection: « Publier tout (N) » fires ONE stage-wide call, so an N
 * counted from 25 visible rows would promise 25 and publish 90.
 */
interface StageScheduleSummary {
  totalCohorts: number;
  publishedCohorts: number;
  configuredUnpublishedCohorts: number;   // what « Publier tout » will publish
  /** ⚠ NOT narrowed by `rotationGroup` — these are the chips the user filters *with*. */
  partitions: { label: string; cohortCount: number }[];
  /** Exact, even when `saturations` below is capped at 100. */
  saturatedCellCount: number;
  /** Deduplicated per (créneau, service): a dozen cohortes in one full service is one problem. */
  saturations: SaturatedCellResponse[];
  /** Columns the selection already occupies — what « nouveaux créneaux uniquement » targets. */
  occupiedSlotIds: number[];
  /** ⚠ Read across the WHOLE stage: it answers a question about the rows the filter removed. */
  partitionUsage: { rotationGroup: string | null; stageSlotId: number }[];
  /** Columns authored for this stage and year, arranged into or not. Never narrowed by the filter. */
  declaredSlotCount: number;
  /**
   * Périodes recorded for this stage and year, whatever their origin — `null` when the question was
   * not put, which is every grid that has an axis. ⚠ Null, never 0: « aucune période » is an answer
   * and « on n'a pas regardé » is not.
   */
  servedPeriodCount: number | null;
  /**
   * Why the table is empty, in one sentence — and `null` as soon as one cell exists.
   *
   * ⚠ **Print it; never re-derive it.** An empty grid has three causes calling for different acts:
   * this year predates the planning grid (2017-2018 → 2025-2026 hold 105 626 périodes for 0 créneau,
   * because the Access import carried the rotations served and the source had no grid), no axis has
   * been laid, or the axis is laid and nobody is arranged into it — and inside the last, a promotion
   * with no cohorte at all is told to provision rather than to arrange. Read as « rien n'est
   * réparti », the first sends an admin to lay an axis over a year that finished.
   *
   * ⚠ It describes the **stage and the year**, never the filtered selection: under `rotationGroup`
   * an empty answer is the filter's doing, and the row counter already says so.
   */
  emptyGridNote: string | null;
}

interface SaturatedCellResponse {
  stageSlotId: number;
  periodNumber: number;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  occupiedSeats: number;
  capacity: number;                        // 0 when `reason` is 'Refused' — there is no room to be under
  reason: 'Total' | 'Quota' | 'Refused';   // service total · promotion quota · promotion not admitted
  /** Whether « autoriser le dépassement d'effectif » would let this cell through: false for
   *  `Refused`, and false on a service whose chef has refused the override
   *  (`Service.allowsOverCapacity`).
   *
   *  ⚠ **Not derivable from `reason`** — the numbers of a firm service and of a permissive one are
   *  identical, and only the service says which. It is sent for the reason
   *  `ServicePeriodResponse.state` is: one rule, two sides of a network boundary. Absent from an API
   *  predating the field, where the honest reading is the old behaviour, i.e. forceable. Saturations
   *  are ordered **unforceable first**. */
  forceable?: boolean;
}

interface StageSlotResponse {
  id: number;
  periodNumber: number;
  label: string | null;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

interface CohortScheduleRow {
  cohortId: number;
  cohortLabel: string;
  academicGroupId: number;
  academicGroupLabel: string;
  rotationGroup: string | null;
  studentCount: number;
  isSchedulePublished: boolean;
  cells: (SlotCellResponse | null)[];   // one entry per slot, null if unassigned
}

/**
 * `capacity` / `occupiedSeats` are the ONE limit governing this cell and the load measured against
 * it — quotas replace a service's total rather than sitting under it. `isLevelQuota` says which rule
 * is in force; `admitsLevel` is false when the service refuses this promotion outright, which
 * « autoriser le dépassement » does not lift.
 */
interface SlotCellResponse {
  assignmentId: number;
  stageSlotId: number;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  capacity: number;
  occupiedSeats: number;
  isLevelQuota: boolean;
  admitsLevel: boolean;
  /**
   * Whether THIS cell has been materialised into périodes — narrower than the row's
   * `isSchedulePublished`, which stays correct because one période makes a strictly weaker claim.
   *
   * ⚠ Resolved server-side from the coverage table, never from `ServicePeriod.CohortSlotAssignmentId`:
   * that key names only the FIRST cell of a run, so under `SingleService` the trailing cells of a
   * published run have nothing pointing at them — measured on Gynécologie Obstétrique 2026-2027, 363
   * cells of which the key names 121, i.e. 242 published cells would read as free.
   *
   * ⚠ A marker, not a guard: editing is still refused per **row** (the command refuses on « the
   * cohorte holds a grid-linked période »). What it does gate client-side is *clearing* a published
   * cell, which the clear command already refuses.
   */
  isPublished: boolean;
}
```

#### POST `/stages/{stageId}/schedule/unpublish` — `{ academicYearId?, partitionLabels? }`
Undoes a whole stage's publication in **one** request. Replaces the client-side loop, whose cost was
the per-request cache invalidation (the page refetched its whole cohort list after every one), not
the deletion.

⚠ **No `force`.** A cohorte whose rotation has begun is **skipped and counted**, never swept — undo
those with the per-cohorte `DELETE /cohorts/{id}/publish-schedule`, which names what that one costs.

```typescript
interface UnpublishStageResult {
  cohortsUnpublished: number;
  periodsRemoved: number;
  adHocPeriodsKept: number;       // imported history, délocalisations, revalidations — never touched
  cohortsSkippedUnderway: number;
  periodsUnderway: number;
  evaluationsAtRisk: number;
  attendanceDaysAtRisk: number;
  heaviestSkipped: SkippedCohort[];
}
```

⚠ `cohortsUnpublished === 0` has **two** causes — nothing was published, or everything has begun.
Read `cohortsSkippedUnderway` to tell them apart before writing a message.

#### POST `/stages/{stageId}/schedule/publish`
Publishes the stage's configured, unpublished cohortes in **one** call — use this, never a loop of
`POST /cohorts/{id}/publish-schedule`.

```typescript
interface PublishStageRequest {
  academicYearId?: number;      // omitted = the current year
  partitionLabels?: string[];
  periodNumbers?: number[];
  allowOverCapacity?: boolean;  // a *request*: see the two limits below
}
// Response: { publishedCohorts, periodsCreated, skippedCohorts, skippedAlreadyServed }
```

⚠ **`allowOverCapacity` is a request, not a decision, and it has two limits.** It never admits a
promotion the service does not take (`Schedule.LevelNotAdmitted`), and — since 06/09/2026 — it never
forces a service whose chef has refused the overrun (`Schedule.OverCapacityRefusedByService`, i.e.
`Service.allowsOverCapacity === false`). Which cells fall in that second half is knowable **before**
the click: `SaturatedCellResponse.forceable` on the planning grid's summary. A checkbox that promises
a power it lacks is worse than no checkbox — the admin ticks it, gets the same refusal, and concludes
the screen is broken rather than that the plan is.

⚠ **One refusal, not one per cell.** When several cells breach at once the call returns a single
`Schedule.PublishRefusedByIntake` naming how many, how many of those are the **unforceable** halves —
counted separately, since a promotion the service does not take and a service standing on its number
are fixed in different places — and the heaviest three. It stops offering the checkbox when nothing
waivable is left. A single breach keeps its own specific code (`Schedule.CapacityExceeded`,
`Schedule.LevelCapacityExceeded`, `Schedule.LevelNotAdmitted`,
`Schedule.OverCapacityRefusedByService`). Nothing is written when it refuses.

#### POST `/stages/{stageId}/slots`
Create a new time period column.
```typescript
interface CreateStageSlotRequest {
  periodNumber: number;
  label?: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}
// Response: 201 Created, body: slot id (number)
```
Error: `Schedule.DuplicatePeriodNumber`

#### PUT `/stages/{stageId}/slots/{slotId}`
Update a slot's label and dates (`periodNumber` is immutable after creation).
```typescript
interface UpdateStageSlotRequest {
  label?: string;
  startDate: string;
  endDate: string;
}
// Response: 204 No Content
```

#### DELETE `/stages/{stageId}/slots/{slotId}`
Delete a slot and all its `CohortSlotAssignment` cells (cascade).
Response: `204 No Content`

#### PUT `/stages/{stageId}/slots/{slotId}/cohorts/{cohortId}`
Set (or update) the service assigned to this cohort in this slot.
```typescript
interface SetCohortSlotAssignmentRequest {
  serviceId: number;
}
// Response: 201 Created (new) or 204 No Content (update), body: assignment id (number)
```
Error: `Schedule.AlreadyPublished` (cannot change after publishing)

#### DELETE `/stages/{stageId}/slots/{slotId}/cohorts/{cohortId}`
Clear the service assignment for this cohort/slot cell.
Response: `204 No Content`
Error: `Schedule.AlreadyPublished`

---

### Centers

#### GET `/centers`
```typescript
interface GetCentersQuery {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}
// Response: PaginatedResponse<CenterSummaryResponse>
interface CenterSummaryResponse {
  id: number;
  name: string;
  centerType: CenterType;
  city: string | null;
  localizationX: string | null;
  localizationY: string | null;
}
```

#### GET `/centers/{id}` — detail with nested hospitals list
#### POST `/centers` — `CreateCenterCommand` body (uses `CenterType` string)
#### PUT `/centers/{id}` — Request body with `CenterType` string
#### DELETE `/centers/{id}` — `204 No Content`

---

### Hospitals

#### GET `/hospitals`
```typescript
interface GetHospitalsQuery {
  centerId?: number;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}
// Response: PaginatedResponse<HospitalSummaryResponse>
interface HospitalSummaryResponse {
  id: number;
  name: string;
  centerId: number;
  centerName: string;
  hospitalType: HospitalType;
  city: string;
  email: string | null;
}
```

#### GET `/hospitals/{id}` — detail with nested services
#### POST `/hospitals` — `CreateHospitalCommand` body
#### PUT `/hospitals/{id}` — Request body with `HospitalType` string
#### DELETE `/hospitals/{id}` — `204 No Content`

---

### Services

#### GET `/services`
```typescript
interface GetServicesQuery {
  hospitalId?: number;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}
// Response: PaginatedResponse<ServiceSummaryResponse>

interface ServiceSummaryResponse {
  // …id, name, serviceType, specialty, capacity, restrictedLevelCount, hospitalId, hospitalName…
  /** False when this service refuses to be published over its number. True on every service of the
   *  base — a chef refusing the overrun is an act. ⚠ Mark the **rare** state only: a lock beside all
   *  148 rows says nothing. */
  allowsOverCapacity: boolean;
  /** The employee **linked** through `Service.ServiceChefId` — configuration, and what
   *  `?serviceChefId=` filters on. ⚠ Null on all 148 services of the base: a « Chef de service »
   *  column bound to it read « — » on every row while the fiche named somebody for 140 of them. */
  serviceChefName: string | null;
  /** ⚠ **Print this.** Who PGSH *names*, resolved by the same `ServiceChefDirectory` the fiche, the
   *  répartition and the stage export use — resolved over the ids of **this page**, so it costs
   *  nothing on a catalogue-wide filter. Absent from an API predating the field, and that means
   *  *unknown*, never « nobody ». */
  chefAttribution?: ServiceChefAttribution;
}
```

#### GET `/services/{id}` — includes staff, serviceChef, `chefAttribution`

⚠ **The student portal reads this same route.** It is not an admin-only endpoint: the portal's
service page used to print `serviceChef` (the link, null everywhere) and said « aucun chef de service
désigné » for services whose chef the student's own répartition names. It prints `chefAttribution`
now — with « D'après la fiche du service » under a name that comes from the undated import note, and
never a grade, a PPR or an invented « Dr. », because no `Employee` is behind such a name.
#### POST `/services` — `CreateServiceCommand` body
#### PUT `/services/{id}` — Request body with `ServiceType` string
#### DELETE `/services/{id}` — `204 No Content`

⚠ **Both bodies carry `allowsOverCapacity`, and both default it to `true` when it is absent.** The
column governs whether a publication may be forced past the service's number, and it lands on 148
services no chef has been asked about — so an omission has to read « le client n'en dit rien », never
« refuser ». Consequence for a form: **always send it**, read from `GET /services/{id}`, or saving a
service silently re-opens one its chef had closed. Same shape as the summary response that omitted
`description` and had the edit form erase it.

#### GET `/services/occupancy-report` — every service's year at once
```typescript
interface OccupancyReportRequest {
  academicYearId?: number;   // omitted → the CURRENT year, never all of them
  hospitalId?: number;
  levelId?: number;
  stageId?: number;
  onlySaturated?: boolean;
}
// Response: OccupancyReportResponse  (see types/occupancyReport.types.ts)
```

The cross-service half of the occupancy reads. `GET /services/{id}/occupancy` answers « what does
*this* service hold »; this one answers « which services are the problem », and two of its findings
exist **only** at this scale:

- `totals.servicesNeverUsed` — in scope, holding nobody all year. From a service's own page that
  looks like a service with nothing planned, which is exactly what it is; it is usually the other
  half of a saturation elsewhere.
- `stages[].servicesUnused` — a stage listing five services and placing everybody in two.

⚠ **`levelId` / `stageId` narrow which services are listed and what `share` counts — never the load a
saturation is measured on.** A service is shared, and the ceiling that refuses a publish counts every
promotion standing in it, so a filtered measurement would print « ok » for a service that is over
because of another promotion. `peakStudents` is always the whole load.

⚠ **A peak is simultaneous presence, never a sum**: one cohort of 40 passing through three windows is
40. `months[].peakStudents` is likewise the **maximum reached inside the month**, not its mean.

⚠ **`services[].saturation` is `null`, never 0, when there is no ceiling** — a service admitting
nobody would otherwise sort as the least saturated. Those rows sort **first**, above even a service
at 400 %: theirs is the one refusal publication cannot force.

`notes[]` says what the report looked for and did not find, and is **silent when the data has nothing
to say**. With no cells at all it explains that this is planning that has not started rather than a
saturation of zero — two states that call for opposite acts.

---

### Academic Years

#### GET `/academic-years`
Returns all academic years ordered by start date descending (most recent first).
```typescript
// Response: AcademicYearResponse[]
interface AcademicYearResponse {
  id: number;
  label: string;       // e.g. "2025-2026"
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isCurrent: boolean;
}
```

#### POST `/academic-years`
```typescript
interface CreateAcademicYearRequest {
  label: string;        // unique, max 20 chars
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD, must be after startDate
  isCurrent: boolean;   // if true, all other years are unmarked as current
}
// Response: 201 Created, body: id (number)
```

---

### Academic Groups

#### POST `/groups/auto-arrange`
```typescript
interface AutoArrangeGroupsRequest {
  levelId: number;
  academicYearId: number;
  groupSize: number;
}
// Response: BulkResponse<studentId (string), groupId (number)>
```

#### POST `/groups/change-student-group`

« Changement de groupe » — une **correction**, pas un transfert : l'étudiant est dans le groupe
d'arrivée et le dossier dit désormais qu'il y a toujours été.

```ts
// request
{ registrationId: string; targetGroupId: number }

// 200 — GroupChangeReport
{
  registrationId: string;
  studentName: string;
  fromGroupLabel: string;   // le SEUL endroit où le groupe d'origine est encore nommé
  toGroupLabel: string;
  affectationsMoved: number;
  affectationsCreated: number;
  periodsCreated: number;
  periodsReplaced: number;
  adHocPeriodsKept: number; // délocalisations, revalidations, historique importé
}
```

⚠ **Il n'y a pas de champ `reason`, et ce n'est pas un oubli.** L'acte *est* l'absence de trace sur la
fiche de l'étudiant : aucune ligne `HistoryType.GroupTransfer` n'est écrite, et la
`CohortMembership` ouverte est réécrite sur place au lieu d'être close et remplacée. Un motif n'aurait
nulle part où aller. Ce que l'opérateur a fait est dans le journal des actions
(`STUDENT_GROUP_CHANGED`), qui est un autre document avec un autre lecteur — et le seul endroit où le
groupe d'origine survit, l'acte n'étant pas réversible.

Refus (409), tous avant la moindre écriture :

| `title` | quand |
|---|---|
| `GroupChange.RotationsUnderway` | une période démarrée, une note ou une présence. **Non forçable** — le message nomme les quatre chiffres et renvoie vers le transfert |
| `GroupChange.NotInAGroup` | aucun groupe à corriger → `POST /groups/assign-student` |
| `GroupChange.AlreadyInTargetGroup` | déjà là |
| `GroupChange.TargetIsUnassignedRoster` | « Non réparti » ne porte aucune cohorte → « Vider le groupe » |
| `GroupChange.TargetRosterMissingStage` | le groupe d'arrivée ne fait pas un stage qu'il doit |
| `GroupChange.AlreadyAffectedInTargetCohort` | il tient déjà une affectation là (revalidation posée à la main) |
| `AcademicGroups.TargetGroupInAnotherYear` / `…InAnotherLevel` | les deux gardes de tout pointeur de roster |

`403` hors rôle administratif, `401` sans identité.

#### POST `/groups/swap-students`

Deux changements en un acte : A prend le groupe de B et B celui de A, donc les deux effectifs sont
inchangés. Les mêmes règles s'appliquent deux fois — un étudiant dont les rotations ont commencé
refuse l'échange comme il refuserait un changement simple.

```ts
// request
{ firstRegistrationId: string; secondRegistrationId: string }

// 200 — GroupSwapReport
{ first: GroupChangeReport; second: GroupChangeReport }
```

⚠ **Un seul `SaveChanges` pour les deux moitiés** : un refus sur la seconde laisse la première
exactement où elle était. Un échange à moitié fait, ce sont deux groupes de la mauvaise taille et rien
qui dise pourquoi.

Refus supplémentaires : `GroupChange.CannotSwapWithSelf`, `GroupChange.SwapWithinOneGroup`.

#### GET `/groups/placements`
« Quel groupe va déjà là où cet étudiant doit aller ? » — la lecture qui rend atteignable la réponse
la moins chère à une demande nominative. Avant elle, trouver le bon roster existant supposait de lire
la grille de planification de chaque stage à l'œil, et la voie pratique devenait donc la plus
coûteuse : créer un groupe de un ou deux étudiants.

```typescript
interface RosterPlacementsRequest {
  levelId: number;            // obligatoire — un n° de groupe sans sa promotion n'identifie rien
  academicYearId?: number;    // omis = l'année en cours, jamais « toutes »
  stageId?: number;
  serviceId?: number;         // ⚠ exclusif avec hospitalId — 400 si les deux
  hospitalId?: number;
  match?: 'Anywhere' | 'Exclusively';   // 400 si « Exclusively » sans lieu
  pageNumber?: number;
  pageSize?: number;          // défaut 25
}
```

⚠ **`summary.placedRosters` est ce qui donne son sens à une liste vide.** « Personne n'y va » et
« rien n'est encore réparti » appellent des gestes opposés, et un zéro nu se lit comme le premier.
Même forme que `RepartitionSummary.declaredSlotCount`.

⚠ **`hospitalPlacement` vient du serveur, jamais recalculé côté client.** `Unplaced` n'est pas un
détail de complétude : « toutes ses cellules sont au HMIMV » est *vrai à vide* d'un roster que
personne n'a réparti, donc un écran qui déduirait le verdict d'un décompte le ressortirait comme la
meilleure correspondance de la promotion. `matches` et `hospitalPlacement` sont `null` quand aucun
lieu n'a été nommé — à distinguer de « ne correspond pas ».

Voir `src/features/admin/types/placement.types.ts` pour la réponse complète.

#### GET `/hospitals/{hospitalId}/stage-coverage?levelId=`
La faisabilité, posée **avant** la promesse : cet hôpital peut-il accueillir toute la rotation de
cette promotion, et sinon quels stages exactement. Mesuré sur le catalogue — le HMIMV couvre les 6
stages de la 6ᵉ année, et **6 des 7** de la 5ᵉ : *Santé Publique* n'autorise qu'un service et il est
ailleurs. Sans cette lecture, cette ligne se découvre à la sixième cellule.

```typescript
type StageHospitalCoverage = 'NoServicesAuthored' | 'NotAtThisHospital' | 'Covered';
```

⚠ **`NoServicesAuthored` n'est pas un « non couvert » plus faible.** Une liste de services autorisés
vide n'est pas appliquée par le serveur : le stage est donc ouvert à *tous* les services, et le blanc
dit « personne n'a saisi la liste ». Les deux appellent des gestes opposés — changer d'hôpital, ou
saisir la liste — et les confondre envoie l'utilisateur résoudre le mauvais problème.

Volontairement **non scopée par année** : stages, services, hôpitaux et la liste des services
autorisés sont du catalogue invariant.

#### GET `/audit-log`
« Qui a fait ça, et quand ? » — la première route capable de **relire** `AuditLogs`. Trente-cinq
commandes y écrivaient depuis des mois et il n'existait ni route ni écran : la table était en
écriture seule, consultable seulement en interrogeant la base à la main.

```typescript
interface AuditLogRequest {
  action?: string;      // un code exact : PARTITIONS_ASSIGNED, GROUP_EMPTIED…
  entityType?: string;
  entityId?: string;
  from?: string;        // instant UTC ISO 8601, INCLUS
  to?: string;          // instant UTC ISO 8601, EXCLU
  pageNumber?: number;
  pageSize?: number;    // défaut 50
}
```

Réservé à `Roles.Administrative` (403 sinon).

⚠ **Des instants, jamais des jours — c'est le correctif d'un défaut mesuré le 04/09/2026.** Les
bornes étaient des `YYYY-MM-DD` que le serveur résolvait à minuit **UTC**, alors que l'écran affiche
l'heure du **navigateur** : une entrée écrite le 02/09 à 22:16 UTC se lit « 03/09 00:16 » à
Casablanca, et un filtre « du 3 au 3 » la faisait disparaître. **La journée appartient au calendrier
de celui qui lit**, donc c'est le client qui la traduit — « au 3 inclus » devient « < 4 septembre
00:00 locale », converti en UTC. Le serveur ne suppose aucun fuseau, ce qu'il ne saurait pas faire
correctement (le Maroc bascule à UTC+0 pendant le ramadan).

⚠ **`actions` est compté sur tout le journal, jamais sur la fenêtre courante.** Ce sont les valeurs
avec lesquelles on filtre : réduites au filtre actif, il n'y aurait plus de chemin de retour vers les
autres actes. `totalEntries` accompagne la page pour la même raison — il sépare « rien ne correspond
au filtre » de « le journal est vide ».

⚠ **`performedBy` peut être `null` sans que `performedByUserId` le soit**, et cela ne veut pas dire
« personne » : il n'y a aucune clé étrangère derrière l'identifiant (c'est le `sub` Keycloak), donc
le compte peut avoir été supprimé ou la base restaurée sans son royaume Keycloak. Trois états à
distinguer à l'écran — quelqu'un, « non résolu », et « système » (les deux ids nuls, un acte hors
session utilisateur).

⚠ **Un acte refusé n'écrit rien.** Le registre est la liste de ce qui a eu lieu, pas des tentatives.

Voir `src/features/admin/types/audit.types.ts`.

### Backups (points de restauration)

Tous ces appels exigent `Roles.Administrative` — sauf le `DELETE`, réservé à `SuperUser`.

#### GET `/backups/safe-point`
La lecture que fait **chaque confirmation d'acte en masse**. Elle répond même quand le service de
sauvegarde est injoignable : un statut qui 500 dans la seule situation qu'il existe pour signaler est
pire que pas de statut du tout.

```typescript
type SafePointState = 'Unavailable' | 'None' | 'SchemaChanged' | 'Stale' | 'Fresh';

interface SafePointStatus {
  state: SafePointState;
  location: string;
  unavailableReason: string | null;   // renseigné exactement quand state === 'Unavailable'
  latest: BackupPoint | null;
  ageMinutes: number | null;
  hasUsableUndo: boolean;             // ⚠ envoyé, jamais recalculé côté client
  runningMigration: string | null;
  runningGitSha: string | null;
  totalPoints: number;
  nextScheduledAtUtc: string | null;  // null = aucune planification active, à dire en toutes lettres
  keycloakRealmCovered: boolean;      // false dans cette version, et la page le dit
}
```

⚠ **`Unavailable` et `None` sont deux états, pas un écran vide commun.** « Le runner ne répond pas »
et « il n'y a aucune sauvegarde » appellent des gestes opposés.

#### GET `/backups?pageNumber&pageSize` → `PaginatedResponse<BackupPoint>`
```typescript
interface BackupPoint {
  id: string;                 // le radical du fichier : 20260903-142211-avant-reinscription
  label: string;
  kind: 'Scheduled' | 'Named' | 'PreAct';
  takenAtUtc: string;
  sizeBytes: number;
  lastMigration: string | null;
  gitSha: string | null;
  note: string | null;
  takenBy: string | null;
  verification: 'Never' | 'Listed' | 'Restored';
  verifiedAtUtc: string | null;
  schemaMatchesRunning: boolean;              // ⚠ envoyé, jamais recalculé
  census: { table: string; count: number | null }[];   // null ≠ 0
}
```
Contrairement au statut, cette liste **refuse** (500) quand l'archive est injoignable : personne n'est
au milieu d'un acte en la lisant.

#### POST `/backups` → `BackupPoint` (201)
```typescript
interface CreateBackupPointRequest {
  label: string;                              // requis, ≤ 80 — le bouton le vérifie avant l'envoi
  note?: string;                              // ≤ 500
  kind?: 'Named' | 'PreAct';                  // PreAct = pris depuis la confirmation d'un acte
}
```

#### POST `/backups/{id}/verify` → `BackupPoint`
`pg_restore -l` : prouve que l'archive n'est ni tronquée ni corrompue, et rien de plus.

#### GET `/backups/{id}/restore-plan` → `RestorePlan`
```typescript
interface RestorePlan {
  point: BackupPoint;
  schemaMatchesRunning: boolean;
  runningMigration: string | null;
  schemaStepCommand: string | null;   // le `dotnet ef database update` à passer d'abord
  restoreCommand: string;             // à lancer dans un terminal, l'AppHost arrêté
  impact: {
    table: string;
    atSafePoint: number | null;
    now: number | null;
    discarded: number | null;         // écrites depuis : ce que la restauration efface
    restored: number | null;          // disparues depuis : ce qu'elle rétablit
  }[];
  totalRowsDiscarded: number | null;
  totalRowsRestored: number | null;
  confirmationPhrase: string;         // l'id, à saisir pour confirmer
}
```
⚠ **Il n'existe aucune route qui restaure.** Un processus ne peut pas remplacer la base dont il se
sert. Et un désaccord de schéma **ne fait pas échouer** cette lecture : le refus doit pouvoir nommer
la migration à appliquer.

#### DELETE `/backups/{id}` → 204
`SuperUser` seulement, et le point **le plus récent** est refusé (409) : c'est celui que lisent toutes
les confirmations.

---

## RTK Query Integration Notes

- Tag invalidation: when a registration is updated, invalidate `["Registration", studentId]` to refetch the profile
- Optimistic updates: profile edits can be applied optimistically then rolled back on error
- Polling: avoid polling — use SignalR push for real-time updates (Phase 4)
- Cache lifetime: default 60 seconds for most queries; 0 for mutations
- The `studentId = "me"` convention maps to the `/students/me` endpoint — the RTK Query endpoint should normalize this

```typescript
// Example RTK Query tag setup
builder.query<StudentResponse, void>({
  query: () => 'students/me',
  providesTags: (result) => result ? [{ type: 'Student', id: result.id }, 'Student'] : ['Student'],
})
```
