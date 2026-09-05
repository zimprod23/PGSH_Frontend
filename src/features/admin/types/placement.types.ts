// ─── GET groups/placements · GET hospitals/{id}/stage-coverage ────────────────
//
// « Quel groupe va déjà là où cet étudiant doit aller ? » et « cet hôpital peut-il l'accueillir ? ».
//
// Ces deux lectures existent pour rendre atteignable la réponse la moins chère à une demande
// nominative — « transférer l'étudiant vers un roster qui y va déjà ». Avant elles, il fallait lire
// la grille de planification de chaque stage à l'œil, et la voie pratique devenait donc la plus
// coûteuse : créer un groupe de un ou deux étudiants.

/**
 * Où se trouvent les cellules d'un roster **par rapport à un hôpital**.
 *
 * ⚠ `Unplaced` n'est pas un détail de complétude, c'est la garde. « Toutes ses cellules sont au
 * HMIMV » est **vrai à vide** d'un roster que personne n'a réparti : lu comme `Entire`, il
 * ressortirait comme la meilleure correspondance de la promotion, tirée d'une absence totale de
 * preuve. C'est aussi l'état de la base aujourd'hui, qui tient 0 cellule sur presque toutes les
 * années. Le serveur tranche (`RosterHospitalPlacementTest`) ; l'écran ne recalcule rien — même
 * règle que `ServicePeriodResponse.State` et `RegistrationHoldResponse.blocksPlanning`.
 */
export type RosterHospitalPlacement = 'Unplaced' | 'Elsewhere' | 'Partial' | 'Entire';

/**
 * Ce que le lieu nommé doit expliquer de la rotation d'un roster.
 *
 * `Exclusively` est la demande « tout au militaire » ; `Anywhere` est « il y va aussi », qui est une
 * réponse réelle mais pas celle-là.
 */
export type PlacementMatch = 'Anywhere' | 'Exclusively';

export interface RosterPlacementsRequest {
  /** La promotion. Obligatoire : un numéro de groupe sans sa promotion n'identifie rien. */
  levelId: number;
  academicYearId?: number;
  stageId?: number;
  /** Exclusif avec `hospitalId` — un service appartient déjà à un hôpital. */
  serviceId?: number;
  hospitalId?: number;
  match?: PlacementMatch;
  pageNumber?: number;
  pageSize?: number;
}

export interface RosterPlacementsResponse {
  academicYearId: number;
  levelId: number;
  rosters: {
    items: RosterPlacementResponse[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: RosterPlacementSummary;
}

/**
 * ⚠ `placedRosters` est le chiffre qui donne son sens à une liste vide. « Personne n'y va » et
 * « rien n'est encore réparti » appellent des gestes opposés, et un zéro nu se lit comme le premier.
 * Même forme que `RepartitionSummary.declaredSlotCount` et les notes d'export.
 */
export interface RosterPlacementSummary {
  /** Rosters de cette (année, promotion). « Non réparti » n'a pas de niveau et n'en est jamais un. */
  promotionRosters: number;
  /** Parmi eux, combien tiennent au moins une cellule de planification. */
  placedRosters: number;
  /** Combien satisfont le critère de lieu — le même nombre que `rosters.totalCount`. */
  matchedRosters: number;
  promotionStages: number;
}

export interface RosterPlacementResponse {
  groupId: number;
  label: string;
  groupNumber: number;
  rotationGroup: string | null;
  studentCount: number;
  stageCount: number;
  placedStageCount: number;
  /** 0 quand aucun lieu n'a été nommé. */
  matchedStageCount: number;
  /**
   * `null` quand l'appelant n'a nommé aucun hôpital — « la question n'a pas été posée » n'est pas
   * le même fait que `Elsewhere`.
   */
  hospitalPlacement: RosterHospitalPlacement | null;
  stages: RosterStagePlacementResponse[];
}

export interface RosterStagePlacementResponse {
  stageId: number;
  stageName: string;
  /** `null` quand aucun critère de lieu n'a été donné — à distinguer de « ne correspond pas ». */
  matches: boolean | null;
  /**
   * Vide quand le roster a bien une cohorte pour ce stage mais aucune cellule : c'est une réponse
   * utile (« ce stage reste à répartir pour ce groupe »), pas un trou dans la lecture.
   */
  services: RosterServicePlacementResponse[];
}

/**
 * Un service où un roster se tient pour un stage, avec les créneaux qu'il y occupe. Le regroupement
 * par service **est** le pliage : une série `SingleService` de trois colonnes est une entrée portant
 * `[4, 5, 6]`, pas trois lignes.
 */
export interface RosterServicePlacementResponse {
  serviceId: number;
  serviceName: string;
  hospitalId: number;
  hospitalName: string;
  periodNumbers: number[];
}

// ─── GET hospitals/{hospitalId}/stage-coverage ────────────────────────────────

/**
 * Ce qu'un hôpital peut accueillir d'un stage, lu sur `Stage.AllowedServices`.
 *
 * ⚠ `NoServicesAuthored` n'est **pas** un « non couvert » plus faible. Une liste de services
 * autorisés vide n'est pas appliquée par le serveur, donc le stage est ouvert à *tous* les
 * services : le blanc dit « personne n'a saisi la liste », pas « cet hôpital est exclu ». Les deux
 * appellent des gestes opposés — changer d'hôpital, ou saisir la liste.
 */
export type StageHospitalCoverage = 'NoServicesAuthored' | 'NotAtThisHospital' | 'Covered';

export interface HospitalStageCoverageResponse {
  hospitalId: number;
  hospitalName: string;
  levelId: number;
  levelLabel: string;
  stageCount: number;
  coveredStageCount: number;
  /** Compté à part : ces stages ne sont pas « non couverts », leur liste n'est pas saisie. */
  unauthoredStageCount: number;
  stages: StageCoverageResponse[];
}

export interface StageCoverageResponse {
  stageId: number;
  stageName: string;
  coverage: StageHospitalCoverage;
  allowedServiceCount: number;
  servicesAtHospitalCount: number;
  /** Les services que l'hôpital offre pour ce stage — « oui, et voici où », pas seulement « oui ». */
  servicesAtHospital: CoverageServiceResponse[];
}

export interface CoverageServiceResponse {
  serviceId: number;
  name: string;
}
