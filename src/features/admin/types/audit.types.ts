// ─── GET /audit-log ───────────────────────────────────────────────────────────
//
// « Qui a fait ça, et quand ? » — le journal des actes enregistrés.
//
// Trente-cinq commandes écrivaient dans `AuditLogs` depuis des mois et **rien ne pouvait le relire** :
// ni route, ni écran. La table était en écriture seule, donc la trace n'était consultable qu'en
// interrogeant la base à la main. Le 02/09/2026 la question s'est posée pour de vrai — 66 rosters
// apparus sur la 7ᵉ MED, personne ne pouvait dire d'où.

export interface AuditLogRequest {
  action?: string;
  entityType?: string;
  entityId?: string;
  /**
   * Instants **UTC** (ISO 8601), `from` inclus et `to` exclu — jamais des dates pures.
   *
   * ⚠ **C'est le correctif d'un défaut mesuré.** Les bornes étaient des `YYYY-MM-DD` que le serveur
   * résolvait à minuit *UTC*, alors que la colonne Date affiche l'heure du **navigateur** : une
   * entrée écrite le 02/09 à 22:16 UTC se lit « 03/09 00:16 » à Casablanca, et un filtre « du 3 au
   * 3 » la faisait disparaître. La date lue et la date filtrée n'étaient pas la même.
   *
   * La journée appartient au calendrier de celui qui lit, donc c'est **ici** qu'elle se traduit :
   * « au 3 inclus » devient « < 4 septembre 00:00 locale », converti en UTC. Le serveur ne suppose
   * alors aucun fuseau — ce qu'il ne saurait pas faire, le Maroc passant à UTC+0 pendant le ramadan.
   */
  from?: string;
  to?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface AuditLogPage {
  entries: {
    items: AuditLogEntry[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  /**
   * Les codes d'actes présents, avec leur effectif — les puces avec lesquelles on filtre.
   * ⚠ Comptés sur **tout** le journal et non sur la fenêtre courante : réduits au filtre actif, il
   * n'y aurait plus de chemin de retour vers les autres actes.
   */
  actions: AuditActionCount[];
  totalEntries: number;
}

export interface AuditActionCount {
  action: string;
  count: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  /** JSON à plat : les critères de l'acte (levelId, partitionCount…). */
  metadata: string | null;
  createdAt: string;
  /**
   * L'identifiant brut tel qu'il est stocké — le `sub` Keycloak. Envoyé même quand le nom est
   * résolu : c'est la seule chose qui reste vraie si l'annuaire change.
   */
  performedByUserId: string | null;
  /**
   * ⚠ `null` ne veut **pas** dire « personne ». Il n'y a aucune clé étrangère derrière l'identifiant :
   * le compte peut avoir été supprimé, ou la base restaurée sans son royaume Keycloak
   * (`Backups:KeycloakRealmCovered` est `false`). L'entrée survit à ça, et l'écran le dit.
   */
  performedBy: string | null;
}
