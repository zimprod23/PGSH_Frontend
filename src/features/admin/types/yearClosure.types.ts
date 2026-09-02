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

// ─── Réinscription par fichier (the faculty's own roll) ───────────────────────

/**
 * The act the faculty actually hands over: one spreadsheet naming, per student, the étape he was in
 * and the étape he enters. The two facts carry the verdict with them, so one upload closes a year
 * and opens the next.
 *
 * ⚠ It is **not** the déliberation canvas with different columns. That one is a list of exceptions
 * and silence means « admis »; this one is the roll of who *is* coming back, so silence means
 * somebody is not — and PGSH cannot tell a graduate from an exclusion. Nothing is written for the
 * students it does not name; `notCovered` is what says how many there are.
 */
export type ReinscriptionSheetRowStatus =
  | 'WillRegister'
  /** Registered, but no registration exists for the closing year — nothing to pronounce on. */
  | 'WillRegisterWithoutSource'
  | 'AlreadyRegistered'
  /** A programme PGSH does not manage (the masters). Skipped, never an error. */
  | 'OutsideScope'
  /**
   * No student carries this code, so the roll **creates** him and flags the thin dossier.
   *
   * ⚠ Skipping these was defensible — creating an identity is the inscription's act — and still
   * wrong in practice: the 26 such rows of the 2026-2027 file ended up in a downloaded spreadsheet
   * and nowhere anybody works. The flag is **advisory**: he partitions and plans like everyone else.
   */
  | 'WillCreateStudent'
  /**
   * Registered **and** immediately held: the last year of his own CNPN, with an earlier stage still
   * reading unvalidated.
   *
   * ⚠ This used to be a skip, and the skip was the defect — it dropped 182 of the 651 7ᵉ année
   * Médecine the faculty itself named as coming back. The final year is not a year one passes: the
   * student sits in it revalidating stages one at a time, so the re-registration *is* how the debt
   * gets cleared. The registration is created and a signalement keeps it out of every roster and
   * affectation until scolarité releases it.
   */
  | 'WillRegisterHeld'
  // ---- refusals: one of these anywhere refuses the whole file ----
  | 'NoIdentifier'
  | 'DuplicateRow'
  | 'UnknownLevelCode'
  | 'LevelMismatch'
  | 'NotAPromotion'
  | 'LevelRegression'
  | 'LevelMissing';

export const REINSCRIPTION_SHEET_STATUS_LABEL: Record<ReinscriptionSheetRowStatus, string> = {
  WillRegister:              'Réinscrit',
  WillRegisterWithoutSource: 'Réinscrit — sans année source',
  AlreadyRegistered:         'Déjà inscrit',
  OutsideScope:              'Hors périmètre',
  WillCreateStudent:         'Créé — dossier à compléter',
  WillRegisterHeld:          'Réinscrit — signalé',
  NoIdentifier:              'Sans code',
  DuplicateRow:              'Doublon',
  UnknownLevelCode:          'Étape inconnue',
  LevelMismatch:             'Étape contredite',
  NotAPromotion:             'Pas une promotion',
  LevelRegression:           'Étape en recul',
  LevelMissing:              'Niveau absent du catalogue',
};

/**
 * A line that is *wrong*, as opposed to one that is merely not actionable. One of these anywhere
 * refuses the whole file, because the write it would produce is a verdict on somebody's year.
 *
 * ⚠ Kept beside the union, like `REINSCRIPTION_NEEDS_ATTENTION`, so a new status cannot be added
 * without deciding which side it falls on — the omission that once made a count say N while the
 * table showed nothing.
 */
export const REINSCRIPTION_SHEET_ERRORS: ReinscriptionSheetRowStatus[] = [
  'NoIdentifier',
  'DuplicateRow',
  'UnknownLevelCode',
  'LevelMismatch',
  'NotAPromotion',
  'LevelRegression',
  'LevelMissing',
];

/** Rows a human has to look at, though only the errors above block the apply. */
export const REINSCRIPTION_SHEET_NEEDS_ATTENTION: ReinscriptionSheetRowStatus[] = [
  ...REINSCRIPTION_SHEET_ERRORS,
  'WillCreateStudent',
  'WillRegisterHeld',
  'WillRegisterWithoutSource',
];

export interface ReinscriptionSheetRowReport {
  sheetRow: number;
  code: string | null;
  studentFullName: string | null;
  fromLevelLabel: string | null;
  toLevelLabel: string | null;
  status: ReinscriptionSheetRowStatus;
  /** Null where the level movement carries no verdict: a final year, a réorientation, no source. */
  outcome: RegistrationStatus | null;
  message: string;
}

export interface ReinscriptionSheetLevelBreakdown {
  fromLevelLabel: string;
  listed: number;
  willRegister: number;
  needsAttention: number;
}

/**
 * What an absence from the roll means for one closing-year registration.
 *
 * ⚠ **Every one of these is held**, `Graduating` included — see `absenteesHeld`. The union says what
 * PGSH could conclude, not whether the row needs a human: all of them do.
 */
export type ReinscriptionSheetAbsenceOutcome =
  /** Absent in the last year of his own text: recorded « Diplômé », Inferred. */
  | 'Graduating'
  /** Absent, and the year already carries a verdict. Left alone; the absence is still unexplained. */
  | 'AlreadyDecided'
  | 'BelowFinalYear'
  | 'NoTextOnRecord'
  | 'NotAPromotion';

export const REINSCRIPTION_SHEET_ABSENCE_LABEL: Record<ReinscriptionSheetAbsenceOutcome, string> = {
  Graduating:     'Fin de cursus déduite',
  AlreadyDecided: 'Année déjà tranchée',
  BelowFinalYear: 'Pas une fin de cursus',
  NoTextOnRecord: 'CNPN inconnu',
  NotAPromotion:  'Pas une promotion',
};

export interface ReinscriptionSheetAbsentee {
  studentId: string;
  studentFullName: string;
  appogee: string | null;
  levelLabel: string;
  outcome: ReinscriptionSheetAbsenceOutcome;
  message: string;
}

export interface ReinscriptionSheetReport {
  fromYearLabel: string;
  toYearLabel: string;
  totalRows: number;
  willRegister: number;
  /** Always fewer than `willRegister`: a final-year repeat is registered without a verdict. */
  willRecordOutcome: number;
  alreadyRegistered: number;
  outsideScope: number;
  /** Students the roll creates because it names them and PGSH does not hold them. */
  createdStudents: number;
  withoutSourceRegistration: number;
  /** Created and frozen: last year of their CNPN with an earlier stage unvalidated. */
  willRegisterHeld: number;
  errorCount: number;
  /** Registrations of the closing year no line mentions — the total of the three below. */
  notCovered: number;
  /**
   * Absentees in the last year of their own text, recorded « Diplômé » (Inferred).
   *
   * ⚠ The only thing an absence decides, and the reason the apply needs `confirmedGraduationCount`:
   * every other write lands on a student the file names, this one lands on students it does not.
   */
  willGraduate: number;
  /** Absentees an absence cannot decide — below a final year, or no CNPN on record. Left untouched. */
  absentNeedingAttention: number;
  /**
   * Absentees already carrying a verdict. The verdict is never touched — Inferred may not overwrite
   * Declared — but the registration is still held, like every other absentee.
   */
  absentAlreadyDecided: number;
  /**
   * Closing-year registrations frozen because the roll does not name them. Equal to `notCovered`:
   * **every** absentee is held, the graduations included.
   *
   * ⚠ Why the graduations too, when their cursus is over: the graduation is *PGSH's inference*, read
   * off a blank cell, not the faculty's statement. A partial roll would end the cursus of people
   * still enrolled with nothing on the row saying a human had looked. Holding costs a genuine
   * graduate nothing and catches what an absence most often really is — a réinscription that has not
   * arrived — because the flag is still standing when somebody registers him by hand.
   *
   * Holds need no confirmed count, unlike `willGraduate`: a hold is released in one click, a
   * graduation ends a cursus. Confirm what cannot be undone.
   */
  absenteesHeld: number;
  /**
   * Addresses manufactured for the created students. ⚠ Never silent: an e-mail is a login, and one
   * colliding with a real address would hand a student another person's account.
   */
  generatedEmails: number;
  canApply: boolean;
  byTargetLevel: Record<string, number>;
  byLevel: ReinscriptionSheetLevelBreakdown[];
  rows: ReinscriptionSheetRowReport[];
  rowsTruncated: boolean;
  /** Only the absentees somebody has to act on — the graduations are a count, not 1 218 names. */
  absentees: ReinscriptionSheetAbsentee[];
  absenteesTruncated: boolean;
}

export interface ReinscriptionSheetUploadRequest {
  file: File;
  fromAcademicYearId: number;
  toAcademicYearId: number;
  /** Echoed back from the preview; a mismatch refuses the apply rather than ending a cursus. */
  confirmedGraduationCount?: number;
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
