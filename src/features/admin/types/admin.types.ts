import type { AcademicProgram, RegistrationStatus } from '../../../common/types';

export interface AcademicYearResponse {
  id: number;
  label: string;
  isCurrent: boolean;
}

export interface AdminLevelResponse {
  id: number;
  label: string | null;
  year: number;
  academicProgram: AcademicProgram;
}

export interface CreateRegistrationRequest {
  studentId: string;
  academicYearId: number;
  levelId: number;
  status?: RegistrationStatus;
}
