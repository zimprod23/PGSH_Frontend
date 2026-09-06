import type { AcademicProgram, PaginatedResponse, RegistrationStatus } from '../../../common/types';
import type {
  EvaluationMode,
  ObjectiveScoreDto,
  ServiceEvaluationDetail,
} from '../../evaluations/types/evaluation.types';

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
  /**
   * Whether « autoriser le dépassement d'effectif » may lift this service's number when a plan is
   * published. **True unless somebody has said otherwise**, which is every service of the base — a
   * chef refusing the overrun is an act, and the flag is that act.
   */
  allowsOverCapacity: boolean;
  /**
   * A place the faculty does not run — a CHU in another region, a private clinic. It cannot be used
   * in a rotation and has no capacity worth reading; students reach it only through a
   * délocalisation. **False on every service of the base** until somebody creates one.
   */
  isExternal: boolean;
  /** 0 = no intake rules, i.e. open to every promotion. */
  restrictedLevelCount: number;
  hospitalId: number;
  hospitalName: string;
  /** The employee **linked** through `Service.ServiceChefId` — configuration, and the column this
   *  list filters by. ⚠ It is null on all 148 services of the base, which is why a « Chef de
   *  service » column bound to it read « — » on every row while the fiche and the répartition named
   *  somebody for 140 of them. Print `chefAttribution` instead. */
  serviceChefName: string | null;
  staffCount: number;
  /** ⚠ **Print this, never re-rank the sources here.** Resolved server-side by the same
   *  `ServiceChefDirectory` the fiche, the répartition and the stage export use. Absent only from an
   *  API predating this change, and that means **unknown** — never « the link ». */
  chefAttribution?: ServiceChefAttribution;
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
  /**
   * ⚠ **Always send it on an update.** The command defaults it to true when absent, so a form that
   * omits it silently re-opens a service its chef had closed — the same shape as the summary
   * response that omitted `description` and had the edit form erase it. The form reads it from the
   * detail, which states it.
   */
  allowsOverCapacity?: boolean;
  /**
   * Whether this is a place the faculty does not run. ⚠ On an **update**, omitting it means
   * « unchanged » server-side — deliberately unlike `allowsOverCapacity`, because pulling an
   * external service back into the rotation while students already stand on it is not a default
   * anybody would want. The form still sends it, read from the detail.
   */
  isExternal?: boolean;
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
  /**
   * Position in the rotation queue, 1-based — a planning fact, not a display preference.
   * `RotationArranger` emits each service's block of the queue consecutively and the first période
   * takes phase 0, so the service ranked 1 receives the first run of group numbers.
   * 0 means nobody has authored an order for this stage; the arranger then falls back to id order.
   */
  rank: number;
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
  /**
   * Whether THIS cell has been materialised into périodes — narrower than the row's
   * `isSchedulePublished`, and the only flag that says whether this cell may still be moved.
   *
   * ⚠ Resolved server-side from the coverage table, never from `ServicePeriod.CohortSlotAssignmentId`:
   * that key names only the FIRST cell of a run, so under `SingleService` the trailing cells of a
   * published run have nothing pointing at them — measured on Gynécologie Obstétrique 2026-2027, 363
   * cells of which the key names 121.
   */
  isPublished: boolean;
}

export interface CohortScheduleRow {
  cohortId: number;
  cohortLabel: string;
  academicGroupId: number;
  academicGroupLabel: string;
  rotationGroup: string | null;
  /** The cohorte's membership, délocalisés included — they are still members. */
  studentCount: number;
  /**
   * How many of them serve this stage outside the faculty, and therefore occupy none of the services
   * on this row's cells. ⚠ **Say it on screen.** The cells are measured on
   * `studentCount - delocalizedCount`, so a roster délocalisé en masse shows a full membership beside
   * cells loading nothing — which reads as a bug, and the next person re-arranges everyone back into
   * the CHU. 0 is the ordinary case.
   */
  delocalizedCount: number;
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
  /**
   * Whether « autoriser le dépassement d'effectif » would let this cell through. False for
   * `Refused`, and false on a service whose chef has refused the override.
   *
   * ⚠ **Not derivable from `reason`** — the numbers of a firm service and of a permissive one are
   * identical, and only the service says which. Sent by the server for the reason
   * `ServicePeriodResponse.state` is: one rule, two sides of a network boundary. Absent only from an
   * API predating this change, where the honest reading is the old behaviour, i.e. forceable.
   */
  forceable?: boolean;
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
  /**
   * Columns authored for this stage and year, arranged into or not — what separates « rien n'est
   * réparti » from « aucun axe n'existe ici ». Never narrowed by the partition filter.
   */
  declaredSlotCount: number;
  /**
   * Périodes recorded for this stage and year, whatever their origin — and `null` when the question
   * was not put, which is every grid that has an axis. ⚠ Null, never 0: « aucune période » is an
   * answer and « on n'a pas regardé » is not.
   */
  servedPeriodCount: number | null;
  /**
   * Why the table is empty, in the server's own words — and `null` as soon as one cell exists.
   *
   * ⚠ Never re-derived here. From 2017-2018 to 2025-2026 the base holds 105 626 périodes for 0
   * créneau (the Access import carried the rotations served, not a grid), so a past year shows an
   * empty table while every dossier shows its périodes; « rien n'est réparti » and « cette année n'a
   * jamais été planifiée ici » call for opposite acts, and one of them is laying an axis over a year
   * that finished. One rule, one side of the boundary — as with `servicePeriodResponse.state`.
   */
  emptyGridNote: string | null;
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
  /**
   * The promotion this roster belongs to — a roster is keyed (year, level, number), so this is half
   * of its identity. ⚠ **Every « quel autre groupe ? » picker scopes on it**, server-side. They used
   * to derive it by looking the current roster up in the options list, which asks for 200 of the
   * 1 003 rosters — past that page the promotion came back null and the pickers offered every group
   * of the year. Null when the roster carries no level at all (inferred rosters may not).
   */
  levelId: number | null;
  levelLabel: string | null;
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

// ─── Changement de groupe ──────────────────────────────────────────────────────

/**
 * A correction, not a transfer: the student is in the target roster and the record now says he
 * always was.
 *
 * ⚠ There is no `reason` field and that is deliberate — the whole act is the absence of a trace on
 * the student's file, so a motif would have nowhere to go. What the operator did is in the journal
 * des actions, which is a different document with a different reader.
 */
export interface ChangeStudentGroupRequest {
  registrationId: string;
  targetGroupId: number;
  /** Client-side only, for cache invalidation. */
  studentId?: string;
  /**
   * Client-side only. ⚠ The roster the student is leaving — known to the caller and to nobody else,
   * since the request names only the destination. Both group pages go stale and only their own tag
   * refreshes them: without this the page the act was launched from keeps listing the student, which
   * reads as an action that did nothing.
   */
  sourceGroupId?: number;
}

export interface SwapStudentGroupsRequest {
  firstRegistrationId: string;
  secondRegistrationId: string;
  /** Client-side only — the two rosters whose detail pages both go stale. */
  firstGroupId?: number;
  secondGroupId?: number;
}

/**
 * What the correction re-pointed. Shown once, because nothing afterwards can be asked about it:
 * `fromGroupLabel` is the only place the roster the student came from survives.
 */
export interface GroupChangeReport {
  registrationId: string;
  studentName: string;
  fromGroupLabel: string;
  toGroupLabel: string;
  affectationsMoved: number;
  affectationsCreated: number;
  periodsCreated: number;
  periodsReplaced: number;
  /** Délocalisations, revalidations, imported history — they hang off no cell and travel untouched. */
  adHocPeriodsKept: number;
}

export interface GroupSwapReport {
  first: GroupChangeReport;
  second: GroupChangeReport;
}

// ─── Delocalization ────────────────────────────────────────────────────────────

export type DelocalizationOutcome = 'Validated' | 'NotValidated';

/**
 * The verdict the external hospital sent back, in whichever form it sent it — a note /20, a
 * pass/fail, or a fiche ticked objective by objective. Deliberately the same shape as a chef's own
 * evaluation, because it ends up in the same record and is read by the same scoring.
 */
export interface DelocalizationVerdict {
  mode: EvaluationMode;
  totalScore?: number;
  outcome?: DelocalizationOutcome;
  objectiveScores?: ObjectiveScoreDto[];
  supervisorComment?: string;
  ficheReference?: string;
}

export interface DelocalizeStudentRequest {
  registrationId: string;
  stageId: number;
  serviceId: number;
  reason: string;
  /** Both or neither. Omitted, the server uses the stage's own window for that promotion. */
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  /** The paper validation, when it is already in hand. Omitted, it is entered later. */
  verdict?: DelocalizationVerdict;
}

export interface CancelDelocalizationRequest {
  registrationId: string;
  stageId: number;
}

// ─── Delocalization in bulk ───────────────────────────────────────────────────

/**
 * Who goes. The three ways of naming students are unioned — « le G3 au complet, plus ces douze-là,
 * plus la liste du formulaire ». ⚠ Rosters are named by **id**: a partition label repeats in every
 * promotion.
 */
export interface DelocalizationTargets {
  academicGroupIds?: number[];
  registrationIds?: string[];
  /** A CNE or an Apogée per line, pasted from the form. Matched on both columns, case-insensitively. */
  identifiers?: string[];
}

export type BulkDelocalizationRowStatus =
  | 'WillDelocalize'
  | 'WillReplace'
  | 'WillDropUnderway'
  | 'AlreadyMarked'
  | 'NoRoster'
  | 'NoCohort'
  | 'NotFound'
  | 'WrongYear';

export interface BulkDelocalizationRow {
  registrationId: string | null;
  studentName: string;
  cne: string | null;
  appogee: string | null;
  groupLabel: string | null;
  status: BulkDelocalizationRowStatus;
  message: string;
  /** The pasted line this row came from, so an unmatched one can be found in the file. */
  sourceIdentifier: string | null;
}

export interface BulkDelocalizationReport {
  stageId: number;
  stageName: string;
  serviceId: number;
  serviceName: string;
  serviceIsExternal: boolean;
  academicYearId: number;
  academicYearLabel: string;
  startDate: string;
  endDate: string;
  /**
   * The lines to show, refusals first. ⚠ **Capped server-side** — a selection is a whole promotion
   * when the operator asks for one, and a single object carrying 900 rows is what took the browser
   * down once already. Every count below is measured *before* the cap, so never recount from here.
   */
  rows: BulkDelocalizationRow[];
  /** How many lines the selection produced in all, cap or no cap. */
  totalRowCount: number;
  /** True when the list is not the whole story, so the screen can say so. */
  rowsTruncated: boolean;
  applicableCount: number;
  refusedCount: number;
  underwayCount: number;
  replacedCount: number;
  isEmpty: boolean;
}

export interface PreviewBulkDelocalizationRequest {
  stageId: number;
  serviceId: number;
  targets: DelocalizationTargets;
  academicYearId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ApplyBulkDelocalizationRequest extends PreviewBulkDelocalizationRequest {
  reason: string;
  /** The number the preview showed. ⚠ Sent back, never re-derived — see the command's remarks. */
  confirmedCount: number;
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
  /**
   * True when the stage is served outside the faculty. ⚠ The status cannot tell: a délocalisation is
   * `Completed`, exactly like a stage served here — and the two acts a screen can offer are
   * opposites (délocaliser / annuler la délocalisation).
   */
  isDelocalized: boolean;
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
  /**
   * Whether « autoriser le dépassement d'effectif » may lift this service's number when a plan is
   * published. **True unless somebody has said otherwise**, which is every service of the base — a
   * chef refusing the overrun is an act, and the flag is that act.
   */
  allowsOverCapacity: boolean;
  /**
   * A place the faculty does not run. It cannot be authorised on a stage, cannot be placed in a cell
   * of the planning grid, is dropped from the arranger's pool, and never enters the saturation
   * maths. It has no chef and never will.
   */
  isExternal: boolean;
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
   *  on any given date, so it must never be presented as a configured chef.
   *
   *  This is the *raw* fact — what the fiche says. Who PGSH **names** as the chef is
   *  `chefAttribution`, and that is what a screen prints. */
  chefFromSourceNote: string | null;
  /** ⚠ **Print this, never re-rank the sources here.** The server resolves it with the same rule the
   *  répartition and the stage export use (`ServiceChefDirectory`). This page used to rank them
   *  itself — the sitting FK, then the note, with the open tenure under « Historique » — and
   *  disagreed with both documents: a service reading « Pr.N.Elhafidi » exported as « Youssef
   *  Alaoui », with nothing on either screen mentioning the other. Same class as
   *  `ServicePeriodResponse.state`. ⚠ Absent only from an API predating this change, and that means
   *  **unknown** — never « the note »: filling it in from `chefFromSourceNote` would put a second
   *  resolution order back on the client, which is the defect. */
  chefAttribution?: ServiceChefAttribution;
}

/** Who PGSH names as a service's chef today, and on what authority. */
export interface ServiceChefAttribution {
  /** Null when nobody is named at all — « aucun chef de service désigné ». */
  name: string | null;
  /** The name is the **undated** import note rather than a dated affectation. Never dropped beside
   *  the name: an undated note presented as the record is a claim nothing supports. */
  fromSourceNote: boolean;
  /** ⚠ A chef **is** linked in Personnel and is deliberately not the name above — the temporary
   *  `ServiceChefPolicy.InForce = SourceNoteOnly`, because the base's only two affectations are
   *  test links. Say so, or the « en cours » tenure below the headline explains nothing. False when
   *  nobody is linked: that is a different sentence. */
  linkedChefWithheld: boolean;
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
  /**
   * The cohorte the command falls back to when none is named. Null means naming one is **required**
   * — the ordinary case for a revalidation, since a 6ᵉ année student redoing a 3ᵉ année stage holds
   * no roster that runs it. Without this the dialog cannot tell « leave it empty » from « this can
   * only fail », and it offered the act anyway.
   */
  fallbackCohortId: number | null;
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

export interface UnpublishStageArgs {
  stageId: number;
  academicYearId?: number;
  partitionLabels?: string[];
}

/** One skipped cohorte, named so the message points at something the operator can act on. */
export interface SkippedCohort {
  cohortId: number;
  label: string;
  periods: number;
  started: number;
  evaluations: number;
  attendanceDays: number;
}

/**
 * ⚠ `cohortsUnpublished === 0` has two causes calling for opposite acts — nothing was published, or
 * everything has begun. Read `cohortsSkippedUnderway` to tell them apart; a bare zero collapses them.
 */
export interface UnpublishStageResult {
  cohortsUnpublished: number;
  periodsRemoved: number;
  /** Périodes with no cell behind them — imported history, délocalisations, revalidations. */
  adHocPeriodsKept: number;
  cohortsSkippedUnderway: number;
  periodsUnderway: number;
  evaluationsAtRisk: number;
  attendanceDaysAtRisk: number;
  heaviestSkipped: SkippedCohort[];
}

