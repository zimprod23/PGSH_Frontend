/**
 * Sauvegardes — points de restauration.
 *
 * ⚠ `state`, `schemaMatchesRunning` et `hasUsableUndo` sont **envoyés** par le serveur, jamais
 * recalculés ici. Même règle que `ServicePeriodResponse.State` et
 * `RegistrationHoldResponse.BlocksPlanning` : une règle écrite des deux côtés d'une frontière
 * réseau, c'est deux règles que rien ne peut empêcher de diverger.
 */

/** Pourquoi le point existe — et donc si la rotation a le droit de le supprimer. */
export type BackupKind = 'Scheduled' | 'Named' | 'PreAct';

/** Jusqu'où quelqu'un est allé pour relire l'archive. */
export type BackupVerification = 'Never' | 'Listed' | 'Restored';

/**
 * ⚠ `Unavailable` et `None` sont deux états distincts : « le service ne répond pas » et « il n'y a
 * aucune sauvegarde » appellent des gestes opposés. Les confondre en un seul écran vide est
 * exactement le défaut que cette énumération existe pour empêcher.
 */
export type SafePointState = 'Unavailable' | 'None' | 'SchemaChanged' | 'Stale' | 'Fresh';

export interface CensusLine {
  table: string;
  /** `null` = ce point ne dit rien de cette table. Ce n'est pas 0. */
  count: number | null;
}

export interface BackupPoint {
  id: string;
  label: string;
  kind: BackupKind;
  takenAtUtc: string;
  sizeBytes: number;
  lastMigration: string | null;
  gitSha: string | null;
  note: string | null;
  takenBy: string | null;
  verification: BackupVerification;
  verifiedAtUtc: string | null;
  schemaMatchesRunning: boolean;
  census: CensusLine[];
}

export interface SafePointStatus {
  state: SafePointState;
  location: string;
  /** Renseigné exactement quand `state === 'Unavailable'`. */
  unavailableReason: string | null;
  latest: BackupPoint | null;
  ageMinutes: number | null;
  hasUsableUndo: boolean;
  runningMigration: string | null;
  runningGitSha: string | null;
  totalPoints: number;
  nextScheduledAtUtc: string | null;
  /** ⚠ `false` dans cette version : le realm Keycloak n'est pas sauvegardé avec la base. */
  keycloakRealmCovered: boolean;
}

export interface RestoreImpactLine {
  table: string;
  atSafePoint: number | null;
  now: number | null;
  /** Lignes écrites depuis le point : ce que la restauration effacerait. */
  discarded: number | null;
  /** Lignes disparues depuis le point : ce que la restauration rétablirait. */
  restored: number | null;
}

export interface RestorePlan {
  point: BackupPoint;
  schemaMatchesRunning: boolean;
  runningMigration: string | null;
  /** La migration à appliquer avant de restaurer, quand le schéma a bougé. */
  schemaStepCommand: string | null;
  restoreCommand: string;
  impact: RestoreImpactLine[];
  totalRowsDiscarded: number | null;
  totalRowsRestored: number | null;
  /** Ce que l'opérateur doit saisir pour confirmer — l'identifiant du point. */
  confirmationPhrase: string;
}

export interface CreateBackupPointRequest {
  label: string;
  note?: string;
  kind?: BackupKind;
}
