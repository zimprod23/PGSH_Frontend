// ─── GET /services/promotion-fit ──────────────────────────────────────────────
//
// « Cette promotion tient-elle ? » — what each stage of a promotion NEEDS against what its
// authorised services HOLD, computed from headcount, durations and capacities alone.
//
// ⚠ Not a second occupancy report. `/services/occupancy-report` reads the cells, so a promotion that
// has not been cut yet prints as ZERO pressure — comfortably empty — right up to the moment somebody
// presses « Publier ». This read needs no plan, which is the whole point: it is meant to be read
// BEFORE the day of cutting, laying the axis and arranging.

export interface PromotionFitResponse {
  academicYearId: number;
  academicYearLabel: string;
  /** A sentence naming what was asked for, so a printed copy states its own scope. */
  scope: string;
  totals: PromotionFitTotals;
  promotions: PromotionFitRow[];
  /**
   * What the numbers rest on. Silent when the data has nothing to say — a warning that fires
   * whatever the numbers are is noise, and noise is dismissed.
   */
  notes: string[];
}

export interface PromotionFitTotals {
  promotions: number;
  promotionsThatFit: number;
  promotionsOverCapacity: number;
  promotionsUnplaceable: number;
  promotionsWithoutStages: number;
  students: number;
  stages: number;
  stagesOverCapacity: number;
  stagesUnplaceable: number;
  /** ⚠ The deepest single deficit, never a sum: shortfalls are not paid out of one purse. */
  worstShortfall: number;
  worstShortfallStage: string | null;
}

/**
 * ⚠ `Unplaceable` and `OverCapacity` are not interchangeable. The first is a catalogue gap the
 * auto-arrange refuses on; the second is a decision the faculty may take (and routinely does, by
 * ticking « autoriser le dépassement »). Collapsing them into « problème » loses which act is owed.
 */
export type PromotionFitState =
  | 'NoStudents'
  | 'NoStages'
  | 'Unplaceable'
  | 'OverCapacity'
  | 'Fits';

export interface PromotionFitRow {
  levelId: number;
  levelLabel: string;
  academicProgram: string;
  students: number;
  /** Frozen by a blocking signalement, so the cut will not reach them — excluded from `students`. */
  heldStudents: number;
  /** T = Σkₛ — the columns a partition needs to visit every stage. */
  timeline: number;
  /** How long one column lasts: the gcd of the durations. */
  columnDays: number;
  totalDurationDays: number;
  state: PromotionFitState;
  /** Places missing in the worst stage, 0 when nothing is short. */
  shortfall: number;
  stages: PromotionFitStageRow[];
}

/** The three refusals are the arranger's own, so the panel and the refusal cannot disagree. */
export type StageFitState =
  | 'NoAllowedServices'
  | 'NoServiceAdmits'
  | 'AllServicesReserved'
  | 'NoDuration'
  | 'OverCapacity'
  | 'Fits';

export interface PromotionFitStageRow {
  stageId: number;
  stageName: string;
  durationInDays: number;
  /** kₛ — columns spent here. */
  periods: number;
  /** N·kₛ/T rounded up: the slice standing here at the same time. */
  studentsAtOnce: number;
  places: number;
  /** places − studentsAtOnce. Negative is the shortfall. */
  margin: number;
  state: StageFitState;
  allowedServices: number;
  usableServices: number;
  reservedServices: number;
  notAdmittingServices: number;
  externalServices: number;
  services: PromotionFitServiceRow[];
}

export interface PromotionFitServiceRow {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  places: number;
  participatesInRotation: boolean;
  admits: boolean;
  isExternal: boolean;
  allowsOverCapacity: boolean;
  /**
   * ⚠ The other promotions authorising this same service. The arithmetic does not subtract them —
   * nothing here knows when each promotion passes through — so this is what says a comfortable
   * margin may be spent twice.
   */
  alsoAuthorisedBy: string[];
}

export interface PromotionFitRequest {
  academicYearId?: number;
  levelId?: number;
}
