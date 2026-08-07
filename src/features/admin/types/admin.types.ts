import type { AcademicProgram, RegistrationStatus } from '../../../common/types';
import type { ServiceEvaluationDetail } from '../../evaluations/types/evaluation.types';

export interface AcademicYearResponse {
  id: number;
  label: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isCurrent: boolean;
}

export interface AdminLevelResponse {
  id: number;
  label: string | null;
  year: number;
  academicProgram: AcademicProgram;
}

export interface CreateAcademicYearRequest {
  label: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isCurrent: boolean;
}

export interface CreateLevelRequest {
  label: string;
  year: number;
  academicProgram: AcademicProgram;
}

export interface UpdateLevelRequest {
  label: string;
  year: number;
  academicProgram: AcademicProgram;
}

// ─── Infrastructure ───────────────────────────────────────────────────────────

export interface CenterSummaryResponse {
  id: number;
  name: string;
  centerType: string;
  city: string | null;
  x: string | null;
  y: string | null;
}

export interface CreateCenterRequest {
  name: string;
  centerType: string;
  city?: string;
  localizationX?: string;
  localizationY?: string;
  localizationZ?: string;
}

export interface HospitalSummaryResponse {
  id: number;
  name: string;
  centerId: number;
  centerName: string;
  hospitalType: string;
  city: string;
  email: string | null;
}

export interface CreateHospitalRequest {
  centerId: number;
  name: string;
  hospitalType: string;
  city: string;
  description?: string;
  email?: string;
}

export interface ServiceSummaryResponse {
  id: number;
  name: string;
  serviceType: string;
  specialty: string | null;
  capacity: number;
  hospitalId: number;
  hospitalName: string;
  serviceChefName: string | null;
  staffCount: number;
}

export interface CreateServiceRequest {
  hospitalId: number;
  name: string;
  serviceType: string;
  specialty?: string;
  capacity: number;
  description: string;
}

// ─── Stages ─────────────────────────────────────────────────────────────────

export interface StageSummaryResponse {
  id: number;
  name: string;
  coefficient: number;
  durationInDays: number;
  levelLabel: string | null;
}

export interface StageObjectiveResponse {
  label: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
}

export interface AllowedServiceSummary {
  id: number;
  name: string;
  hospitalName: string;
}

export interface StageDetailResponse {
  id: number;
  name: string;
  coefficient: number;
  description: string | null;
  durationInDays: number;
  levelResponse: AdminLevelResponse | null;
  stageObjectiveResponse: StageObjectiveResponse[];
  allowedServices: AllowedServiceSummary[];
}

export interface StageObjectiveRequest {
  label: string;
  description?: string;
  weight: number;
  isMandatory: boolean;
}

export interface CreateStageRequest {
  name: string;
  coefficient: number;
  description?: string;
  durationInDays: number;
  levelId: number;
  objectives: StageObjectiveRequest[];
}

export interface UpdateStageRequest {
  name: string;
  coefficient: number;
  description?: string;
  durationInDays: number;
  levelId: number;
  objectives: StageObjectiveRequest[];
}

export interface GetStagesParams {
  searchTerm?: string;
  levelId?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Cohorts ─────────────────────────────────────────────────────────────────

export interface CohortResponse {
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
}

export interface CohortSlotDetail {
  assignmentId: number;
  stageSlotId: number;
  periodNumber: number;
  periodLabel: string | null;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  serviceId: number;
  serviceName: string;
  hospitalName: string;
}

export interface CohortDetailResponse {
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

// ─── Stage Schedule Grid ──────────────────────────────────────────────────────

export interface StageSlotResponse {
  id: number;
  periodNumber: number;
  label: string | null;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface SlotCellResponse {
  assignmentId: number;
  stageSlotId: number;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  serviceCapacity: number;
  occupiedSeats: number;
}

export interface CohortScheduleRow {
  cohortId: number;
  cohortLabel: string;
  academicGroupId: number;
  academicGroupLabel: string;
  rotationGroup: string | null;
  studentCount: number;
  isSchedulePublished: boolean;
  cells: (SlotCellResponse | null)[];
}

export interface StageScheduleResponse {
  stageId: number;
  slots: StageSlotResponse[];
  cohorts: CohortScheduleRow[];
}

export interface CreateStageSlotRequest {
  periodNumber: number;
  label?: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface UpdateStageSlotRequest {
  label?: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface SetCohortSlotAssignmentRequest {
  serviceId: number;
}

export interface CreateCohortRequest {
  stageId: number;
  academicGroupId: number;
  label: string;
}

export interface AcademicGroupResponse {
  id: number;
  label: string;
  groupNumber: number;
  academicYearId: number;
  academicYearLabel: string;
  rotationGroup: string | null;
  levelId: number | null;
  levelLabel: string | null;
}

export interface GroupDetailResponse {
  id: number;
  label: string;
  groupNumber: number;
  geographicZone: string | null;
  rotationGroup: string | null;
  academicYearId: number;
  academicYearLabel: string;
  students: GroupStudentResponse[];
  incomingLoans: IncomingLoanResponse[];
}

export interface GroupStudentResponse {
  registrationId: string;
  studentId: string;
  fullName: string;
  cne: string;
  email: string;
  registrationStatus: RegistrationStatus;
  loanedToGroup: string | null;
  loanedStage: string | null;
}

export interface IncomingLoanResponse {
  studentId: string;
  fullName: string;
  cne: string;
  fromGroup: string;
  stage: string;
}

export type TransferType = 'Temporary' | 'Definitive';

export interface TransferStudentRequest {
  registrationId: string;
  targetGroupId: number;
  reason?: string;
  type: TransferType;
  stageId?: number;
  // Forced mid-stage hand-off: re-route the in-flight rotation to the target group's services.
  reschedule?: boolean;
}

// ─── Delocalization ────────────────────────────────────────────────────────────

export type DelocalizationOutcome = 'Validated' | 'NotValidated';

export interface DelocalizeStudentRequest {
  registrationId: string;
  stageId: number;
  serviceId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
  // Optional paper-validation verdict + fiche reference, when recorded after the student returns.
  outcome?: DelocalizationOutcome;
  ficheReference?: string;
}

// ─── Service Periods ─────────────────────────────────────────────────────────

export interface ServicePeriodResponse {
  id: string;
  internshipAssignmentId: string;
  studentFullName: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isComplete: boolean;
  hasEvaluation: boolean;
}

export interface GetServicePeriodsParams {
  assignmentId?: string;
  serviceId?: number;
  cohortId?: number;
  isComplete?: boolean;
  academicYearId?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Internship Assignments ───────────────────────────────────────────────────

export type InternshipStatus =
  | 'Planned'
  | 'Ongoing'
  | 'Completed'
  | 'Evaluated'
  | 'Validated'
  | 'Rejected'
  | 'Paused';

export type PauseKind = 'Exam' | 'Holiday' | 'Other';

export type StageAssignmentResult = 'NonÉvalué' | 'Validé' | 'NonValidé';

export interface InternshipAssignmentSummaryResponse {
  id: string;
  registrationId: string;
  studentFullName: string;
  cohortId: number;
  cohortLabel: string;
  stageId: number;
  stageName: string;
  status: InternshipStatus;
  finalScore: number | null;
  result: StageAssignmentResult | null;
  isPaused: boolean;
  allPeriodsEvaluated: boolean;
}

export interface GetAssignmentsParams {
  cohortIds?: number[];
  registrationId?: string;
  stageId?: number;
  status?: InternshipStatus;
  partitionLabels?: string[];
  periodNumber?: number;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  status: AttendanceStatus;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'JustifiedAbsent' | 'Late';

// ─── Student stage record (click-through detail on Affectations) ──────────────
// The evaluation shapes are the same contract the chef writes against, so they are owned by the
// evaluations feature and re-exported here rather than restated.
export type {
  EvaluationMode,
  EvaluationOutcome,
  ObjectiveScoreDetail as ObjectiveScoreResponse,
  ServiceEvaluationDetail as ServiceEvaluationResponse,
} from '../../evaluations/types/evaluation.types';

export interface StagePeriodRecord {
  periodId: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  startDate: string;
  endDate: string;
  isStarted: boolean;
  isComplete: boolean;
  isInterrupted: boolean;
  isDelocalized: boolean;
  mark: number | null;
  validated: boolean | null;
  evaluation: ServiceEvaluationDetail | null;
  presentCount: number;
  absentCount: number;
  justifiedAbsentCount: number;
  lateCount: number;
  attendance: AttendanceRecord[];
}

export interface StudentStageRecordResponse {
  assignmentId: string;
  registrationId: string;
  studentFullName: string;
  studentAppogee: string;
  studentCne: string;
  stageId: number;
  stageName: string;
  levelLabel: string | null;
  cohortId: number;
  cohortLabel: string;
  groupLabel: string | null;
  status: InternshipStatus;
  finalScore: number | null;
  result: StageAssignmentResult | null;
  allPeriodsEvaluated: boolean;
  periods: StagePeriodRecord[];
}

// ─── Fiche de validation ──────────────────────────────────────────────────────
export interface FicheObjective {
  label: string;
  mark: number;
}

export interface FichePeriod {
  serviceName: string;
  hospitalName: string;
  startDate: string;
  endDate: string;
  mark: number;
  objectives: FicheObjective[];
}

export interface FicheDeValidationResponse {
  studentFullName: string;
  studentAppogee: string;
  studentCne: string;
  stageId: number;
  stageName: string;
  levelLabel: string | null;
  cohortLabel: string;
  groupLabel: string | null;
  finalMark: number;
  periods: FichePeriod[];
}

export interface RecordAttendanceRequest {
  servicePeriodId: string;
  date: string;        // YYYY-MM-DD
  status: AttendanceStatus;
}

// ─── Macro plan ──────────────────────────────────────────────────────────────

export interface PartitionStagePair {
  rotationGroup: string;
  stageId: number;
}

export interface BulkCreateCohortsFromPartitionsRequest {
  academicYearId: number;
  mappings: PartitionStagePair[];
}

export interface BulkCohortsFromPartitionsResult {
  created: number;
  skipped: number;
}

export interface PartitionStagePlan {
  rotationGroup: string;
  stageId: number;
  periodNumbers: number[];
}

export interface GenerateMacroPlanRequest {
  academicYearId: number;
  plans: PartitionStagePlan[];
  assignStudents: boolean;
  autoArrange: boolean;
  publish: boolean;
  allowOverCapacity?: boolean;
}

export interface MacroPlanResult {
  cohortsCreated: number;
  cohortsSkipped: number;
  studentsAssigned: number;
  cellsArranged: number;
  saturatedServices: number;
  cohortsPublished: number;
  periodsPublished: number;
}

// ─── Stage timeline (calendar) ─────────────────────────────────────────────────

export interface TimelineGroup {
  groupId: number;
  groupLabel: string;
  groupNumber: number;
  studentCount: number;
}

export interface TimelinePauseBand {
  start: string;              // YYYY-MM-DD
  end: string | null;         // null = still paused
  kind: PauseKind;
}

export interface TimelinePartition {
  label: string | null;       // RotationGroup (A, B, C…); null = unassigned
  start: string | null;       // YYYY-MM-DD
  end: string | null;
  cohortCount: number;
  studentCount: number;
  saturated: boolean;
  groups: TimelineGroup[];
  pauses: TimelinePauseBand[];
}

export interface TimelineStage {
  stageId: number;
  stageName: string;
  start: string | null;
  end: string | null;
  slotCount: number;
  cohortCount: number;
  partitionCount: number;
  hasSaturation: boolean;
  partitions: TimelinePartition[];
}

export interface TimelineLevel {
  levelId: number;
  levelLabel: string | null;
  start: string | null;
  end: string | null;
  stages: TimelineStage[];
}

export interface YearTimelineResponse {
  academicYearId: number;
  academicYearLabel: string;
  start: string | null;
  end: string | null;
  levels: TimelineLevel[];
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export interface AutoArrangeRequest {
  levelId: number;
  academicYearId: number;
  groupSize: number;
}

export interface CreateRegistrationRequest {
  studentId: string;
  academicYearId: number;
  levelId: number;
  status?: RegistrationStatus;
}

// ─── Employees ────────────────────────────────────────────────────────────────

export type Grade    = 'MC' | 'PES' | 'PH' | 'Nurse' | 'Administrator';
export type Position = 'ServiceChef' | 'Normal';
export type WorkPlace = 'Hospital' | 'Fmpr';

export interface EmployeeSummaryResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: Grade;
  position: Position | null;
  workPlace: WorkPlace | null;
}

export interface EmployeeServiceSummary {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  isChef: boolean;
}

export interface EmployeeDetailResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cin: string | null;
  gender: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  fullAddress: string | null;
  grade: Grade;
  position: Position | null;
  workPlace: WorkPlace | null;
  ppr: string | null;
  label: string | null;
  pvSignatureDate: string | null;
  services: EmployeeServiceSummary[];
}

export interface CreateEmployeeRequest {
  email: string;
  firstName: string;
  lastName: string;
  cin?: string;
  ppr?: string;
  label?: string;
  grade: Grade;
  position?: Position;
  workPlace?: WorkPlace;
  gender: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  fullAddress?: string;
  pvSignatureDate?: string;
}

export type UpdateEmployeeRequest = CreateEmployeeRequest;

export interface GetEmployeesParams {
  searchTerm?: string;
  grade?: Grade;
  position?: Position;
  serviceId?: number;
  hospitalId?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Service detail (staff management) ───────────────────────────────────────

export interface ServiceChefSummary {
  id: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: string;
}

export interface StaffMemberResponse {
  id: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: string;
  position: string;
}

export interface ServiceDetailResponse {
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
  staff: StaffMemberResponse[];
}

