import type { AcademicProgram } from '../../../common/types';

export interface StageSummaryResponse {
  id: number;
  name: string;
  coefficient: number;
  durationInDays: number;
  levelLabel: string | null;
}

export interface StageObjectiveResponse {
  label: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
}

export interface StageResponse {
  id: number;
  name: string;
  coefficient: number;
  description: string | null;
  durationInDays: number;
  levelResponse: {
    id: number;
    label: string | null;
    year: number;
    academicProgram: AcademicProgram;
  } | null;
  stageObjectiveResponse: StageObjectiveResponse[];
}

export interface GetStagesQuery {
  searchTerm?: string;
  levelId?: number;
  pageNumber?: number;
  pageSize?: number;
}
