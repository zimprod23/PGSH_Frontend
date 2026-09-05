import { useMemo } from 'react';
import {
  Alert, Badge, Card, Center, Group, Loader, Pagination, Paper, Select, Stack, Switch, Text,
  Title, Tooltip,
} from '@mantine/core';
import { IconInfoCircle, IconMapSearch, IconSchool } from '@tabler/icons-react';
import {
  useGetHospitalStageCoverageQuery,
  useGetHospitalsQuery,
  useGetPromotionLevelsQuery,
  useGetRosterPlacementsQuery,
  useGetServicesQuery,
  useGetStagesQuery,
} from '../api/adminApi';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useListParams } from '../../../common/hooks/useListParams';
import { PATHS } from '../../../routes/paths';
import { HospitalCoveragePanel } from '../components/placements/HospitalCoveragePanel';
import { RosterPlacementCard } from '../components/placements/RosterPlacementCard';
import type { PlacementMatch, RosterPlacementSummary } from '../types/placement.types';

/**
 * « Placements » — quel groupe va déjà là où cet étudiant doit aller.
 *
 * <p>Trois demandes réelles motivent cette page : « cet étudiant fait tous ses stages à l'hôpital
 * militaire », « ces deux étudiantes ensemble, stage A en S1 et stage B en S2 », « ces frères dans
 * le même service ». Elles se résolvent toutes par un <b>roster</b> — jamais par une délocalisation,
 * et pas non plus par un transfert « vers un service » : un transfert définitif déplace
 * <code>Registration.AcademicGroupId</code>, il envoie donc vers un <i>groupe</i>, qui tire toujours
 * ses services des cellules.</p>
 *
 * <p>La réponse la moins chère est « un groupe y va déjà » : l'étudiant est alors à un transfert
 * près, sans cellule épinglée et sans roster de deux inventé. Elle était <b>inatteignable</b> —
 * rien ne permettait de demander quel groupe est au HMIMV, donc il fallait lire la grille de chaque
 * stage à l'œil, et la voie pratique devenait la plus coûteuse.</p>
 */

type Filters = {
  level: string | null;
  hospital: string | null;
  service: string | null;
  stage: string | null;
  exclusive: string | null;
};

/**
 * Ce qu'une réponse vide veut dire — et il y a **trois** réponses, pas deux.
 *
 * ⚠ Trouvé en pilotant l'écran, pas par un test : la 6ᵉ MED 2026-2027 n'a **aucun groupe**, et le
 * message écrit pour « des groupes existent mais rien n'est réparti » disait alors « Les 0 groupe(s)
 * de cette promotion ne tiennent aucune cellule » en renvoyant vers la répartition — alors que le
 * premier geste est de **découper** la promotion. Une phrase qui décrit un état que la donnée
 * contredit envoie résoudre le mauvais problème, ce qui est précisément le défaut que
 * `placedRosters` existe pour éviter. Trois états, trois phrases, trois couleurs — jamais une
 * phrase paramétrée. Même famille que `RepartitionSummary.declaredSlotCount` et `ExportNotes`.
 */
function EmptyAnswer({ summary }: { summary: RosterPlacementSummary }) {
  const answer = summary.promotionRosters === 0
    ? {
      color: 'orange' as const,
      title: 'Cette promotion n’a aucun groupe',
      body: 'Personne n’a encore découpé cette promotion en rosters, donc il n’y a rien à placer '
          + 'nulle part. Commencez par « Groupes » — répartition automatique — puis revenez ici '
          + 'une fois la rotation posée.',
    }
    : summary.placedRosters === 0
      ? {
        color: 'orange' as const,
        title: 'Rien n’est encore réparti pour cette promotion',
        body: `Les ${summary.promotionRosters} groupe(s) de cette promotion existent mais ne `
            + 'tiennent aucune cellule de planification. La question du lieu ne se pose pas '
            + 'encore : répartissez la promotion (Bloc de rotation, ou la grille d’un stage).',
      }
      : {
        color: 'gray' as const,
        title: 'Aucun groupe ne correspond',
        body: `${summary.placedRosters} groupe(s) sont répartis, et aucun ne satisfait ce critère. `
            + 'Essayez « Exclusivement » désactivé, un autre lieu, ou envisagez d’épingler les '
            + 'cellules d’un groupe existant.',
      };

  return (
    <Alert
      color={answer.color}
      variant="light"
      icon={<IconMapSearch size={18} />}
      title={answer.title}
    >
      <Text size="sm">{answer.body}</Text>
    </Alert>
  );
}

/** Au niveau du module : `useListParams` mémorise sur son identité. */
const FILTERS: Filters = { level: '', hospital: '', service: '', stage: '', exclusive: '' };

const PAGE_SIZE = 25;

export default function PlacementsPage() {
  const { currentYearId, currentYear } = useAcademicYear();

  // Dans l'URL : une recherche de placement se partage (« regarde le groupe 102 ») et survit à un
  // rafraîchissement. L'année reste hors de là — c'est l'état global de la barre du haut.
  const { filters, setFilter, setFilters, page, setPage } = useListParams<Filters>(FILTERS);

  const levelId = filters.level ? Number(filters.level) : undefined;
  const hospitalId = filters.hospital ? Number(filters.hospital) : undefined;
  const serviceId = filters.service ? Number(filters.service) : undefined;
  const stageId = filters.stage ? Number(filters.stage) : undefined;
  const hasTarget = hospitalId != null || serviceId != null;
  const match: PlacementMatch = filters.exclusive === '1' ? 'Exclusively' : 'Anywhere';

  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  const { data: hospitals } = useGetHospitalsQuery({ pageNumber: 1, pageSize: 200 });
  const { data: services } = useGetServicesQuery({ pageNumber: 1, pageSize: 200 });

  // Le catalogue des stages est borné par la promotion : sans elle la liste n'a pas de sens ici.
  const { data: stages } = useGetStagesQuery(
    { levelId, pageNumber: 1, pageSize: 100 },
    { skip: levelId == null },
  );

  const levelOptions = useMemo(
    () => [...levels]
      .sort((a, b) => a.academicProgram.localeCompare(b.academicProgram) || a.year - b.year)
      .map((l) => ({ value: String(l.id), label: l.label ?? `Année ${l.year}` })),
    [levels],
  );

  const hospitalOptions = useMemo(
    () => (hospitals?.items ?? []).map((h) => ({ value: String(h.id), label: h.name })),
    [hospitals],
  );

  // Le nom d'un service n'est pas unique — « Pharmacie » existe dans 9 hôpitaux — donc l'option
  // porte son hôpital, sinon la liste offre neuf lignes identiques.
  const serviceOptions = useMemo(
    () => (services?.items ?? []).map((s) => ({
      value: String(s.id),
      label: `${s.name} — ${s.hospitalName}`,
    })),
    [services],
  );

  const stageOptions = useMemo(
    () => (stages?.items ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [stages],
  );

  const { data, isFetching } = useGetRosterPlacementsQuery(
    {
      levelId: levelId!,
      academicYearId: currentYearId ?? undefined,
      stageId,
      serviceId,
      hospitalId,
      match,
      pageNumber: page,
      pageSize: PAGE_SIZE,
    },
    // La promotion est la borne de toute la lecture : sans elle il n'y a rien à demander, et le
    // serveur refuserait (400). Une garde côté client vaut mieux qu'un aller-retour perdu.
    { skip: levelId == null || currentYearId == null },
  );

  // La faisabilité ne se pose que d'un hôpital. La déduire de l'hôpital d'un service serait un
  // second avis sur une question que l'utilisateur n'a pas posée.
  //
  // ⚠ `currentData`, jamais `data`. RTK Query garde dans `data` le dernier résultat obtenu *quel
  // que soit* l'argument — donc un panneau lu sur `data` survit au `skip` et continue d'afficher
  // « Faisabilité — Hôpital Militaire » alors que le filtre hôpital vient d'être vidé, et affiche
  // l'ancien hôpital pendant le chargement du nouveau. Un panneau qui **nomme** son hôpital ne peut
  // pas se permettre ça : ce n'est pas une donnée en retard, c'est une phrase fausse.
  // `currentData` est vide dès que l'argument change ou que la requête est ignorée.
  const { currentData: coverage } = useGetHospitalStageCoverageQuery(
    { hospitalId: hospitalId!, levelId: levelId! },
    { skip: hospitalId == null || levelId == null },
  );

  const rosters = data?.rosters;
  const summary = data?.summary;
  const shown = rosters?.items.length ?? 0;
  const total = rosters?.totalCount ?? 0;
  const firstOnPage = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Placements</Title>
        <Text c="dimmed" size="sm">
          Quel groupe va déjà là où un étudiant doit aller. Une demande nominative — « tous ses
          stages à l’hôpital militaire », « ces deux-là ensemble » — se résout par un&nbsp;
          <strong>roster</strong>, et le geste le moins cher est de transférer l’étudiant vers un
          groupe qui y va déjà&nbsp;: rien à épingler, rien à créer.
        </Text>
      </div>

      <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />} p="sm">
        <Text size="xs">
          <strong>Du moins cher au plus cher&nbsp;:</strong> ① transférer vers un roster qui y va
          déjà · ② <em>un</em> roster partagé par contrainte récurrente — en 2024-2025 la 6ᵉ année
          tenait cinq groupes entièrement au HMIMV, de 6-7 étudiants chacun · ③ épingler les cellules
          d’un roster existant, en acceptant que cela déplace tout le groupe · ④ un roster dédié de
          1-2 étudiants, en dernier. ⚠ Une cohorte est <strong>atomique</strong> dans l’équilibrage
          des services&nbsp;: un roster de deux dépense une place dimensionnée pour sept.
        </Text>
      </Alert>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Stack gap={2}>
            <Text size="sm" fw={500}>Année universitaire</Text>
            <Badge size="lg" variant="light" color="navy">{currentYear?.label ?? '—'}</Badge>
          </Stack>

          <Select
            label="Promotion"
            placeholder="Obligatoire"
            data={levelOptions}
            value={filters.level || null}
            onChange={(v) => setFilters({ level: v ?? '', stage: '' })}
            searchable
            clearable
            w={220}
            required
          />

          {/* ⚠ Hôpital et service s'excluent — un service appartient déjà à un hôpital, et le
              serveur refuse les deux ensemble (400). Plutôt que de désactiver un contrôle, choisir
              l'un efface l'autre : l'état contradictoire devient irreprésentable. */}
          <Select
            label="Hôpital"
            placeholder="Tous"
            data={hospitalOptions}
            value={filters.hospital || null}
            onChange={(v) => setFilters({ hospital: v ?? '', service: '' })}
            searchable
            clearable
            w={230}
          />

          <Select
            label="Service"
            placeholder="Tous"
            data={serviceOptions}
            value={filters.service || null}
            onChange={(v) => setFilters({ service: v ?? '', hospital: '' })}
            searchable
            clearable
            w={260}
          />

          <Select
            label="Stage"
            placeholder="Tous"
            data={stageOptions}
            value={filters.stage || null}
            onChange={(v) => setFilter('stage', v ?? '')}
            searchable
            clearable
            disabled={levelId == null}
            w={220}
          />

          {/* Désactivé plutôt que refusé : « exclusivement » n'a rien à quoi être exclusif tant
              qu'aucun lieu n'est nommé, et le serveur le refuse. La raison est dans l'infobulle. */}
          <Tooltip
            label={hasTarget
              ? 'Ne garder que les groupes dont TOUTE la rotation est au lieu choisi. '
                + '« Tout au militaire » n’est pas « il y va aussi ».'
              : 'Choisissez d’abord un hôpital ou un service : « exclusivement » suppose un lieu '
                + 'auquel se comparer.'}
            withArrow
            multiline
            w={280}
          >
            <div>
              <Switch
                label="Exclusivement"
                checked={match === 'Exclusively'}
                disabled={!hasTarget}
                onChange={(e) => setFilter('exclusive', e.currentTarget.checked ? '1' : '')}
                mb={6}
              />
            </div>
          </Tooltip>
        </Group>
      </Paper>

      {levelId == null ? (
        <Card withBorder radius="md" p="xl">
          <Center>
            <Stack align="center" gap="xs">
              <IconSchool size={32} opacity={0.4} />
              <Text fw={500}>Choisissez une promotion</Text>
              <Text size="sm" c="dimmed" ta="center" maw={440}>
                Un roster est identifié par (année, promotion, numéro)&nbsp;: un numéro de groupe
                sans sa promotion n’identifie rien.
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <>
          {coverage && <HospitalCoveragePanel coverage={coverage} />}

          {isFetching && !data ? (
            <Center h={200}><Loader color="navy" /></Center>
          ) : summary && rosters ? (
            <>
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Text size="sm" c="dimmed">
                  {/* Une liste bornée a un mode de défaillance que l'illimitée n'avait pas : sa
                      dernière page ressemble à une sélection vide. Elle dit donc ce qu'elle montre. */}
                  {total === 0
                    ? `0 groupe sur ${summary.promotionRosters} dans la promotion`
                    : `${firstOnPage}–${firstOnPage + shown - 1} sur ${total} groupe(s)`}
                  {hasTarget && total > 0 && ' correspondant au lieu demandé'}
                  {' · '}
                  {summary.placedRosters} groupe(s) répartis sur {summary.promotionRosters}
                </Text>
                {isFetching && <Loader size="xs" color="navy" />}
              </Group>

              {total === 0 && <EmptyAnswer summary={summary} />}

              <Stack gap="sm">
                {rosters.items.map((roster) => (
                  <RosterPlacementCard
                    key={roster.groupId}
                    roster={roster}
                    groupHref={`${PATHS.ADMIN.ROOT}/groups/${roster.groupId}`}
                    match={match}
                    hasTarget={hasTarget}
                  />
                ))}
              </Stack>

              {rosters.totalPages > 1 && (
                <Group justify="center">
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={rosters.totalPages}
                    color="navy"
                  />
                </Group>
              )}
            </>
          ) : null}
        </>
      )}
    </Stack>
  );
}
