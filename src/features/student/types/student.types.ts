import type { AcademicProgram, RegistrationStatus, HistoryType, Gender } from '../../../common/types';

// ─── GET /students/me  &  GET /students/{id} ──────────────────────────────────

export interface StudentResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cin: string | null;
  gender: Gender;
  civilStatus: string;
  nationalityStatus: string;
  dateOfBirth: string | null;
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

export interface StudentRegistrationSummary {
  id: string;
  academicYear: string;
  status: RegistrationStatus;
  level: LevelSummary;
}

export interface LevelSummary {
  id: number;
  label: string | null;
  year: number;
  academicProgram: AcademicProgram;
}

// ─── GET /students (paginated list) ──────────────────────────────────────────

export interface StudentSummaryResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cne: string;
  appogee: string;
  academicProgram: AcademicProgram;
  cin: string | null;
  currentLevelLabel: string | null;
  currentGroupLabel: string | null;
  currentStatus: RegistrationStatus | null;
}

// ─── GET /students/{id}/history ──────────────────────────────────────────────

export interface StudentHistoryResponse {
  id: string;
  historyType: HistoryType;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

// ─── POST /students ───────────────────────────────────────────────────────────

export interface CreateStudentRequest {
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

// ─── GET /students/{studentId}/registrations ──────────────────────────────────

export interface StudentRegistrationResponse {
  id: string;
  academicYearId: number;
  academicYear: string;
  levelId: number;
  levelLabel: string | null;
  status: RegistrationStatus;
  hasFailures: boolean;
  failureDescription: string | null;
  /**
   * How `status` was learned. Null while the year is still running — and null on every year imported
   * from the legacy base, which is why they all read « en cours ». Without it the dossier cannot tell
   * a verdict the jury pronounced from a status somebody typed into a form.
   */
  outcomeSource: import('../../../common/types').RegistrationOutcomeSource | null;
  outcomeRecordedOn: string | null;
  /** Null for a student nobody has placed yet — which is what makes joining a group possible. */
  academicGroupId: number | null;
  academicGroupLabel: string | null;
  /**
   * The CNPN that governed *this year*, which is not necessarily the one the student follows today.
   * It is what he was required to do then, so it is what an outstanding stage from that year is
   * still measured against — and it is the only thing that explains two years of one student owing
   * different sets. Falls back to his own stamp for the imported years; null when nothing is known.
   */
  cnpnVersionId: number | null;
  cnpnCode: string | null;
  /**
   * How that text was decided. `Effectivity` is the one value that says an authored rule moved him
   * mid-cursus rather than the text being carried from his intake.
   */
  cnpnSource: 'Effectivity' | 'StudentStamp' | 'CarriedForward' | 'ResolvedFromEntry' | 'Backfilled' | null;
}

// ─── GET /internship-assignments ─────────────────────────────────────────────

export interface InternshipAssignmentSummary {
  id: string;
  registrationId: string;
  studentFullName: string;
  cohortId: number;
  cohortLabel: string;
  stageId: number;
  status: import('../../../common/types').InternshipStatus;
  finalScore: number | null;
  result: string | null;
  isPaused: boolean;
}

export interface InternshipAssignmentDetail extends InternshipAssignmentSummary {
  servicePeriods: ServicePeriodSummary[];
}

export interface ServicePeriodSummary {
  id: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isComplete: boolean;
  hasEvaluation: boolean;
  isStarted: boolean;
  isPaused: boolean;
  pauseReason: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  status: import('../../../common/types').AttendanceStatus;
}

export type EvaluationMode = 'Numeric' | 'ValidatePeriod' | 'ValidateObjectives';
export type EvaluationOutcome = 'Validated' | 'NotValidated';

export interface ServiceEvaluationDetail {
  id: string;
  servicePeriodId: string;
  mode: EvaluationMode;
  totalScore: number | null;
  outcome: EvaluationOutcome | null;
  supervisorComment: string | null;
  objectiveScores: ObjectiveScoreDetail[];
}

export interface ObjectiveScoreDetail {
  id: string;
  stageObjectiveId: number;
  objectiveLabel: string;
  weight: number;
  isMandatory: boolean;
  score: number | null;
  outcome: EvaluationOutcome | null;
  note: string | null;
}

// ─── GET /services/{id} ──────────────────────────────────────────────────────

export interface StudentServiceDetailResponse {
  id: number;
  name: string;
  description: string;
  serviceType: string;
  capacity: number;
  hospitalId: number;
  hospitalName: string;
  hospitalCity: string;
  hospitalDescription: string | null;
  latitude: string | null;
  longitude: string | null;
  serviceChef: ServiceChefSummary | null;
  staff: ServiceStaffMember[];
}

export interface ServiceChefSummary {
  id: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: string;
}

export interface ServiceStaffMember {
  id: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: string;
  position: string;
}

// ─── PUT /students/{id} ───────────────────────────────────────────────────────

export type UpdateStudentRequest = CreateStudentRequest;

// ─── GET /students  query params ──────────────────────────────────────────────

export interface GetStudentsQuery {
  searchTerm?: string;
  cne?: string;
  appogee?: string;
  cin?: string;
  program?: AcademicProgram;
  // One promotion. Read together with academicYearId on the same registration server-side, so a
  // student who was in this level in an *earlier* year is not returned for the year in view.
  levelId?: number;
  // When set, the level/group/status columns reflect this year's registration.
  academicYearId?: number;
  // The verdict recorded on that year's registration. Read on the *same* registration as the level
  // and the year server-side: a student diplômé one year and re-registered the next satisfies each
  // half on a different row, and the final year is re-registered every September until the thesis
  // is defended — so that student is the ordinary case, not an edge one.
  status?: RegistrationStatus;
  pageNumber?: number;
  pageSize?: number;
}
