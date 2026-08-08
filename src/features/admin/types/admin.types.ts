import type { AcademicProgram, PaginatedResponse, RegistrationStatus } from '../../../common/types';
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

// ─── CNPN / Curriculum ───────────────────────────────────────────────────────
// The set of stages one CNPN text requires of one level. Keyed on the text, not the academic year:
// arrêté 1650.25 put two texts in force at once, so a year no longer identifies a requirement set.
// A set is still preferred to a validity window on a stage: nothing can predict when a stage ends.

/**
 * One issue of the CNPN. Every curriculum screen picks one of these where it used to pick an academic
 * year — a requirement set belongs to a ministerial text, and from 2026-2027 two texts govern the
 * same year (six-year students arriving on schedule, seven-year students repeating).
 */
export interface CnpnVersionResponse {
  id: number;
  /** The arrêté number, as cited — e.g. "1650.25". */
  code: string;
  label: string;
  academicProgram: string;
  /** 6 under arrêté 1650.25, 7 under 2174.18. */
  totalYears: number;
  reference: string | null;
  appliesToEntrantsFromAcademicYearId: number | null;
  appliesToEntrantsFromLabel: string | null;
  /** False for a text kept only for citation, which governs no intake. */
  governsAnIntake: boolean;
  levelsRecorded: number;
  studentCount: number;
}

/**
 * Recording a ministerial text. `appliesToEntrantsFromAcademicYearId` is the one place the two
 * scoping axes meet: it is an *academic year* (when) used to decide a *CNPN* (which rules) — every
 * registration from that year on is attached to this text automatically. Null records a text kept
 * for citation that governs nobody.
 */
export interface CreateCnpnVersionRequest {
  code: string;
  label: string;
  academicProgram: AcademicProgram;
  totalYears: number;
  reference?: string;
  appliesToEntrantsFromAcademicYearId?: number | null;
}

/** The programme is absent on purpose: curricula and student stamps hang off the row. */
export interface UpdateCnpnVersionRequest {
  code: string;
  label: string;
  totalYears: number;
  reference?: string;
  appliesToEntrantsFromAcademicYearId?: number | null;
}

export interface CnpnCloneResult {
  levelsCloned: number;
  stagesCopied: number;
  /** Levels the target already had; left exactly as they were. */
  levelsSkipped: number;
  /** Levels of the source that fall outside the target's span — a 7ᵉ année onto six years. */
  levelsOutsideProgramme: number;
}

/**
 * Who a CNPN binds, written as a rule. It selects students who *already exist*; future intakes are
 * covered by the version's own `appliesToEntrantsFromAcademicYearId`, so a text needs both halves.
 */
export interface CnpnTargetCriteria {
  program: AcademicProgram;
  /** "…et en dessous": every level of the programme at or below this study year. */
  maxLevelYear: number;
  /** Which year's registrations to read. Omitted → the current year. */
  asOfAcademicYearId?: number;
  /**
   * Include students the rule catches but whose first registration predates the text. Defaults to
   * excluding them — the arrêté usually says so — but it is the faculty's call, not the system's.
   */
  includeEntryContradictions: boolean;
}

export type CnpnTargetRowStatus =
  | 'WillAssign'
  | 'AlreadyOnThisText'
  | 'EntryPredatesText'
  | 'ConfirmedOnAnotherText';

export interface CnpnTargetRow {
  studentId: string;
  fullName: string;
  cne: string;
  levelLabel: string | null;
  currentCnpnCode: string | null;
  entryYearLabel: string | null;
  status: CnpnTargetRowStatus;
  message: string;
}

/** The dry run, and — after an apply — the record of what was written. Same shape both times. */
export interface CnpnTargetPreview {
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  asOfYearLabel: string;
  totalMatched: number;
  willAssign: number;
  alreadyOnThisText: number;
  entryPredatesText: number;
  confirmedOnAnotherText: number;
  canApply: boolean;
  /** Only the rows needing a decision, capped. The counts above are always the whole truth. */
  needsAttention: CnpnTargetRow[];
  needsAttentionTotal: number;
}

export interface CurriculumResponse {
  id: number;
  levelId: number;
  levelLabel: string | null;
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  totalYears: number;
  reference: string | null;
  stages: CurriculumStageResponse[];
}

export interface CurriculumStageResponse {
  stageId: number;
  stageName: string;
  /** The weight this text gives it — a CNPN can keep a stage and reweight it. */
  coefficient: number;
  durationInDays: number;
}

export type CurriculumChange = 'Unchanged' | 'Added' | 'Removed' | 'Reweighted';

export interface CurriculumComparisonResponse {
  levelId: number;
  levelLabel: string | null;
  fromCnpnVersionId: number;
  fromCnpnVersionLabel: string;
  toCnpnVersionId: number;
  toCnpnVersionLabel: string;
  hasChanges: boolean;
  entries: CurriculumDiffEntry[];
}

export interface CurriculumDiffEntry {
  stageId: number;
  stageName: string;
  change: CurriculumChange;
  fromCoefficient: number | null;
  toCoefficient: number | null;
  fromDurationInDays: number | null;
  toDurationInDays: number | null;
}

/** One line of a CNPN as submitted: the stage and the weight that text gives it. */
export interface CurriculumStageInput {
  stageId: number;
  coefficient: number;
  durationInDays: number;
}

/**
 * The whole set for one (level, CNPN) at once — never stage by stage. The server reconciles it
 * against what is stored, so a stage left out is *removed* and announced as such.
 */
export interface SaveCurriculumRequest {
  levelId: number;
  cnpnVersionId: number;
  reference?: string;
  stages: CurriculumStageInput[];
}

/** Seeds one text's requirements from another's. Refused when the target already has them. */
export interface CopyCurriculumRequest {
  levelId: number;
  cnpnVersionId: number;
  fromCnpnVersionId: number;
}

export interface CurriculumSeedReport {
  dryRun: boolean;
  curriculaCreated: number;
  stageEntriesCreated: number;
  curriculaSkippedBecauseTheyExist: number;
  details: string[];
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
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  totalYears: number;
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
  /** Periods are per (stage, year) — the same P1 exists once per promotion, with its own dates. */
  cnpnVersionId: number;
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
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  totalYears: number;
  rotationGroup: string | null;
  levelId: number | null;
  levelLabel: string | null;
  /** Roster size, so the list shows it without fetching a single student. */
  studentCount: number;
}

export interface GroupDetailResponse {
  id: number;
  label: string;
  groupNumber: number;
  geographicZone: string | null;
  rotationGroup: string | null;
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  totalYears: number;
  /** Whole roster, independent of the page being viewed. */
  studentCount: number;
  /**
   * A page of the roster. Paginated because "Non réparti" holds 4,725 students for 2025-2026 —
   * returning them all is what crashed the browser.
   */
  students: PaginatedResponse<GroupStudentResponse>;
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
  cnpnVersionId: number;
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
  cnpnVersionId: number;
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
  /**
   * Group × stage pairs the plan refused because the group's CNPN does not require that stage of
   * its level — usually a mis-ticked row in the matrix. Shown because a plan that quietly leaves
   * out a partition looks like it worked.
   */
  cohortsNotRequiredByCnpn: number;
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
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  totalYears: number;
  start: string | null;
  end: string | null;
  levels: TimelineLevel[];
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export interface AutoArrangeRequest {
  levelId: number;
  cnpnVersionId: number;
  groupSize: number;
}

export interface CreateRegistrationRequest {
  studentId: string;
  cnpnVersionId: number;
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

