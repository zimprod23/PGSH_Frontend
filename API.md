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
| `GET /students/export` | `academicYearId?` `levelId?` `program?` `academicGroupId?` `searchTerm?` | one sheet, one row per **registration** |
| `GET /stages/assignments/export` | `academicYearId?` `levelId?` `stageId?` `academicGroupId?` `onlyEvaluated?` | three sheets: **Stages** (one row per affectation), **Périodes** (one row per période), **Synthèse** (verdicts per stage) |

- `students/export` carries `Programme` and `Niveau` as **columns**; `levelId` cuts the
  per-promotion file with the columns still in place.
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
```typescript
// Query params
interface GetStudentsQuery {
  searchTerm?: string;
  cne?: string;
  appogee?: string;
  cin?: string;
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
}
```

#### POST `/stages/{stageId}/schedule/publish`
Publishes the stage's configured, unpublished cohortes in **one** call — use this, never a loop of
`POST /cohorts/{id}/publish-schedule`.

```typescript
interface PublishStageRequest {
  academicYearId?: number;      // omitted = the current year
  partitionLabels?: string[];
  periodNumbers?: number[];
  allowOverCapacity?: boolean;  // lifts the numbers only, never an inadmissible service
}
// Response: { publishedCohorts, periodsCreated, skippedCohorts, skippedAlreadyServed }
```

⚠ **One refusal, not one per cell.** When several cells breach at once the call returns a single
`Schedule.PublishRefusedByIntake` naming how many, how many of those are the unforceable
admissibility half, and the heaviest three. A single breach keeps its own specific code
(`Schedule.CapacityExceeded`, `Schedule.LevelCapacityExceeded`, `Schedule.LevelNotAdmitted`).
Nothing is written when it refuses.

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
```

#### GET `/services/{id}` — includes staff, serviceChef
#### POST `/services` — `CreateServiceCommand` body
#### PUT `/services/{id}` — Request body with `ServiceType` string
#### DELETE `/services/{id}` — `204 No Content`

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
