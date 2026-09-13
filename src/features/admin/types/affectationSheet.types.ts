/**
 * Le canevas des affectations, et son annulation.
 *
 * ⚠ **Les statuts sont recopiés du serveur, jamais dérivés ici.** Le rapport est calculé par
 * `AffectationSheetPlanner`, qui est la même classe pour l'aperçu et pour l'application ; un écran
 * qui reclasserait les lignes serait une seconde règle que rien n'empêcherait de diverger de la
 * première. Ici on ne fait que **traduire** et **grouper**.
 */

export type AffectationSheetRowStatus =
  | 'WillCreate'
  | 'WillReplace'
  | 'WillDelocalize'
  | 'Unchanged'
  | 'NotPlanned'
  | 'NoIdentifier'
  | 'DuplicateRow'
  | 'StudentNotFound'
  | 'WrongPromotion'
  | 'OnHold'
  | 'NoRoster'
  | 'UnknownStage'
  | 'AmbiguousStage'
  | 'UnknownService'
  | 'AmbiguousService'
  | 'MissingDates'
  | 'BadDateOrder'
  | 'AlreadyMarked'
  | 'AlreadyAttended'
  | 'DelocalizationWithoutReason'
  | 'MalformedDelocalization'
  | 'AmbiguousAffectation';

/** Les issues qui écrivent ou qui sautent. Tout le reste refuse le fichier entier. */
const WRITES_OR_SKIPS: AffectationSheetRowStatus[] = [
  'WillCreate', 'WillReplace', 'WillDelocalize', 'Unchanged', 'NotPlanned',
];

export const isAffectationSheetError = (status: AffectationSheetRowStatus) =>
  !WRITES_OR_SKIPS.includes(status);

/**
 * ⚠ `WillReplace` n'est pas une erreur mais demande un regard : c'est la moitié destructrice de
 * l'acte. `NotPlanned` et `Unchanged` ne demandent rien — les mettre en tête noierait les lignes qui
 * comptent, un canevas entier pouvant être blanc.
 */
export const affectationSheetNeedsAttention = (status: AffectationSheetRowStatus) =>
  isAffectationSheetError(status) || status === 'WillReplace';

export const AFFECTATION_SHEET_STATUS_LABEL: Record<AffectationSheetRowStatus, string> = {
  WillCreate: 'Créée',
  WillReplace: 'Réécrite',
  WillDelocalize: 'Hors faculté',
  Unchanged: 'Inchangée',
  NotPlanned: 'Non planifiée',
  NoIdentifier: 'Sans identifiant',
  DuplicateRow: 'Ligne en double',
  StudentNotFound: 'Étudiant introuvable',
  WrongPromotion: 'Autre promotion',
  OnHold: 'Signalée',
  NoRoster: 'Sans groupe',
  UnknownStage: 'Stage inconnu',
  AmbiguousStage: 'Stage ambigu',
  UnknownService: 'Service inconnu',
  AmbiguousService: 'Service ambigu',
  MissingDates: 'Dates manquantes',
  BadDateOrder: 'Dates inversées',
  AlreadyMarked: 'Déjà évaluée',
  AlreadyAttended: 'Présences saisies',
  DelocalizationWithoutReason: 'Motif manquant',
  MalformedDelocalization: 'Délocalisation mal formée',
  AmbiguousAffectation: 'Affectation ambiguë',
};

export interface AffectationSheetRowReport {
  sheetRow: number;
  identifier: string | null;
  studentFullName: string | null;
  stageName: string | null;
  serviceName: string | null;
  status: AffectationSheetRowStatus;
  outsideCnpn: boolean;
  message: string;
}

export interface AffectationSheetStageBreakdown {
  stageName: string;
  rows: number;
  affectations: number;
  willCreate: number;
  willReplace: number;
  willDelocalize: number;
  unchanged: number;
  errors: number;
}

export interface AffectationSheetReport {
  yearLabel: string;
  levelLabel: string;
  totalRows: number;
  affectations: number;
  willCreate: number;
  willReplace: number;
  willDelocalize: number;
  unchanged: number;
  notPlanned: number;
  periodsToWrite: number;
  periodsToDrop: number;
  publishedPeriodsToDrop: number;
  cohortsToCreate: number;
  studentsCovered: number;
  notCovered: number;
  outsideCnpn: number;
  errorCount: number;
  canApply: boolean;
  byStage: AffectationSheetStageBreakdown[];
  rows: AffectationSheetRowReport[];
  rowsTruncated: boolean;
  notes: string[];
}

export interface AffectationSheetTemplateRequest {
  levelId: number;
  stageId?: number;
  academicYearId?: number;
}

export interface AffectationSheetUploadRequest {
  file: File;
  levelId: number;
  academicYearId?: number;
}

/**
 * ⚠ **Deux nombres, et ils ne sont pas interchangeables.** Ce qui s'écrit et ce qui se détruit bougent
 * pour des raisons différentes — une période évaluée entre l'aperçu et l'application change le second
 * sans toucher au premier — et c'est la destruction qui est définitive.
 */
export interface AffectationSheetApplyRequest extends AffectationSheetUploadRequest {
  confirmedCount: number;
  confirmedDroppedPeriods: number;
}

// ─── L'annulation ───────────────────────────────────────────────────────────

export type AffectationImportStatus = 'Applied' | 'Reversed';

export interface AffectationImportSummary {
  id: string;
  yearLabel: string;
  levelLabel: string;
  fileName: string | null;
  appliedAtUtc: string;
  appliedByName: string | null;
  status: AffectationImportStatus;
  reversedAtUtc: string | null;
  affectationCount: number;
  replacedPeriodCount: number;
  canBeReversed: boolean;
}

export type AffectationImportReversalRowStatus =
  | 'WillRemoveAffectation'
  | 'WillRestorePeriods'
  | 'AlreadyGone'
  | 'EvaluatedSince'
  | 'AttendedSince'
  | 'ChangedSince';

const REVERSAL_WRITES_OR_SKIPS: AffectationImportReversalRowStatus[] = [
  'WillRemoveAffectation', 'WillRestorePeriods', 'AlreadyGone',
];

export const isReversalError = (status: AffectationImportReversalRowStatus) =>
  !REVERSAL_WRITES_OR_SKIPS.includes(status);

export const REVERSAL_STATUS_LABEL: Record<AffectationImportReversalRowStatus, string> = {
  WillRemoveAffectation: 'Supprimée',
  WillRestorePeriods: 'Rétablie',
  AlreadyGone: 'Déjà disparue',
  EvaluatedSince: 'Évaluée depuis',
  AttendedSince: 'Pointée depuis',
  ChangedSince: 'Modifiée depuis',
};

export interface AffectationImportReversalRow {
  registrationId: string;
  studentFullName: string;
  appogee: string | null;
  stageName: string;
  status: AffectationImportReversalRowStatus;
  periodsToRestore: number;
  message: string;
}

export interface AffectationImportReversalReport {
  importId: string;
  yearLabel: string;
  levelLabel: string;
  appliedAtUtc: string;
  entries: number;
  affectationsToRemove: number;
  affectationsToRestore: number;
  periodsToRestore: number;
  publishedPeriodsToRestore: number;
  periodsToRemove: number;
  alreadyGone: number;
  errorCount: number;
  canApply: boolean;
  rows: AffectationImportReversalRow[];
  rowsTruncated: boolean;
  notes: string[];
}
