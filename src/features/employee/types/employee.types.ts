export interface EmployeeUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface MyServiceResponse {
  id: number;
  name: string;
  serviceType: string;
  capacity: number;
  hospitalId: number;
  hospitalName: string;
}

export interface MyServicePeriodResponse {
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

export interface SubmitEvaluationRequest {
  servicePeriodId: string;
  totalScore: number;
  supervisorComment?: string;
  objectiveScores: { stageObjectiveId: number; score: number; note?: string }[];
}
