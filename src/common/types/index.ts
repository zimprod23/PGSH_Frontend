// ─── Domain enum string unions ───────────────────────────────────────────────

export type AcademicProgram = 'Medecine' | 'Pharmacie' | 'Master' | 'Doctorat';

export type RegistrationStatus = 'Pending' | 'Active' | 'Validated' | 'Failed' | 'Withdrawn';

export type InternshipStatus =
  | 'Planned'
  | 'Ongoing'
  | 'Completed'
  | 'Evaluated'
  | 'Validated'
  | 'Rejected';

export type StageAssignmentResult = 'NonÉvalué' | 'Validé' | 'NonValidé';

export type AttendanceStatus = 'Present' | 'Absent' | 'JustifiedAbsent' | 'Late';

export type HistoryType =
  | 'Inscription'
  | 'ValidationStage'
  | 'NonValidation'
  | 'Fraud'
  | 'Revalidation'
  | 'GroupTransfer'
  | 'CohortTransfer'
  | 'StatusChange';

export type HospitalType = 'None' | 'Autre' | 'Spetialité' | 'Central' | 'CHU' | 'LHOMA';

export type CenterType = 'None' | 'Militaire' | 'Regional' | 'CHU';

export type ServiceType = 'Biologie' | 'Chirurgie' | 'Medical';

export type Gender = 'Male' | 'Female';

export type Grade = 'MC' | 'PES' | 'PH' | 'Nurse' | 'Administrator';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── API error — RFC 7807 ProblemDetails ─────────────────────────────────────

export interface ApiError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  extensions?: {
    errors?: Array<{ code: string; description: string }>;
  };
}

// ─── Bulk operations ─────────────────────────────────────────────────────────

export interface BulkItemResult<TId, TResult> {
  identifier: TId;
  data: TResult;
  isSuccess: boolean;
  error?: ApiError;
}

export interface BulkResponse<TId, TResult> {
  items: Array<BulkItemResult<TId, TResult>>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  hasFailures: boolean;
}

// ─── Keycloak token claims ────────────────────────────────────────────────────

export interface PGSHToken {
  sub: string;
  email: string;
  preferred_username: string;
  realm_access?: { roles: string[] };
}
