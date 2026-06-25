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
}

export interface PeriodObjective {
  id: number;
  label: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
}

export type EvaluationMode = 'Numeric' | 'ValidatePeriod' | 'ValidateObjectives';
export type EvaluationOutcome = 'Validated' | 'NotValidated';

export interface ObjectiveScoreDto {
  stageObjectiveId: number;
  score?: number | null;
  outcome?: EvaluationOutcome | null;
  note?: string;
}

export interface SubmitEvaluationRequest {
  servicePeriodId: string;
  serviceId: number;
  mode: EvaluationMode;
  totalScore?: number | null;
  outcome?: EvaluationOutcome | null;
  supervisorComment?: string;
  objectiveScores: ObjectiveScoreDto[];
}

export interface UpdateEvaluationRequest {
  evaluationId: string;
  servicePeriodId: string;
  serviceId: number;
  mode: EvaluationMode;
  totalScore?: number | null;
  outcome?: EvaluationOutcome | null;
  supervisorComment?: string;
  objectiveScores: ObjectiveScoreDto[];
}

export interface ServiceEvaluationDetail {
  id: string;
  servicePeriodId: string;
  mode: EvaluationMode;
  totalScore: number | null;
  outcome: EvaluationOutcome | null;
  supervisorComment: string | null;
  objectiveScores: {
    id: string;
    stageObjectiveId: number;
    objectiveLabel: string;
    weight: number;
    isMandatory: boolean;
    score: number | null;
    outcome: EvaluationOutcome | null;
    note: string | null;
  }[];
}

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
