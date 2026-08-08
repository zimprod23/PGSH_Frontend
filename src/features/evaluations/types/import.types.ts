import type { EvaluationMode } from './evaluation.types';

/** How far one sheet row reaches. Chosen at upload, never inferred from the file. */
export type EvaluationImportScope = 'WholeStage' | 'SinglePeriod';

/** Only these two are importable — per-objective marks do not fit on a spreadsheet line. */
export type EvaluationImportMode = Extract<EvaluationMode, 'Numeric' | 'ValidatePeriod'>;

export type EvaluationImportRowStatus =
  | 'WillCreate'
  | 'WillOverwrite'
  | 'NoIdentifier'
  | 'UnknownStudent'
  | 'NotInStage'
  | 'DuplicateStudent'
  | 'PeriodNotFound'
  | 'PeriodNotClosed'
  | 'AlreadyRatified'
  | 'NotAllowed'
  | 'MissingValue'
  | 'InvalidValue';

export interface EvaluationImportRowReport {
  sheetRow: number;
  cne: string | null;
  appogee: string | null;
  studentFullName: string | null;
  status: EvaluationImportRowStatus;
  message: string;
  periodCount: number;
}

export interface EvaluationImportReport {
  totalRows: number;
  willCreate: number;
  willOverwrite: number;
  errorCount: number;
  periodCount: number;
  canApply: boolean;
  rows: EvaluationImportRowReport[];
}

export interface EvaluationImportRequest {
  stageId: number;
  scope: EvaluationImportScope;
  mode: EvaluationImportMode;
  periodNumber?: number;
  /**
   * A stage keeps a cohort per (group, year), so without this the sheet spans every promotion that
   * ever took it — 3,553 students for one 6ème année stage where 688 were meant.
   */
  academicYearId?: number;
  file: File;
}

export interface EvaluationImportTemplateRequest {
  stageId: number;
  scope: EvaluationImportScope;
  mode: EvaluationImportMode;
  periodNumber?: number;
  academicYearId?: number;
}

/** Rows that will be written; everything else refuses the import. */
export const IMPORT_ROW_OK: EvaluationImportRowStatus[] = ['WillCreate', 'WillOverwrite'];

export const IMPORT_STATUS_LABEL: Record<EvaluationImportRowStatus, string> = {
  WillCreate:       'Nouvelle note',
  WillOverwrite:    'Remplace',
  NoIdentifier:     'Sans identifiant',
  UnknownStudent:   'Étudiant inconnu',
  NotInStage:       'Hors de ce stage',
  DuplicateStudent: 'Doublon',
  PeriodNotFound:   'Rotation introuvable',
  PeriodNotClosed:  'Non clôturée',
  AlreadyRatified:  'Déjà ratifié',
  NotAllowed:       'Non autorisé',
  MissingValue:     'Valeur manquante',
  InvalidValue:     'Valeur invalide',
};
