/**
 * Evaluating a rotation is one domain with two entry points: the chef of the service does it from
 * his worklist, an administrator does it from the student's stage record. Both drive the same
 * endpoints and the same three modes, so the contract lives here rather than in either feature.
 */

export type EvaluationMode = 'Numeric' | 'ValidatePeriod' | 'ValidateObjectives';
export type EvaluationOutcome = 'Validated' | 'NotValidated';

export interface PeriodObjective {
  id: number;
  label: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
}

export interface ObjectiveScoreDto {
  stageObjectiveId: number;
  score?: number | null;
  outcome?: EvaluationOutcome | null;
  note?: string;
}

interface EvaluationBody {
  mode: EvaluationMode;
  totalScore?: number | null;
  outcome?: EvaluationOutcome | null;
  supervisorComment?: string;
  objectiveScores: ObjectiveScoreDto[];
}

export interface SubmitEvaluationRequest extends EvaluationBody {
  servicePeriodId: string;
  /** Not sent — it targets the chef worklist cache entry to invalidate. */
  serviceId?: number;
  /** Not sent — it targets the student stage record to invalidate. */
  assignmentId?: string;
}

export interface UpdateEvaluationRequest extends EvaluationBody {
  evaluationId: string;
  servicePeriodId: string;
  serviceId?: number;
  assignmentId?: string;
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

export interface ServiceEvaluationDetail {
  id: string;
  servicePeriodId: string;
  mode: EvaluationMode;
  totalScore: number | null;
  outcome: EvaluationOutcome | null;
  supervisorComment: string | null;
  ficheReference?: string | null;
  evaluatedByName?: string | null;
  evaluatedAt?: string | null;
  objectiveScores: ObjectiveScoreDetail[];
}

/**
 * What the modal needs to know about the rotation being graded, whichever screen opened it.
 * The chef builds this from his worklist row, the admin from a period of the student's record.
 */
export interface EvaluationTarget {
  periodId: string;
  studentFullName: string;
  studentCne?: string | null;
  stageName?: string | null;
  startDate: string;
  endDate: string;
  hasEvaluation: boolean;
  /** Chef worklist cache key — pass it when opening from the worklist so the row refreshes. */
  serviceId?: number;
  /** Student stage record cache key — pass it when opening from the record. */
  assignmentId?: string;
}
