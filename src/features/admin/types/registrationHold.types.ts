import type { RegistrationStatus } from '../../../common/types';

/**
 * Why a registration is held back from planning until somebody looks at it.
 *
 * ⚠ Each value is a fact PGSH established *at the moment the flag was raised*, never a live
 * re-evaluated condition. The debt that raised `OutstandingPriorStages` may be cleared next week;
 * what lifts the hold is somebody saying so, not the condition quietly ceasing to hold — otherwise a
 * student would slip back into a répartition with nobody having decided that he should.
 */
export type RegistrationHoldReason =
  /**
   * Registered into the last year of his own CNPN while stages from earlier years still read
   * unvalidated.
   *
   * ⚠ Not a refusal wearing another name. The faculty's roll names him as coming back and it
   * outranks our reading of a stage record that is mostly not keyed in yet — 182 of the 651
   * 7ᵉ année Médecine of the 2026-2027 roll. The registration is created; the hold says he may not
   * start his final year's stages before the earlier ones are settled.
   */
  | 'OutstandingPriorStages'
  /**
   * He holds a registration in the closing year and the roll does not name him. The absence says he
   * is not coming back but not why — a defence, an abandon, an exclusion, or a réinscription that
   * has not arrived — and those call for opposite acts.
   */
  | 'AbsentFromReinscriptionRoll'
  /**
   * He exists because a file named him, and PGSH holds almost nothing else about him — the
   * réinscription roll carries a code and a name and no more.
   *
   * ⚠ **This one does not freeze.** His dossier is *thin*, not *wrong*: nothing about a missing date
   * de naissance says he may not rotate through a service. He is cut into a roster and planned like
   * anyone else, and the flag is there so his file gets finished.
   */
  | 'IncompleteStudentFile';

export const REGISTRATION_HOLD_REASON_LABEL: Record<RegistrationHoldReason, string> = {
  OutstandingPriorStages: 'Stages antérieurs non validés',
  AbsentFromReinscriptionRoll: 'Absent du fichier de réinscription',
  IncompleteStudentFile: 'Dossier à compléter',
};

/** Which holds to list. `Active` is the worklist; `Released` is the audit trail. */
export type RegistrationHoldFilter = 'Active' | 'Released' | 'All';

export interface RegistrationHold {
  id: string;
  registrationId: string;
  studentId: string;
  studentFullName: string;
  cne: string | null;
  appogee: string | null;
  levelLabel: string;
  academicYearLabel: string;
  registrationStatus: RegistrationStatus;
  reason: RegistrationHoldReason;
  reasonLabel: string;
  /**
   * What was true when the hold was raised, in the sentence the operator was shown at the time.
   *
   * ⚠ Not re-derived on read. If it no longer holds, that is precisely the discovery that releases
   * the flag — a justification that silently rewrites itself is one nobody can audit.
   */
  evidence: string;
  /** What has to happen before it can be lifted, in the operator's own terms. */
  remedy: string;
  /**
   * Whether this flag actually withdraws the registration from planning.
   *
   * ⚠ **Sent by the server, never re-derived here.** Which reasons freeze is a domain rule; a screen
   * deciding it for itself would be a second copy of that rule, free to disagree the day a reason is
   * added. It is the difference between « il est gelé » and « sa fiche est à compléter » — the first
   * is holding a promotion up, the second is not holding up anything.
   */
  blocksPlanning: boolean;
  raisedOn: string;
  releasedOn: string | null;
  releaseNote: string | null;
}

export interface RegistrationHoldsRequest {
  /** Omitted resolves to the current year — never « toutes les années ». */
  academicYearId?: number;
  reason?: RegistrationHoldReason;
  filter?: RegistrationHoldFilter;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface ReleaseHoldRequest {
  holdId: string;
  /** Required by the server: the row survives its release so the file can say who cleared him. */
  releaseNote: string;
}

export interface ReleaseHoldReport {
  registrationId: string;
  released: RegistrationHoldReason;
  /** Unreleased flags still standing on the same registration, blocking or advisory. */
  stillHeld: number;
  /**
   * Whether any of those actually withdraws the registration from planning. ⚠ Distinct from
   * `stillHeld`: a student left carrying only « dossier à compléter » is on the worklist and **is**
   * planned, and telling the operator he is still frozen would be false.
   */
  stillBlocked: boolean;
}
