import type { RegistrationOutcomeSource, RegistrationStatus } from '../../../common/types';

// ─── Déliberation (closing the year) ──────────────────────────────────────────

/**
 * How the canvas is shaped. `Exceptions` is the default and the one the faculty actually works in:
 * the file lists only the students the year went badly for, and everyone it does not name is admis.
 */
export type DeliberationTemplateMode = 'Full' | 'Exceptions';

export type DeliberationRowStatus =
  | 'WillRecord'
  | 'WillReplace'
  | 'NoIdentifier'
  | 'UnknownStudent'
  | 'NotInPromotion'
  | 'DuplicateStudent'
  | 'MissingDecision'
  | 'InvalidDecision'
  | 'NotAFinalYear';

export const DELIBERATION_ROW_OK: DeliberationRowStatus[] = ['WillRecord', 'WillReplace'];

export const DELIBERATION_STATUS_LABEL: Record<DeliberationRowStatus, string> = {
  WillRecord:       'À enregistrer',
  WillReplace:      'Remplace',
  NoIdentifier:     'Sans identifiant',
  UnknownStudent:   'Étudiant inconnu',
  NotInPromotion:   'Identifiant ambigu',
  DuplicateStudent: 'Doublon',
  MissingDecision:  'Décision vide',
  InvalidDecision:  'Décision invalide',
  NotAFinalYear:    'Pas une dernière année',
};

export interface DeliberationRowReport {
  sheetRow: number;
  cne: string | null;
  appogee: string | null;
  studentFullName: string | null;
  levelLabel: string | null;
  status: DeliberationRowStatus;
  outcome: RegistrationStatus | null;
  message: string;
  hasUnvalidatedStages: boolean;
}

export interface DeliberationLevelBreakdown {
  levelId: number;
  levelLabel: string;
  registrations: number;
  listed: number;
  willPromote: number;
  /** Possibly in their last year, so nothing is written — the faculty names its graduates. */
  finalYearUndecided: number;
  alreadyDecided: number;
}

export interface DeliberationReport {
  academicYearLabel: string;
  scopeLabel: string;
  defaultsApplied: boolean;
  totalRows: number;
  willRecord: number;
  willReplace: number;
  errorCount: number;
  contradictionCount: number;
  notCovered: number;
  /** Admitted by silence. This is the number the operator confirms before the apply will run. */
  defaultedCount: number;
  finalYearUndecidedCount: number;
  alreadyDecidedCount: number;
  notAPromotionCount: number;
  canApply: boolean;
  outcomeCounts: Record<string, number>;
  byLevel: DeliberationLevelBreakdown[];
  rows: DeliberationRowReport[];
  rowsTruncated: boolean;
}

export interface DeliberationScopeRequest {
  levelId?: number;
  academicYearId?: number;
  defaultUnlistedToAdmis?: boolean;
}

export interface DeliberationTemplateRequest extends DeliberationScopeRequest {
  mode: DeliberationTemplateMode;
}

export interface DeliberationUploadRequest extends DeliberationScopeRequest {
  file: File;
  /** Echoed back from the preview; a mismatch refuses the apply rather than promoting a newcomer. */
  confirmedDefaultCount?: number;
}

// ─── Réinscription (next year's registrations) ────────────────────────────────

export type ReinscriptionAction =
  | 'WillRegister'
  | 'NoOutcome'
  | 'CursusEnded'
  | 'AlreadyRegistered'
  | 'NextLevelMissing'
  /**
   * ⚠ Admis into what would be the **last year of his own cursus**, with an earlier stage still
   * unvalidated. Added to the backend with the final-year gate and missing here until 2026-08-30 —
   * so its badge rendered blank and, worse, the rows never reached the « à traiter » table at all:
   * the count said N and the list showed nothing. Measured on the live base: **60 of the 686** 6ᵉ
   * année Médecine are refused entry to the 7ᵉ, so this is the ordinary case, not an edge one.
   */
  | 'FinalYearBlocked';

export const REINSCRIPTION_ACTION_LABEL: Record<ReinscriptionAction, string> = {
  WillRegister:      'Réinscrit',
  NoOutcome:         'Aucune décision',
  CursusEnded:       'Fin de cursus',
  AlreadyRegistered: 'Déjà inscrit',
  NextLevelMissing:  'Pas de niveau supérieur',
  FinalYearBlocked:  'Stage antérieur non validé',
};

/**
 * Rows a human has to do something about. Kept beside the union so a new action cannot be added
 * without deciding whether it belongs here — the omission above was exactly that, silently.
 */
export const REINSCRIPTION_NEEDS_ATTENTION: ReinscriptionAction[] = [
  'NoOutcome',
  'NextLevelMissing',
  'FinalYearBlocked',
];

export interface ReinscriptionRowReport {
  studentId: string;
  studentFullName: string;
  cne: string | null;
  fromLevelId: number;
  fromLevelLabel: string;
  outcome: RegistrationStatus | null;
  outcomeSource: RegistrationOutcomeSource | null;
  action: ReinscriptionAction;
  toLevelLabel: string | null;
  message: string;
}

export interface ReinscriptionLevelBreakdown {
  levelId: number;
  levelLabel: string;
  considered: number;
  willRegister: number;
  needsAttention: number;
}

export interface ReinscriptionReport {
  fromYearLabel: string;
  toYearLabel: string;
  scopeLabel: string;
  totalConsidered: number;
  willRegister: number;
  skipped: number;
  needsAttention: number;
  /** Refused entry to the final year over an unvalidated earlier stage — revalidate, or grant a dérogation. */
  finalYearBlocked: number;
  /** Entered the final year *because* a dérogation was granted: an override nobody sees is one nobody reviews. */
  finalYearWaived: number;
  byTargetLevel: Record<string, number>;
  byLevel: ReinscriptionLevelBreakdown[];
  rows: ReinscriptionRowReport[];
  rowsTruncated: boolean;
}

export interface ReinscriptionRequest {
  fromAcademicYearId: number;
  toAcademicYearId: number;
  levelId?: number;
}

// ─── One student at a time ────────────────────────────────────────────────────

export interface RecordOutcomeRequest {
  registrationId: string;
  /** Cache key only — the route carries the registration. */
  studentId: string;
  outcome: RegistrationStatus;
  motif?: string;
}

export interface ReopenYearRequest {
  registrationId: string;
  studentId: string;
  reason?: string;
}

export interface ReopenYearReport {
  withdrawnOutcome: RegistrationStatus;
  /** The next year's registration already exists. Reported, never removed. */
  laterRegistrationExists: boolean;
}

export interface AssignStudentToGroupRequest {
  registrationId: string;
  academicGroupId: number;
  /** Cache key only. */
  studentId?: string;
  reason?: string;
}

export interface GroupJoinReport {
  groupLabel: string;
  cohortsJoined: number;
  periodsCreated: number;
  /** Stages the roster has already finished: owed, unserved, and nobody's rotation was invented. */
  stagesAlreadyOver: number;
}
