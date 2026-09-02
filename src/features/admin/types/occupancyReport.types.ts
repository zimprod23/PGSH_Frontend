import type { CapacityRule, LevelQuotaResponse } from './admin.types';

// ─── GET /services/occupancy-report ───────────────────────────────────────────
//
// The cross-service half of the occupancy reads. `services/{id}/occupancy` answers « what does THIS
// service hold »; this one answers « which services are the problem », which is the question asked
// before publishing a promotion and which opening 148 pages does not answer.

/**
 * ⚠ **What the filters do and do not narrow.** A filter picks which services are *listed* and which
 * placements count towards `share`; it never narrows the load a saturation is measured on. A service
 * is shared, and the ceiling that refuses a publish counts every promotion standing in it — so
 * measuring « la 5ᵉ année seule » against the service total would print « ok » for a service that is
 * over because of the 3ᵉ.
 */
export interface OccupancyReportResponse {
  academicYearId: number;
  academicYearLabel: string;
  yearStart: string;   // YYYY-MM-DD
  yearEnd: string;     // YYYY-MM-DD
  /** A sentence naming the filters, so a printed copy states its own scope. */
  scope: string;
  totals: OccupancyReportTotals;
  /** The faculty's simultaneous load, folded into months — the **maximum** reached inside each. */
  months: OccupancyMonthBar[];
  services: OccupancyServiceRow[];
  stages: OccupancyStageRow[];
  levels: OccupancyLevelRow[];
  /**
   * What the report looked for and did not find. Silent when the data has nothing to say: a warning
   * that fires whatever the numbers are is noise, and noise is dismissed — which puts the real one
   * out of sight.
   */
  notes: string[];
}

export interface OccupancyReportTotals {
  servicesInScope: number;
  servicesOccupied: number;
  /** ⚠ In scope and holding nobody all year — invisible from a service's own page. */
  servicesNeverUsed: number;
  servicesOverCapacity: number;
  /** Holding a promotion their own quotas do not admit. This refusal cannot be forced. */
  servicesAdmittingNobody: number;
  /** Grid cells in scope. 0 means nothing has been arranged, which is not saturation. */
  placementCount: number;
  placedStudents: number;
  distinctStages: number;
  distinctLevels: number;
  peakStudents: number;
  /** ⚠ The **envelope** of the peak — first day reached, last day reached — not the first segment. */
  peakStart: string | null;
  peakEnd: string | null;
  /** Days actually spent at that load: says whether the peak is a plateau or one bad fortnight. */
  peakDays: number;
  /**
   * ⚠ **Jours-service**, not days: one service over for ten days and ten services over for one day
   * both read 10. Never label this « jours ».
   */
  serviceDaysOverCapacity: number;
}

export interface OccupancyMonthBar {
  year: number;
  month: number;
  label: string;
  peakStudents: number;
  servicesOccupied: number;
  servicesOverCapacity: number;
  /** Read off the month's peak *segment*, so the parts add up to `peakStudents` exactly. */
  levels: MonthLevelLoad[];
}

export interface MonthLevelLoad {
  levelId: number;
  levelLabel: string;
  students: number;
}

export interface OccupancyServiceRow {
  serviceId: number;
  serviceName: string;
  hospitalId: number;
  hospitalName: string;
  hospitalCity: string;
  rule: CapacityRule;
  /**
   * The limit the saturation is measured against: `Service.Capacity` when unrestricted, otherwise
   * the sum of the quotas of the promotions actually present. 0 when one of them is not admitted.
   */
  ceiling: number;
  totalCapacity: number;
  quotas: LevelQuotaResponse[];
  segmentCount: number;
  peakStudents: number;
  peakStart: string | null;
  peakEnd: string | null;
  /** Peak ÷ ceiling. **Null**, never 0, when there is no ceiling to divide by. */
  saturation: number | null;
  overCapacitySegments: number;
  daysOverCapacity: number;
  levelsNotAdmitted: string[];
  /** Students attributed under the report's filters, out of the service's whole load. */
  share: number;
  bands: OccupancyBand[];
  levels: OccupancyServiceLevel[];
  stages: OccupancyServiceStage[];
}

/** A stretch over which the occupants do not change — the unit the chart draws. */
export interface OccupancyBand {
  startDate: string;
  endDate: string;
  days: number;
  students: number;
  capacity: number | null;
  overflow: number;
}

export interface OccupancyServiceLevel {
  levelId: number;
  levelLabel: string;
  peakStudents: number;
  capacity: number | null;
  notAdmitted: boolean;
}

export interface OccupancyServiceStage {
  stageId: number;
  stageName: string;
  levelLabel: string;
  cells: number;
  students: number;
}

/**
 * ⚠ `servicesUnused` is the number this whole report exists for. A stage that lists five services
 * and places everybody in two has an arrangement defect no single service page can show — the three
 * empty ones just look like services with nothing planned.
 */
export interface OccupancyStageRow {
  stageId: number;
  stageName: string;
  levelId: number;
  levelLabel: string;
  servicesAllowed: number;
  servicesUsed: number;
  servicesUnused: number;
  cells: number;
  placedStudents: number;
  /** The most students this stage puts in one service **at one time** — never a yearly sum. */
  heaviestServiceLoad: number;
  heaviestServiceName: string | null;
}

export interface OccupancyLevelRow {
  levelId: number;
  levelLabel: string;
  servicesUsed: number;
  cells: number;
  placedStudents: number;
  peakStudents: number;
  servicesNotAdmitting: number;
}

export interface OccupancyReportRequest {
  academicYearId?: number;
  hospitalId?: number;
  levelId?: number;
  stageId?: number;
  onlySaturated?: boolean;
}
