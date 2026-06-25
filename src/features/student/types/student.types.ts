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
  pageNumber?: number;
  pageSize?: number;
}
