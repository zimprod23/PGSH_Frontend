import type { PaginatedResponse } from '../../../common/types';

export type EmployeeGrade = 'MC' | 'PES' | 'PH' | 'Nurse' | 'Administrator';
export type EmployeePosition = 'ServiceChef' | 'Normal';
export type WorkPlace = 'Hospital' | 'Fmpr';

export interface EmployeeServiceAssignment {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  isChef: boolean;
}

export interface EmployeeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cin: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  fullAddress: string | null;
  grade: EmployeeGrade;
  position: EmployeePosition | null;
  workPlace: WorkPlace | null;
  ppr: string | null;
  label: string | null;
  pvSignatureDate: string | null;
  services: EmployeeServiceAssignment[];
}

export type TransferDirection = 'Outgoing' | 'Incoming';

export interface TransferMarker {
  direction: TransferDirection;
  /** Destination group for outgoing rows; origin group for incoming rows. */
  groupLabel: string;
  /** Destination service (outgoing) / origin service (incoming); null if unknown. */
  serviceName: string | null;
  reason: string | null;
  date: string | null;
}

export interface MyServicePeriodResponse {
  id: string;
  internshipAssignmentId: string;
  studentFullName: string;
  studentCne: string;
  studentAppogee: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  startDate: string;
  endDate: string;
  isComplete: boolean;
  hasEvaluation: boolean;
  academicGroupLabel: string;
  /** The stage (rotation type) the chef is evaluating students for in this period. */
  stageName: string;
  /** Academic level of that stage, e.g. "3ème année Médecine" (null if unset). */
  levelLabel: string | null;
  /** Set when the row reflects a group transfer rather than a live roster entry. */
  transfer: TransferMarker | null;
  /** True while the rotation is suspended (e.g. an exam week); not actionable until resumed. */
  isPaused: boolean;
  /** Free-text reason for the active pause, if any. */
  pauseReason: string | null;
  /** Terminal: the rotation was cut short by a mid-stage transfer. Never evaluable. */
  isInterrupted: boolean;
  /**
   * Where the rotation stands. ⚠ Sent by the server, never re-derived here: this page used to work
   * it out from isComplete/hasEvaluation, which is the same rule written twice on two sides of a
   * network boundary with nothing able to catch them disagreeing. It is also the filter the server
   * pages on, so deriving it locally could only ever produce a row that contradicts its own slice.
   */
  state: ServicePeriodState;
}

/**
 * Where one rotation stands — the backend's `ServicePeriodState`, and the axis the worklist is both
 * sliced and paged on. The four partition the whole, so the counts add up and nothing hides between
 * them.
 *
 * ⚠ The list is bounded on this axis and not on the academic year. One chef's two services held
 * 3 220 periods reaching back to 2019, all fetched and mounted at once, which is what crashed the
 * page; year scoping was tried twice as the fix and blanked live worklists both times, because the
 * year record drifts out of step with the dates rotations actually run on.
 */
export type ServicePeriodState = 'Planned' | 'Underway' | 'AwaitingEvaluation' | 'Settled';

/** How many rows sit in each state, under the same service / year / search filters as the page. */
export interface ChefWorklistCounts {
  planned: number;
  underway: number;
  awaitingEvaluation: number;
  settled: number;
}

/**
 * One slice, plus the size of all four. The counts travel with the page so an empty slice can never
 * be mistaken for "this chef has no work" — which is the report that started all this.
 */
export interface ChefWorklistResponse {
  page: PaginatedResponse<MyServicePeriodResponse>;
  state: ServicePeriodState;
  counts: ChefWorklistCounts;
  /** The year actually applied — resolved server-side when the request omitted one. Null = all years. */
  academicYearId: number | null;
  /**
   * How many more periods of this state the year filter is holding back.
   *
   * ⚠ This is what makes a year filter safe on a chef's live work. Year scoping blanked chef
   * worklists twice and both times it was silent — the screen showing nothing looked exactly like a
   * service with nothing to do. A slice that can say « et 14 autres hors de cette année » cannot be
   * misread, so this number must always be shown when it is above zero.
   */
  outsideYearCount: number;
}

/** Presentation order: what a chef needs first, archive last. */
export const WORKLIST_STATES: ServicePeriodState[] =
  ['Underway', 'AwaitingEvaluation', 'Planned', 'Settled'];

/**
 * The French vocabulary and the palette live here, on the client, because they are presentation.
 * The states themselves are the domain's.
 */
export const PERIOD_STATE_META: Record<
  ServicePeriodState,
  { label: string; color: string; countKey: keyof ChefWorklistCounts }
> = {
  Underway:           { label: 'En cours',   color: 'blue',   countKey: 'underway' },
  AwaitingEvaluation: { label: 'À évaluer',  color: 'orange', countKey: 'awaitingEvaluation' },
  Planned:            { label: 'À venir',    color: 'grape',  countKey: 'planned' },
  Settled:            { label: 'Terminé',    color: 'teal',   countKey: 'settled' },
};

export const GRADE_LABELS: Record<EmployeeGrade, string> = {
  MC:            'Maître de Conférences',
  PES:           'Professeur Enseignement Supérieur',
  PH:            'Praticien Hospitalier',
  Nurse:         'Infirmier(e)',
  Administrator: 'Administrateur',
};

export const POSITION_LABELS: Record<EmployeePosition, string> = {
  ServiceChef: 'Chef de Service',
  Normal:      'Membre du personnel',
};

export const WORKPLACE_LABELS: Record<WorkPlace, string> = {
  Hospital: 'Hôpital',
  Fmpr:     'Faculté (FMPR)',
};
