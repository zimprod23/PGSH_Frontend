import type { AcademicProgram } from '../../../common/types';

/**
 * What the roll export is cut for.
 *
 * ⚠ **`academicYearId` is not optional in practice, even though the type allows it.** Omitted, the
 * server resolves the *current* year — which is right for a URL typed by hand and wrong for a button
 * sitting under a list the user has scoped to another year. Every caller here passes the navbar's
 * year, so the file and the list above it describe the same population.
 */
export interface StudentsExportRequest {
  academicYearId?: number;
  levelId?: number;
  program?: AcademicProgram;
  academicGroupId?: number;
  searchTerm?: string;
}

/**
 * What the stage-record export is cut for. `onlyEvaluated` is the difference between a PV and a
 * state of play: left off, the attempts with no verdict are in the document, which is what makes a
 * missing évaluation visible instead of looking like a student nobody planned.
 */
export interface StageAssignmentsExportRequest {
  academicYearId?: number;
  levelId?: number;
  stageId?: number;
  academicGroupId?: number;
  onlyEvaluated?: boolean;
}
