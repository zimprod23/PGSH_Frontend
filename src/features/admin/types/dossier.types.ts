import type {
  InternshipStatus,
  RegistrationStatus,
  StageAssignmentResult,
} from '../../../common/types';

// ─── GET /students/{id}/levels/{levelId}/dossier ──────────────────────────────
//
// What a student owes at ONE level, folded across every registration he holds there.
//
// ⚠ This is not the parcours. The parcours answers « what has he done, year by year » and lists one
// row per attempt; the dossier answers « what does he still owe *at this level* » and lists one row
// per stage, with its attempts underneath. A repeating student has several registrations at one
// level, so only folding them together can say whether a stage is acquired — which is the question
// the revalidation and the final-year gate are decided on.

export interface StudentLevelDossierResponse {
  studentId: string;
  studentFullName: string;
  studentCne: string | null;
  studentAppogee: string | null;
  levelId: number;
  levelLabel: string | null;
  stagesTotal: number;
  stagesValidated: number;
  stagesOutstanding: number;
  isLevelComplete: boolean;
  registrations: DossierRegistration[];
  stages: DossierStage[];
}

export interface DossierRegistration {
  registrationId: string;
  academicYearId: number;
  academicYearLabel: string;
  status: RegistrationStatus;
  academicGroupId: number | null;
  academicGroupLabel: string | null;
  attemptCount: number;
}

export interface DossierStage {
  stageId: number;
  stageName: string;
  coefficient: number;
  state: DossierStageState;
  bestScore: number | null;
  attemptCount: number;
  attempts: DossierAttempt[];
}

export interface DossierAttempt {
  assignmentId: string;
  registrationId: string;
  academicYearId: number;
  academicYearLabel: string;
  status: InternshipStatus;
  finalScore: number | null;
  result: StageAssignmentResult | null;
  /** The verdict pronounced on the year this attempt was served in. */
  yearOutcome: RegistrationStatus;
  /**
   * ⚠ The year was failed, so the attempt establishes nothing — the redoublant serves the year
   * again in full, stages included. It stays in the list because it happened, and the screen has to
   * say so: « validé — année redoublée » is a different fact from « validé », and drawing them with
   * the same badge is what made them indistinguishable.
   */
  annulledByFailedYear: boolean;
}

/**
 * ⚠ `NotAttempted` is not `ToRevalidate`. « Owed » here means *every attempt came back NonValidé* —
 * a stage nobody has ever sat is not a debt, and an unmarked one is not a failure. Reading either as
 * owed would block a promotion on missing data entry.
 */
export type DossierStageState = 'NotAttempted' | 'InProgress' | 'Validated' | 'ToRevalidate';

// ─── GET /students/{id}/outstanding-stages ────────────────────────────────────
//
// What `FinalYearGuard` reads before letting somebody *begin* a final year — cursus-wide, across
// every level, which is what the dossier above deliberately is not.

export interface OutstandingStageResponse {
  stageId: number;
  stageName: string;
  levelYear: number;
  levelLabel: string;
}
