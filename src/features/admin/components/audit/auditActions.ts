/**
 * Ce que chaque code d'acte veut dire en français.
 *
 * ⚠ **Un code absent de cette table s'affiche tel quel, jamais masqué ni renommé « Autre ».** Le
 * journal existe pour répondre à « qui a fait ça ? » ; un acte que l'écran ne sait pas nommer reste
 * un acte qui a eu lieu, et le cacher ferait exactement le trou que cette page est venue combler.
 * La table est donc une amélioration de lisibilité, pas un filtre : le serveur envoie les codes
 * qu'il a, et c'est lui qui décide de ce qui existe.
 */
const LABELS: Record<string, string> = {
  // Groupes et partitions — les actes qui ont motivé la page.
  GROUPS_AUTO_ARRANGED: 'Découpage en groupes',
  GROUP_CREATED: 'Création d’un groupe',
  GROUP_DELETED: 'Suppression d’un groupe',
  GROUP_EMPTIED: 'Groupe vidé',
  YEAR_GROUPS_EMPTIED: 'Tous les groupes de l’année vidés',
  PARTITIONS_ASSIGNED: 'Découpage en partitions',
  PARTITIONS_CLEARED: 'Partitions supprimées',
  STUDENT_ASSIGNED_TO_GROUP: 'Étudiant affecté à un groupe',

  // Planification.
  ROTATION_CYCLE_APPLIED: 'Bloc de rotation appliqué',
  ROTATION_CYCLE_DELETED: 'Bloc de rotation supprimé',
  STAGE_SERVICE_ORDER_SET: 'Ordre des services modifié',
  STUDENT_DELOCALIZED: 'Délocalisation',

  // Année et inscriptions.
  DELIBERATION_APPLIED: 'Déliberation appliquée',
  REINSCRIPTION_APPLIED: 'Réinscription appliquée',
  REINSCRIPTION_SHEET_APPLIED: 'Rouleau de réinscription appliqué',
  INSCRIPTION_APPLIED: 'Inscriptions importées',
  STUDENT_INSCRIBED: 'Inscription d’un étudiant',
  REGISTRATION_OUTCOME_RECORDED: 'Décision d’année enregistrée',
  REGISTRATION_YEAR_REOPENED: 'Année rouverte',
  REGISTRATION_HOLD_RELEASED: 'Signalement levé',
  ACADEMIC_YEAR_DELETED: 'Année universitaire supprimée',

  // CNPN.
  CNPN_TARGET_APPLIED: 'Rattachement CNPN appliqué',
  CNPN_EFFECTIVITY_APPLIED: 'Règle d’effectivité appliquée',
  CNPN_CURRICULA_CLONED: 'Programme repris d’un autre texte',

  // Sauvegardes.
  BACKUP_POINT_CREATED: 'Point de sauvegarde créé',
  BACKUP_POINT_DELETED: 'Point de sauvegarde supprimé',
  BACKUP_POINT_VERIFIED: 'Point de sauvegarde vérifié',
};

/** Le libellé français, ou le code brut lorsqu'il n'en a pas encore. */
export function auditActionLabel(action: string): string {
  return LABELS[action] ?? action;
}

/** Vrai quand le code n'a pas de libellé — l'écran affiche alors le code, et le dit. */
export function isUnlabelledAction(action: string): boolean {
  return LABELS[action] === undefined;
}

/**
 * Les actes qui **retirent** quelque chose. Sert uniquement à teinter la ligne : un journal où tout
 * se ressemble se lit mal, et c'est la colonne « qu'est-ce qui a été détruit » qu'on parcourt en
 * premier quand quelque chose a mal tourné.
 */
const DESTRUCTIVE = new Set([
  'GROUP_DELETED', 'GROUP_EMPTIED', 'YEAR_GROUPS_EMPTIED', 'PARTITIONS_CLEARED',
  'ROTATION_CYCLE_DELETED', 'ACADEMIC_YEAR_DELETED', 'BACKUP_POINT_DELETED',
]);

export function isDestructiveAction(action: string): boolean {
  return DESTRUCTIVE.has(action);
}

/**
 * Les critères d'un acte, rendus lisibles.
 *
 * ⚠ Le JSON est **analysé dans un try/catch et rendu brut s'il ne parse pas.** Les commandes les plus
 * anciennes interpolent leur métadonnée à la main, donc une valeur contenant un guillemet a pu
 * produire une chaîne qui n'est pas du JSON — c'est précisément ce que `AuditMetadataJson` évite
 * pour les nouvelles. Une entrée illisible reste une entrée : on montre le texte tel quel plutôt que
 * de la faire disparaître.
 */
export function readMetadata(metadata: string | null): MetadataField[] | string | null {
  if (!metadata) return null;

  try {
    const parsed: unknown = JSON.parse(metadata);

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return metadata;

    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => {
      const full = render(value);
      return {
        key,
        full,
        value: full.length > MaxInlineLength ? `${full.slice(0, MaxInlineLength)}…` : full,
        truncated: full.length > MaxInlineLength,
      };
    });
  } catch {
    return metadata;
  }
}

export interface MetadataField {
  key: string;
  /** Ce que la puce affiche — tronqué au-delà de {@link MaxInlineLength}. */
  value: string;
  /** La valeur entière, pour l'infobulle. Jamais perdue. */
  full: string;
  truncated: boolean;
}

/**
 * Au-delà, la puce est coupée et la valeur complète passe en infobulle. Les critères d'un bloc de
 * rotation portent la liste de ses stages : lisible, mais pas sur une ligne de tableau.
 */
const MaxInlineLength = 48;

/**
 * Une valeur JSON rendue en texte.
 *
 * ⚠ **`String(value)` ne suffit pas, et le défaut était visible dès la première vraie donnée** :
 * `ApplyRotationCycleCommand` écrit `stages` comme un tableau d'objets, que `String` transforme en
 * « [object Object],[object Object]… ». La colonne des critères existe pour dire *ce qui a été
 * demandé à l'acte* ; une valeur illisible y est pire qu'absente, parce qu'elle occupe la place de
 * la réponse. Trouvé en pilotant l'écran le 04/09/2026, sur la ligne d'un bloc de rotation réel.
 *
 * Les tableaux de valeurs simples restent joints — `stageIds : 3, 6, 5, 4, 7` se lit mieux que sa
 * forme JSON — et tout ce qui contient un objet est sérialisé.
 */
function render(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (Array.isArray(value)) {
    return value.every((item) => item === null || typeof item !== 'object')
      ? value.join(', ')
      : JSON.stringify(value);
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
