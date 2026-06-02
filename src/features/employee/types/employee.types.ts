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

export interface MyServicePeriodResponse {
  id: string;
  internshipAssignmentId: string;
  studentFullName: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  startDate: string;
  endDate: string;
  isComplete: boolean;
  hasEvaluation: boolean;
}

export interface ObjectiveScoreDto {
  stageObjectiveId: number;
  score: number;
  note?: string;
}

export interface SubmitEvaluationRequest {
  servicePeriodId: string;
  totalScore: number;
  supervisorComment?: string;
  objectiveScores: ObjectiveScoreDto[];
}

export interface UpdateEvaluationRequest {
  evaluationId: string;
  servicePeriodId: string;
  totalScore: number;
  supervisorComment?: string;
  objectiveScores: ObjectiveScoreDto[];
}

export interface ServiceEvaluationDetail {
  id: string;
  servicePeriodId: string;
  totalScore: number;
  supervisorComment: string | null;
  objectiveScores: {
    id: string;
    stageObjectiveId: number;
    objectiveLabel: string;
    weight: number;
    isMandatory: boolean;
    score: number;
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
