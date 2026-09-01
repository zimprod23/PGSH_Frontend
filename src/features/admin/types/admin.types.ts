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

export interface UpdateAcademicYearRequest {
  id: number;
  label: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
}

export interface UpdatedAcademicYearReport {
  academicYearId: number;
  label: string;
  /** Périodes de stage that now fall outside the year's own span. Reported, never refused. */
  slotsOutsideSpan: number;
}

export interface CurrentAcademicYearReport {
  academicYearId: number;
  label: string;
  /** The year that stood down. Null when none was current. */
  previousLabel: string | null;
}

export interface DeletedAcademicYearReport {
  label: string;
  /** Empty rosters the cascade took with the year — the only thing destroyed. */
  rostersRemoved: number;
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
  z: string | null;
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
  description: string | null;
  x: string | null;
  y: string | null;
  z: string | null;
}

export interface CreateHospitalRequest {
  centerId: number;
  name: string;
  hospitalType: string;
  city: string;
  description?: string;
  email?: string;
  localizationX?: string;
  localizationY?: string;
  localizationZ?: string;
}

/**
 * One intake rule: this service takes `capacity` students of `levelId` at once.
 *
 * A service whose list is EMPTY takes every promotion up to its own `capacity` — that is the
 * unrestricted default, not an unconfigured one. Adding the first rule closes the service to every
 * level without one, so the editor must say so before saving.
 */
export interface ServiceLevelCapacity {
  levelId: number;
  capacity: number;
}

export interface ServiceLevelCapacityResponse extends ServiceLevelCapacity {
  levelLabel: string | null;
  levelYear: number;
  academicProgram: AcademicProgram;
}

export interface ServiceSummaryResponse {
  id: number;
  name: string;
  serviceType: string;
  specialty: string | null;
  capacity: number;
  /** 0 = no intake rules, i.e. open to every promotion. */
  restrictedLevelCount: number;
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
  localizationX?: string;
  localizationY?: string;
  localizationZ?: string;
  levelCapacities?: ServiceLevelCapacity[];
}

// ─── Stages ─────────────────────────────────────────────────────────────────

/**
 * How a stage spends the several périodes it occupies on the rotation axis.
 * `PerPeriod` — one service per période, one evaluation each (S1 → S2 → …).
 * `SingleService` — one service for the whole run, one evaluation.
 * The axis is identical either way; only the service assignment and the number of marks differ.
 */
export type StageRotationMode = 'PerPeriod' | 'SingleService';

/**
 * What one CNPN's requirement set states of a stage, beside what the catalogue states.
 *
 * ⚠ The catalogue's `coefficient` / `durationInDays` are duplicated by every text's requirement
 * set, and since arrêté 1650.25 landed they no longer agree: MED3 Chirurgie reads coefficient 3 in
 * the catalogue and 1 in 1650.25, 30 j.o. in the catalogue and 66 in 2174.18's. Neither is wrong —
 * a 5ᵉ année student revalidating a 3ᵉ année credit is still under the older text — so the page
 * names where each number comes from instead of presenting the catalogue's as the answer.
 */
export interface StageTextFigure {
  cnpnVersionId: number;
  cnpnCode: string;
  levelLabel: string;
  coefficient: number;
  durationInDays: number;
}

export interface StageSummaryResponse {
  id: number;
  name: string;
  coefficient: number;
  durationInDays: number;
  levelLabel: string | null;
  rotationMode: StageRotationMode;
  /** Empty when no CNPN mentions the stage — which is not the same as a text stating zero. */
  textFigures: StageTextFigure[];
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
  rotationMode: StageRotationMode;
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
  rotationMode: StageRotationMode;
}

export interface UpdateStageRequest {
  name: string;
  coefficient: number;
  description?: string;
  durationInDays: number;
  levelId: number;
  objectives: StageObjectiveRequest[];
  rotationMode: StageRotationMode;
}

export interface UnpublishScheduleResult {
  periodsRemoved: number;
  evaluationsLost: number;
  attendanceDaysLost: number;
  /** Periods no cell produced — imported history, délocalisations, revalidations. Never removed. */
  adHocPeriodsKept: number;
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

/**
 * « Ce texte régit tel niveau à partir de telle année » — the second half of who a CNPN binds,
 * alongside the intake year on the text itself.
 *
 * Intake governs the promotion arriving; these govern the promotions already in the building, which
 * is what « la 3ᵉ année de 2026-2027 et en dessous » actually means. « et en dessous » is authored as
 * one row per level, not as a comparison: stored as a comparison it would have to be re-evaluated to
 * be read, and a level added later would silently change which promotions a published text binds.
 */
export interface CnpnEffectivityResponse {
  id: number;
  cnpnVersionId: number;
  cnpnVersionCode: string;
  cnpnVersionLabel: string;
  academicProgram: string;
  levelId: number;
  levelLabel: string;
  levelYear: number;
  fromAcademicYearId: number;
  fromAcademicYearLabel: string;
  note: string | null;
  recordedOn: string;
  /**
   * How many registrations already carry this text at this level from this year on. Zero right after
   * authoring is normal — the rule fires as registrations are created, not retroactively.
   */
  registrationsGoverned: number;
}

export interface CreateCnpnEffectivityRequest {
  levelId: number;
  fromAcademicYearId: number;
  note?: string;
}

export type CnpnEffectivityRowStatus = 'WillMove' | 'AlreadyGoverned' | 'FrozenByOutcome';

export interface CnpnEffectivityRow {
  registrationId: string;
  studentId: string;
  studentFullName: string;
  cne: string | null;
  academicYearLabel: string;
  currentCnpnCode: string | null;
  status: CnpnEffectivityRowStatus;
  message: string;
}

/**
 * What re-stamping the registrations that *already exist* would do — only ever needed when the rule
 * was authored after the réinscription had run. `frozenByOutcome` cannot be forced: the verdict was
 * recorded against a requirement set, and moving that set afterwards makes it unreadable.
 */
export interface CnpnEffectivityApplyPreview {
  effectivityId: number;
  cnpnVersionCode: string;
  levelLabel: string;
  fromAcademicYearLabel: string;
  inScope: number;
  alreadyGoverned: number;
  willMove: number;
  frozenByOutcome: number;
  studentsMoved: number;
  canApply: boolean;
  sample: CnpnEffectivityRow[];
  sampleTotal: number;
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
  // A cohort is year-constituted (group × stage, and groups exist per year). It carries no CNPN
  // version — that lives on the student. These four were `cnpnVersionId/Code/Label/totalYears`,
  // which the endpoint has never returned, so they read `undefined` at runtime.
  academicYearId: number;
  academicYearLabel: string;
  rotationGroup: string | null;
  /**
   * The columns of the axis this cohorte stands in. Read here rather than folded out of the planning
   * grid, which only carried it while it shipped every cohorte and every cell.
   */
  periodNumbers: number[];
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

/**
 * `capacity` / `occupiedSeats` are the ONE limit governing this cell and the load measured against
 * it — never two competing numbers, because quotas replace a service's total rather than sitting
 * under it. `isLevelQuota` says which rule is in force, and therefore what the numbers count:
 *  - `true`  — the quota granted to this stage's promotion, against that promotion's students alone.
 *  - `false` — the service's own total, against every promotion sharing it over these dates.
 */
export interface SlotCellResponse {
  assignmentId: number;
  stageSlotId: number;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  capacity: number;
  occupiedSeats: number;
  isLevelQuota: boolean;
  /** False when the service refuses this promotion outright — publish will reject the cell. */
  admitsLevel: boolean;
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

/** One rotation partition of the promotion, and how many of this stage's cohorts carry it. */
export interface PartitionSummary {
  label: string;
  cohortCount: number;
}

/**
 * Why a (créneau × service) will refuse the publish. Named by the server rather than inferred from
 * the numbers, because the three are fixed in different places: move groups, raise the promotion's
 * quota, or raise the service's own capacity.
 */
export type SaturationReason = 'Total' | 'Quota' | 'Refused';

/**
 * One (créneau × service) the publish would refuse — deduplicated, because it is a fact about the
 * pair and not about each cohorte standing in it.
 */
export interface SaturatedCellResponse {
  stageSlotId: number;
  periodNumber: number;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  occupiedSeats: number;
  capacity: number;
  reason: SaturationReason;
}

/**
 * What is true of the whole selection, whichever page is on screen.
 *
 * ⚠ Every number here is the server's. Counting the rows the client holds was correct only while it
 * held all of them; against a page of 25 it would report "3 configurées" on a stage with 90, and the
 * publish button beside it would promise to publish 3. `partitions` is deliberately NOT narrowed by
 * the active partition filter — they are the chips the user filters *with*.
 */
export interface StageScheduleSummary {
  totalCohorts: number;
  publishedCohorts: number;
  configuredUnpublishedCohorts: number;
  partitions: PartitionSummary[];
  /** Exact, even when `saturations` below is capped. */
  saturatedCellCount: number;
  saturations: SaturatedCellResponse[];
  /** The columns the current selection already occupies — what separates a new column from an arranged one. */
  occupiedSlotIds: number[];
  /**
   * Which partition stands in which column, across the WHOLE stage — never narrowed by the active
   * filter, because « la partition A est-elle seule sur P4-P6 ? » is a question about the partitions
   * the filter has just removed.
   */
  partitionUsage: PartitionSlotUse[];
}

export interface PartitionSlotUse {
  rotationGroup: string | null;
  stageSlotId: number;
}

export interface StageScheduleResponse {
  stageId: number;
  slots: StageSlotResponse[];
  cohorts: PaginatedResponse<CohortScheduleRow>;
  summary: StageScheduleSummary;
}

// ─── Répartition annuelle des stages ──────────────────────────────────────────
// The table the faculty publishes: the schedule grid turned a quarter. Rows are
// (stage, service) across the whole level, columns are the level's periods, cells
// are collapsed group-number ranges. Planning only — no marks, no execution state.

export interface RepartitionColumn {
  index: number;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface RepartitionCell {
  slotId: number;
  periodNumber: number;
  /** Already collapsed server-side: "47-50", "47-48, 50", "27". */
  groups: string;
  groupNumbers: number[];
  /**
   * The partition sitting in this cell, or null when its cohorts disagree.
   *
   * ⚠ **Not printed.** A partition is scolarité's internal division for building the rotation; the
   * reader of the published document is a student looking for his own group, to whom it explains
   * nothing he can act on. The document colours by *stage*, which is what he navigates by. The
   * partition is still shown where it is actionable — `ScheduleGridModal`, `AssignmentsPage`.
   *
   * ⚠ It is a fact about the *cell* and nothing larger, which is why it is sent per cell. It used
   * to sit on the row, where it could only mean "the partition the row opens on": with two
   * partitions every Médecine row opens on A and every Chirurgie row on B, so the document printed
   * one colour per **stage** under a legend reading « Partition A / Partition B ». A row visits
   * every partition over the year — that is what the crossover is.
   */
  rotationGroup: string | null;
}

export interface RepartitionRow {
  stageId: number;
  stageName: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  chefName: string | null;
  /**
   * True when `chefName` came off the legacy « Responsable (source) » note in the service
   * description rather than a chef linked to the service. Printed the same either way — the flag
   * only drives a hint in the app that linking a real chef makes the attribution dated.
   */
  chefIsFromSourceNote: boolean;
  /** Aligned 1:1 with the columns; null is a period with nothing planned. */
  cells: (RepartitionCell | null)[];
}

export interface RepartitionSummary {
  rowCount: number;
  columnCount: number;
  plannedCells: number;
  emptyCells: number;
  groupCount: number;
  /**
   * Periods authored for this level and year, arranged or not. An empty table has two causes calling
   * for opposite actions — no periods at all (0: go and lay an axis), or periods nobody has been
   * placed in (> 0: go and arrange) — and `rowCount` alone collapses them.
   */
  declaredSlotCount: number;
}

export interface LevelRepartitionResponse {
  levelId: number;
  levelLabel: string | null;
  levelYear: number;
  program: AcademicProgram;
  academicYearId: number;
  academicYearLabel: string;
  columns: RepartitionColumn[];
  rows: RepartitionRow[];
  summary: RepartitionSummary;
}

export interface CreateStageSlotRequest {
  /**
   * Periods are per (stage, **year**) — the same P1 exists once per promotion, with its own dates.
   * This said `cnpnVersionId` while the endpoint has always bound `AcademicYearId`; the name was
   * borrowed from the curriculum routes, which really are keyed by CNPN version. Slots are not.
   */
  academicYearId: number;
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
  /** A roster is year-constituted — remove the year and it is not a roster. Never CNPN-keyed. */
  academicYearId: number;
  academicYearLabel: string;
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
  academicYearId: number;
  academicYearLabel: string;
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
  /** The promotion being planned. `GenerateMacroPlanCommand` binds `AcademicYearId`. */
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
  /**
   * Group × stage pairs the plan refused because the group's CNPN does not require that stage of
   * its level — usually a mis-ticked row in the matrix. Shown because a plan that quietly leaves
   * out a partition looks like it worked.
   */
  cohortsNotRequiredByCnpn: number;
  /**
   * Cells the arranger declined because the group was already placed in an overlapping period of
   * another stage — the plan's partitions were authored to collide. Shown for the same reason as
   * the line above: a stage that arranged nothing otherwise looks like it had nothing to do.
   */
  groupConflicts: number;
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
  /** Groups are arranged within one promotion — `AutoArrangeGroupsCommand` binds `AcademicYearId`. */
  academicYearId: number;
  groupSize: number;
}

export interface CreateRegistrationRequest {
  studentId: string;
  /** A registration links student ↔ year ↔ level; the CNPN version is derived, never posted. */
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
  specialty: string | null;
  capacity: number;
  hospitalId: number;
  hospitalName: string;
  hospitalCity: string;
  hospitalDescription: string | null;
  /** The service's own coordinates when it has them, the hospital's otherwise. */
  localizationX: string | null;
  localizationY: string | null;
  localizationZ: string | null;
  /** False when the coordinates above are the hospital's — never save those back as the service's own. */
  hasOwnLocalization: boolean;
  serviceChef: ServiceChefSummary | null;
  levelCapacities: ServiceLevelCapacityResponse[];
  staff: StaffMemberResponse[];
  /** Every tenure, newest first. The only *dated* answer to "who led this service" — which is what
   *  lets a répartition reprinted years later name the chef it was published under. */
  chefHistory: ChefTenureResponse[];
  /** The name in the legacy « Responsable (source) » note, when there is one — 140 of 148 services
   *  have only this. ⚠ Undated: it says who the Access base last recorded, not who led the service
   *  on any given date, so it must never be presented as a configured chef. */
  chefFromSourceNote: string | null;
}

export interface ChefTenureResponse {
  employeeId: string;
  firstName: string;
  lastName: string;
  grade: string;
  startDate: string;
  /** Null while this is the sitting tenure. */
  endDate: string | null;
}

// ── Service occupancy ─────────────────────────────────────────────────────────────────────────────
// What a service actually holds, day by day, across every stage and promotion at once.
//
// ⚠ The timeline is *segmented*, not one row per période. Nothing ties two stages' periods together —
// StageSlot is keyed (stage, year, number) — so Chirurgie P1 and ANES REA P1 have independent dates
// and legitimately different lengths. One row per slot shows each slot's own cohorts, while the
// students standing in the service on a given morning are the union of every window covering that
// day: the peak lives in the overlap and a per-slot list never shows it.

/** How the service states its limit. See the backend's `Service.CapacityFor`. */
export type CapacityRule =
  /** No quota authored: one ceiling, counted across every promotion at once. */
  | 'Total'
  /** Quotas authored: each promotion against its own, and `capacity` is not consulted at all. */
  | 'PerLevel';

export interface ServiceOccupancyResponse {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  academicYearId: number;
  academicYearLabel: string;
  rule: CapacityRule;
  /** ⚠ Dead data when `rule` is 'PerLevel' — quotas replace it rather than sitting under it. */
  totalCapacity: number;
  quotas: LevelQuotaResponse[];
  segments: OccupancySegmentResponse[];
  summary: OccupancySummaryResponse;
}

export interface LevelQuotaResponse {
  levelId: number;
  levelLabel: string;
  capacity: number;
}

export interface OccupancySegmentResponse {
  startDate: string;
  endDate: string;
  days: number;
  students: number;
  /** Null on a restricted service: there is no single ceiling then, only one per promotion. */
  capacity: number | null;
  /** Students over the limit, summed over whichever limits are in force. 0 when within. */
  overflow: number;
  levels: SegmentLevelLoadResponse[];
  occupants: SegmentOccupantResponse[];
}

export interface SegmentLevelLoadResponse {
  levelId: number;
  levelLabel: string;
  students: number;
  capacity: number | null;
  overflow: number;
  /** The service has quotas and none names this promotion — they may not be here at all, which is a
   *  different fault from being over a quota and needs a different fix. */
  notAdmitted: boolean;
}

export interface SegmentOccupantResponse {
  stageId: number;
  stageName: string;
  levelId: number;
  levelLabel: string;
  periodNumber: number;
  /** Collapsed the way the répartition prints them: "47-50", "47-48, 50". */
  groupNumbers: string;
  cohortCount: number;
  students: number;
}

export interface OccupancySummaryResponse {
  segmentCount: number;
  overCapacitySegments: number;
  peakStudents: number;
  peakStart: string | null;
  peakEnd: string | null;
  distinctStages: number;
  distinctLevels: number;
  daysOverCapacity: number;
}

export interface ServiceStageResponse {
  stageId: number;
  stageName: string;
  levelId: number;
  levelLabel: string;
  capacity: number;
  /** The stage lists this service, but the service's quotas do not admit the stage's promotion — so
   *  auto-arrange drops it and publish would refuse. A contradiction invisible from either side. */
  notAdmitted: boolean;
}

export interface ServiceOccupantResponse {
  studentId: string;
  firstName: string;
  lastName: string;
  cne: string | null;
  stageId: number;
  stageName: string;
  levelLabel: string;
  groupNumber: number;
  groupLabel: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
}

// ── Rotation cycle ────────────────────────────────────────────────────────────────────────────────
// A block of stages that run concurrently on one shared axis. See the backend's RotationCyclePlanner:
// T = Σkₛ columns, and stage s holds Lₛ = P·kₛ/T partitions at once.

export interface RotationStageInput {
  stageId: number;
  /** Columns a partition spends here — i.e. how many *different services* it passes through. */
  periods: number;
}

export interface DateWindowInput {
  startDate: string;
  endDate: string;
}

export interface RotationCycleRequest {
  stages: RotationStageInput[];
  /** The axis at its finest granularity, entered once for the whole block. */
  windows: DateWindowInput[];
  academicYearId?: number;
}

export interface RotationColumn {
  number: number;
  startDate: string;
  endDate: string;
}

export interface StageTiling {
  stageId: number;
  periods: number;
  slotCount: number;
  /** How many partitions sit in this stage at the same time. */
  concurrency: number;
}

export interface RotationCycleLayout {
  timeline: number;
  /** The partition count this block needs a multiple of. */
  partitionStep: number;
  columns: RotationColumn[];
  stages: StageTiling[];
  matrix: PartitionStagePlan[];
  warnings: string[];
}

/**
 * What one stage of the block actually gets, measured on the calendar, against the duration its catalogue
 * row states. A range because partitions take *different* runs of the axis — a run over février is
 * genuinely shorter than one over mars, which is a fact about calendars, not a defect.
 */
export interface StageDurationCheck {
  stageId: number;
  name: string;
  periods: number;
  /** ⚠ `Stage.DurationInDays` — the catalogue's number, not necessarily what any CNPN states. */
  statedDurationInDays: number;
  minWorkingDays: number;
  maxWorkingDays: number;
  minCalendarDays: number;
  maxCalendarDays: number;
  /** Set only when the gap deserves a human look. Never blocking. */
  note: string | null;
}

export interface RotationCyclePreview {
  academicYearLabel: string;
  levelLabel: string;
  stages: { stageId: number; name: string; durationInDays: number }[];
  layout: RotationCycleLayout;
  existingSlots: number;
  publishedCells: number;
  /**
   * Planned, unpublished cells hanging off those slots. Not an obstacle — but they cascade with the
   * slots, so applying destroys them and the number belongs on screen before the click.
   */
  plannedCells: number;
  canApply: boolean;
  durationChecks: StageDurationCheck[];
  /** No holiday recorded across the axis, so every count is calendar days minus weekends. */
  calendarIsEmpty: boolean;
}

export interface RotationCycleResult {
  slotsCreated: number;
  slotsReplaced: number;
  /** Planned cells the replaced slots took with them. An arrange rebuilds them from `matrix`. */
  plannedCellsRemoved: number;
  layout: RotationCycleLayout;
  matrix: PartitionStagePlan[];
}

/** Removing a block is its own act: replacing an axis is not undoing one. */
export interface DeleteRotationCycleResult {
  slotsRemoved: number;
  /** Unlike a replacement's, these cells have no matrix left to be rebuilt from. */
  plannedCellsRemoved: number;
}

// ── Reading a block back ──────────────────────────────────────────────────────────────────────────
// Reopening the screen has to show the block that is actually in force. It is read from the axis on
// disk — stages whose slots carry the same windows *are* a block — rather than from the last request,
// so a date corrected afterwards on a stage's own grid shows through instead of being papered over.

/** How `periods` was learned. « 1 période » deduced from an empty grid is not « 1 période » authored. */
export type RotationPeriodsSource = 'Authored' | 'Derived' | 'Unknown';

export interface RotationBlockStage {
  stageId: number;
  name: string;
  periods: number;
  periodsSource: RotationPeriodsSource;
}

export interface RotationBlockConfiguration {
  /** In the order they were authored — the order partition A walks the block in. */
  stages: RotationBlockStage[];
  windows: DateWindowInput[];
  columns: number;
  /** Null when no apply is on record: an axis built stage by stage, or laid before this was kept. */
  appliedAt: string | null;
  /** Non-zero means the block can no longer be redefined. */
  publishedCells: number;
}

export interface RotationCycleConfiguration {
  levelId: number;
  levelLabel: string;
  academicYearId: number;
  blocks: RotationBlockConfiguration[];
}

// ── Axis generation ───────────────────────────────────────────────────────────────────────────────
// Laying the axis out from one start date is a *server* call: the working-day count needs the holiday
// table, which the browser does not have. Doing it here with setUTCMonth was right for calendar months
// and silently wrong the moment a duration means jours ouvrables.

export type AxisColumnUnit = 'Months' | 'Weeks' | 'WorkingDays';

export interface GeneratedAxisColumn {
  number: number;
  startDate: string;
  endDate: string;
  calendarDays: number;
  workingDays: number;
  holidays: string[];
  /** A lunar date inside can still move, so the window may have to be reprinted. */
  hasProvisionalDates: boolean;
}

export interface GeneratedAxisResponse {
  columns: GeneratedAxisColumn[];
  workingDaysTotal: number;
  calendarDaysTotal: number;
  calendarIsEmpty: boolean;
  missingReligious: string[];
  warnings: string[];
}

export interface GenerateAxisWindowsRequest {
  columns: number;
  startDate: string;
  unit: AxisColumnUnit;
  length: number;
}

// ── Partitions ────────────────────────────────────────────────────────────────────────────────────

export type PartitionStrategy = 'Interleaved' | 'Contiguous';

export interface PartitionMembership {
  label: string;
  groupCount: number;
  /** Printed the way the répartition prints a cell: `1, 3, 5, 7` or `1-40`. */
  groupNumbers: string;
}

export interface PartitionAssignmentResult {
  labeled: number;
  reassigned: number;
  totalGroups: number;
  /** Cells planned on the *previous* cut — untouched, but an arrange is owed. */
  plannedCellsAffected: number;
  partitions: PartitionMembership[];
}

export interface ClearRotationGroupsResult {
  cleared: number;
  totalGroups: number;
  plannedCellsAffected: number;
}

/**
 * How one promotion is currently divided — counted over the whole promotion, not over a page of it.
 * ⚠ Every field here was previously derived in the browser from a 200-row page of `/groups`.
 */
export interface PromotionPartitioning {
  academicYearId: number;
  totalGroups: number;
  labelledGroups: number;
  unlabelledGroups: number;
  /** Collapsed the way the répartition prints a cell: `3, 12, 21` or `41-60`. */
  unlabelledGroupNumbers: string;
  partitions: PartitionMembership[];
}

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────

export type HolidayKind = 'National' | 'Religious' | 'Academic';

export interface Holiday {
  id: number;
  startDate: string;
  endDate: string;
  dayCount: number;
  name: string;
  kind: HolidayKind;
  /** Lunar dates are announced by decree; until then the row is an estimate. */
  isConfirmed: boolean;
  /** Worked days it actually costs — zero for a holiday landing on a weekend. */
  workingDaysLost: number;
}

export interface HolidayCoverage {
  academicYearId: number;
  academicYearLabel: string;
  from: string;
  to: string;
  calendarDays: number;
  workingDays: number;
  nationalDays: number;
  religiousDays: number;
  academicDays: number;
  provisionalCount: number;
  /** Religious holidays with no row yet — PGSH cannot compute these. */
  missingReligious: string[];
  holidays: Holiday[];
}

export interface HolidayInput {
  startDate: string;
  endDate: string;
  name: string;
  kind: HolidayKind;
  isConfirmed: boolean;
}

export interface SeedNationalHolidaysResult {
  academicYearLabel: string;
  created: number;
  alreadyPresent: number;
  missingReligious: string[];
}

export interface DeleteHolidayResult {
  name: string;
  startDate: string;
  /** Slots whose window was laid *over* this holiday — their dates stay, but no longer reproduce. */
  slotsSpanning: number;
}

export interface UpdateHolidayResult {
  name: string;
  startDate: string;
  /** False when only the name, kind or confirmation flag changed — no window's day count moves. */
  datesMoved: boolean;
  /** Slots over the span it left *or* the span it arrived at, counted once. 0 when `datesMoved` is false. */
  slotsSpanning: number;
}

/**
 * What re-opening a stage for one registration would mean.
 *
 * ⚠ `proposedWindow` is laid from `governingText.durationInDays` — the requirement set of the text
 * governing **this registration** — and is null when no text states one. It is never taken from
 * `catalogueDurationInDays`: every student who reaches this dialog is on an older text by
 * construction, so the catalogue is wrong for precisely this population. Both figures travel so the
 * screen can show the disagreement instead of picking a winner.
 */
export interface RevalidationContextResponse {
  registrationId: string;
  stageId: number;
  stageName: string;
  stageLevelId: number;
  stageLevelLabel: string | null;
  /** Decided by the same rules the command applies, so the dialog cannot offer a refused act. */
  canOpen: boolean;
  refusalCode: string | null;
  refusalMessage: string | null;
  governingText: RevalidationText | null;
  catalogueDurationInDays: number;
  catalogueCoefficient: number;
  lastFailure: RevalidationPriorAttempt | null;
  proposedWindow: RevalidationWindow | null;
  cohorts: RevalidationCohortOption[];
}

export interface RevalidationText {
  cnpnVersionId: number;
  code: string;
  label: string;
  source: string | null;
  /** True when the stamp was read off the registration rather than the student's current one. */
  fromRegistration: boolean;
  /** False when the text records no requirement for this stage — ordinary, and not the same as zero. */
  statesThisStage: boolean;
  durationInDays: number | null;
  coefficient: number | null;
}

export interface RevalidationPriorAttempt {
  registrationId: string;
  academicYearId: number;
  academicYearLabel: string;
  serviceId: number | null;
  serviceName: string | null;
  startDate: string | null;
  endDate: string | null;
  /** The only figure here that is neither a catalogue value nor a text value. */
  workingDaysServed: number | null;
}

export interface RevalidationWindow {
  start: string;
  end: string;
  workingDays: number;
  calendarDays: number;
  hasProvisionalDates: boolean;
  holidaysHit: string[];
}

export interface RevalidationCohortOption {
  cohortId: number;
  academicGroupId: number;
  groupLabel: string | null;
  groupNumber: number;
  rotationGroup: string | null;
}

export interface RevalidationContextParams {
  registrationId: string;
  stageId: number;
  from?: string;
}

export interface RevalidateStageRequest {
  registrationId: string;
  stageId: number;
  cohortId?: number;
  serviceId?: number;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

