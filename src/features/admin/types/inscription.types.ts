// ─── Inscription — the third act of the year ──────────────────────────────────
//
// The déliberation writes verdicts onto the closing year's registrations; the réinscription reads
// those verdicts and creates the next year's. Both start from a registration the student already
// holds, so neither can see the people this act exists for: the September intake, transfers arriving
// from another faculty, returners, and réorientations. They hold no registration to be read.

/**
 * What one row will do — or why nothing can.
 *
 * The four writing actions partition on two questions: does PGSH already hold this person, and is he
 * entering the programme he was already in. « Sous convention » is not one of them — an étudiant sous
 * convention is any of the four, and it is a column any row may carry.
 */
export type InscriptionAction =
  | 'NewEntrant'
  | 'TransferIn'
  | 'Returning'
  | 'ProgrammeChange'
  /** Already registered this year. **Not an error** — the file is meant to be re-sent. */
  | 'AlreadyRegistered'
  | 'NoIdentifier'
  | 'MissingName'
  | 'DuplicateInFile'
  | 'IdentifierConflict'
  | 'OriginRequired'
  | 'InvalidValue'
  | 'FinalYearBlocked'
  | 'EmailUnavailable';

/** Rows that write. */
export const INSCRIPTION_ACTION_WRITES: InscriptionAction[] = [
  'NewEntrant',
  'TransferIn',
  'Returning',
  'ProgrammeChange',
];

/**
 * Rows that block the apply. ⚠ `AlreadyRegistered` is deliberately absent: this act creates
 * identities, so the file has to survive being re-sent with the late arrivals appended.
 */
export const INSCRIPTION_ACTION_IS_ERROR = (action: InscriptionAction) =>
  !INSCRIPTION_ACTION_WRITES.includes(action) && action !== 'AlreadyRegistered';

export const INSCRIPTION_ACTION_LABEL: Record<InscriptionAction, string> = {
  NewEntrant:         'Nouvel inscrit',
  TransferIn:         'Transfert entrant',
  Returning:          'Retour',
  ProgrammeChange:    'Réorientation',
  AlreadyRegistered:  'Déjà inscrit',
  NoIdentifier:       'Sans identifiant',
  MissingName:        'Nom manquant',
  DuplicateInFile:    'Doublon dans le fichier',
  IdentifierConflict: 'Identifiant déjà pris',
  OriginRequired:     'Provenance requise',
  InvalidValue:       'Valeur illisible',
  FinalYearBlocked:   'Dernière année bloquée',
  EmailUnavailable:   'Aucune adresse libre',
};

export interface InscriptionRowReport {
  sheetRow: number;
  cne: string | null;
  appogee: string | null;
  studentFullName: string;
  action: InscriptionAction;
  /** A **person** is created, not merely a registration. The irreversible half of this act. */
  createsStudent: boolean;
  /**
   * The address PGSH manufactured because the file carried none. ⚠ An address is a login —
   * `SyncUserMiddleware` matches a Keycloak subject on it — so this is never hidden.
   */
  generatedEmail: string | null;
  recordsOrigin: boolean;
  message: string;
}

export interface InscriptionReport {
  academicYearLabel: string;
  levelLabel: string;
  totalRows: number;
  /** The number the confirmation has to name. */
  willCreateStudents: number;
  willRegister: number;
  newEntrants: number;
  transfersIn: number;
  returning: number;
  programmeChanges: number;
  /** Skipped, not refused. */
  alreadyRegistered: number;
  errorCount: number;
  generatedEmails: number;
  originsRecorded: number;
  canApply: boolean;
  byAction: Record<string, number>;
  rows: InscriptionRowReport[];
  rowsTruncated: boolean;
}

/**
 * ⚠ `levelId` is **required**, and it is the guard rather than a filter: nobody on the sheet holds a
 * registration the promotion could be read from instead.
 */
export interface InscriptionScopeRequest {
  levelId: number;
  academicYearId?: number;
}

export interface InscriptionUploadRequest extends InscriptionScopeRequest {
  file: File;
  /** Echoed back from the preview. A mismatch refuses the apply rather than creating people. */
  confirmedStudentCount?: number;
}

/**
 * One student, typed into a form. Every value is a string on purpose — it goes through the same
 * parser a sheet cell does, so the form and the file cannot disagree about what « 03/09/2006 » means.
 */
export interface InscribeStudentRequest extends InscriptionScopeRequest {
  cne?: string;
  appogee?: string;
  lastName?: string;
  firstName?: string;
  cin?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  bacYear?: string;
  bacSeries?: string;
  accessGrade?: string;
  agreement?: string;
  originInstitution?: string;
  originCountry?: string;
  originLastYearCompleted?: string;
  equivalenceReference?: string;
  equivalenceDate?: string;
}
