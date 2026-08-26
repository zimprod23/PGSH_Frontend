// ─── Domain enum string unions ───────────────────────────────────────────────

export type AcademicProgram = 'Medecine' | 'Pharmacie' | 'Master' | 'Doctorat';

/**
 * Where a student's academic year stands. The first two are positions the year passes through; the
 * rest are *verdicts* the faculty pronounced in deliberation.
 *
 * ⚠ `Graduated` and `Excluded` are not `Validated` and `Failed`. One ends the cursus, the other
 * repeats or advances, and the réinscription is the consumer that has to tell them apart. They were
 * added to the backend with the déliberation canvas and this union never followed, so a graduate
 * arrived typed as something he is not.
 */
export type RegistrationStatus =
  | 'Pending'
  | 'Active'
  | 'Validated'
  | 'Failed'
  | 'Withdrawn'
  | 'Graduated'
  | 'Excluded';

/** Whether a verdict was declared by the faculty or deduced by PGSH. Null while the year runs. */
export type RegistrationOutcomeSource = 'Declared' | 'Inferred';

/** The five verdicts a déliberation can pronounce, in the order a PV lists them. */
export const YEAR_OUTCOMES: { value: RegistrationStatus; label: string }[] = [
  { value: 'Validated', label: 'Admis'      },
  { value: 'Failed',    label: 'Redoublant' },
  { value: 'Excluded',  label: 'Exclu'      },
  { value: 'Graduated', label: 'Diplômé'    },
  { value: 'Withdrawn', label: 'Abandon'    },
];

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
