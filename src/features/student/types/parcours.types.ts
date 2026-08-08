import type {
  InternshipStatus,
  RegistrationStatus,
  StageAssignmentResult,
} from '../../../common/types';

// ─── GET /students/{id}/parcours ─────────────────────────────────────────────
//
// The student's whole course, year by year. Everything the portal shows about stages comes from
// here: reading assignments through the *current* registration alone made last year's stages
// disappear the day a new registration was created.

export interface StudentParcoursResponse {
  studentId: string;
  studentFullName: string;
  totals: ParcoursTotals;
  years: ParcoursYear[];
}

/**
 * Disjoint buckets covering every attempt. `planned` is only what has not started — a stage whose
 * rotations are over is `awaitingVerdict`, then `validated` or `failed`.
 */
export interface ParcoursTotals {
  planned: number;
  ongoing: number;
  awaitingVerdict: number;
  validated: number;
  failed: number;
  total: number;
}

export interface ParcoursYear {
  registrationId: string;
  academicYearId: number;
  academicYearLabel: string;
  levelId: number;
  levelLabel: string | null;
  levelYear: number;
  registrationStatus: RegistrationStatus;
  academicGroupId: number | null;
  academicGroupLabel: string | null;
  isCurrent: boolean;
  totals: ParcoursTotals;
  stages: ParcoursStage[];
}

export interface ParcoursStage {
  assignmentId: string;
  stageId: number;
  stageName: string;
  coefficient: number;
  /** The stage's own level — a retake of an earlier level's stage hangs off a later registration. */
  stageLevelId: number;
  stageLevelLabel: string | null;
  /** 1 for a first sitting, 2 for the first retake, … */
  attemptNumber: number;
  cohortId: number;
  cohortLabel: string;
  status: InternshipStatus;
  finalScore: number | null;
  result: StageAssignmentResult | null;
  startDate: string | null;   // YYYY-MM-DD
  endDate: string | null;     // YYYY-MM-DD
  periodsTotal: number;
  periodsComplete: number;
  /** FinalScore is the stage's final note, not a running partial mean. */
  allPeriodsEvaluated: boolean;
}
