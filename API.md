# API.md — Backend API Contract

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
interface CohortResponse {
  id: number;
  stageId: number;
  stageName: string;
  label: string;
  rotationTemplateCount: number;
  studentAssignmentCount: number;
}
```

#### GET `/stages/{stageId}/cohorts`
Returns list of cohorts for a stage.

#### POST `/cohorts` — `CreateCohortCommand` body
#### PUT `/cohorts/{id}` — `UpdateCohortCommand` body
#### DELETE `/cohorts/{id}` — `204 No Content`

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
