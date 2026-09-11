import { useMemo } from 'react';
import {
  Accordion, Alert, Badge, Card, Center, Group, Loader, Paper, Progress, Select, SimpleGrid,
  Stack, Table, Text, Title, Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useGetPromotionFitQuery, useGetPromotionLevelsQuery } from '../api/adminApi';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useListParams } from '../../../common/hooks/useListParams';
import type {
  PromotionFitRow, PromotionFitStageRow, PromotionFitState, StageFitState,
} from '../types/promotionFit.types';

/**
 * « Cette promotion tient-elle ? » — read before cutting, not after publishing.
 *
 * <p>« Charge des services » measures placed cells, so a promotion nobody has cut yet reads as zero
 * pressure — comfortably empty — until the whole day of cutting, laying the axis and arranging is
 * done and somebody is at the « Publier » button. That is the most expensive moment available to
 * discover that a stage is short fourteen places per column. This page needs no plan at all:
 * headcount, durations and the capacities of the authorised services are the entire input.</p>
 *
 * <p>⚠ <b>It warns, it does not place better.</b> The auto-arrange weights by capacity and never
 * reads live occupancy, so it will spread a promotion over services another promotion is already
 * sitting in. The sequel is unchanged — read the number, correct the catalogue, then arrange.</p>
 */

type Filters = { level: string | null };

/** Module-level so its identity is stable — useListParams memoises on it. */
const FILTERS: Filters = { level: '' };

/**
 * ⚠ The five states are five different acts, so they are never merged into « problème » — and the
 * wording says what to do, not merely what is wrong.
 */
const PROMOTION_STATE: Record<PromotionFitState, { color: string; label: string }> = {
  Fits:         { color: 'teal',   label: 'Tient' },
  OverCapacity: { color: 'orange', label: 'En dépassement' },
  Unplaceable:  { color: 'red',    label: 'Impossible à placer' },
  NoStages:     { color: 'gray',   label: 'Aucun stage au catalogue' },
  NoStudents:   { color: 'gray',   label: 'Aucun inscrit' },
};

const STAGE_STATE: Record<StageFitState, { color: string; label: string; hint: string }> = {
  Fits: {
    color: 'teal', label: 'Tient',
    hint: 'Les services autorisés offrent au moins autant de places que la tranche simultanée.',
  },
  OverCapacity: {
    color: 'orange', label: 'Dépassement',
    hint: 'Plaçable, mais au-delà des places déclarées : la publication demandera « autoriser le dépassement ».',
  },
  NoAllowedServices: {
    color: 'red', label: 'Aucun service autorisé',
    hint: 'La répartition automatique refuse ce stage. Saisissez sa liste de services autorisés.',
  },
  NoServiceAdmits: {
    color: 'red', label: 'Aucun service n’admet cette promotion',
    hint: 'Les services autorisés ont des quotas qui excluent ce niveau. Accordez-lui un quota.',
  },
  AllServicesReserved: {
    color: 'red', label: 'Tous les services réservés',
    hint: 'Chaque service autorisé est tenu pour des affectations nominatives : rien ne reste à la rotation.',
  },
  NoDuration: {
    color: 'red', label: 'Durée manquante',
    hint: 'Le stage ne déclare aucune durée : il ne tient sur aucun axe et sa part ne se calcule pas.',
  },
};

function MarginCell({ stage }: { stage: PromotionFitStageRow }) {
  if (stage.state === 'NoDuration') return <Text size="sm" c="dimmed">—</Text>;

  const short = stage.margin < 0;

  return (
    <Text size="sm" fw={600} c={short ? 'orange.7' : 'teal.7'}>
      {short ? stage.margin : `+${stage.margin}`}
    </Text>
  );
}

function StageTable({ promotion }: { promotion: PromotionFitRow }) {
  return (
    <Table.ScrollContainer minWidth={860}>
      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Stage</Table.Th>
            <Table.Th ta="center">Durée</Table.Th>
            <Table.Th ta="center">Colonnes</Table.Th>
            <Table.Th ta="center">À placer</Table.Th>
            <Table.Th ta="center">Places</Table.Th>
            <Table.Th ta="center">Marge</Table.Th>
            <Table.Th>Services</Table.Th>
            <Table.Th>État</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {promotion.stages.map((stage) => {
            const state = STAGE_STATE[stage.state];
            const shared = stage.services.filter((s) => s.alsoAuthorisedBy.length > 0);

            return (
              <Table.Tr key={stage.stageId}>
                <Table.Td><Text size="sm" fw={500}>{stage.stageName}</Text></Table.Td>
                <Table.Td ta="center"><Text size="sm" c="dimmed">{stage.durationInDays} j</Text></Table.Td>
                <Table.Td ta="center"><Text size="sm" c="dimmed">{stage.periods}</Text></Table.Td>
                <Table.Td ta="center"><Text size="sm" fw={500}>{stage.studentsAtOnce}</Text></Table.Td>
                <Table.Td ta="center"><Text size="sm">{stage.places}</Text></Table.Td>
                <Table.Td ta="center"><MarginCell stage={stage} /></Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    <Text size="xs" c="dimmed">
                      {stage.usableServices} / {stage.allowedServices} utilisables
                    </Text>
                    {/* ⚠ Withheld places are named rather than merely missing from the total: a
                        service held for named rosters takes its capacity out of the count, and
                        « il manque N » only reads correctly beside « et j'en ai mis M de côté ». */}
                    {stage.reservedServices > 0 && (
                      <Badge size="xs" variant="light" color="grape">
                        {stage.reservedServices} réservé(s)
                      </Badge>
                    )}
                    {stage.notAdmittingServices > 0 && (
                      <Badge size="xs" variant="light" color="red">
                        {stage.notAdmittingServices} n’admet(tent) pas
                      </Badge>
                    )}
                    {shared.length > 0 && (
                      <Tooltip
                        multiline
                        w={280}
                        label={shared
                          .map((s) => `${s.serviceName} — aussi : ${s.alsoAuthorisedBy.join(', ')}`)
                          .join('\n')}
                      >
                        <Badge size="xs" variant="light" color="blue">
                          {shared.length} partagé(s)
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={state.hint} multiline w={300}>
                    <Badge size="sm" variant="light" color={state.color}>{state.label}</Badge>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export default function PromotionFitPage() {
  const { currentYearId, currentYear } = useAcademicYear();

  // In the URL so a reading survives a refresh and can be sent as a link.
  const { filters, setFilter } = useListParams<Filters>(FILTERS);
  const level = filters.level ?? '';

  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);

  const levelOptions = useMemo(
    () => [...levels]
      .sort((a, b) => a.academicProgram.localeCompare(b.academicProgram) || a.year - b.year)
      .map((l) => ({ value: String(l.id), label: l.label ?? `Année ${l.year}` })),
    [levels],
  );

  const { data: panel, isFetching, isError, error } = useGetPromotionFitQuery(
    {
      academicYearId: currentYearId ?? undefined,
      levelId: level ? Number(level) : undefined,
    },
    { skip: !currentYearId },
  );

  const totals = panel?.totals;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Cette promotion tient-elle&nbsp;?</Title>
        <Text c="dimmed" size="sm">
          Ce que chaque stage demande — la tranche de la promotion qui y est <strong>en même
          temps</strong> — contre ce que ses services autorisés offrent. Tout est calculé sans
          plan&nbsp;: effectif, durées, capacités. À lire <strong>avant</strong> de découper, là où
          « Charge des services » ne répond qu’une fois la répartition faite.
        </Text>
      </div>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Stack gap={2}>
            <Text size="sm" fw={500}>Année universitaire</Text>
            <Badge size="lg" variant="light" color="navy">{currentYear?.label ?? '—'}</Badge>
          </Stack>

          <Select
            label="Promotion"
            placeholder="Toutes"
            data={levelOptions}
            value={level || null}
            onChange={(v) => setFilter('level', v ?? '')}
            clearable
            searchable
            w={240}
          />
        </Group>
      </Paper>

      {!currentYearId ? (
        <Alert color="gray" variant="light">
          Choisissez une année universitaire dans la barre du haut.
        </Alert>
      ) : isError ? (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
          {(error as { data?: { detail?: string } })?.data?.detail
            ?? 'Le panneau n’a pas pu être calculé.'}
        </Alert>
      ) : isFetching && !panel ? (
        <Center h={240}><Loader color="navy" /></Center>
      ) : panel && totals ? (
        <Stack gap="lg" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">Promotions</Text>
              <Text fw={700} size="xl">{totals.promotions}</Text>
              <Text size="xs" c="dimmed">{totals.students} étudiant(s) à placer</Text>
            </Card>
            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">Tiennent</Text>
              <Text fw={700} size="xl" c="teal.7">{totals.promotionsThatFit}</Text>
              <Text size="xs" c="dimmed">sur {totals.promotions}</Text>
            </Card>
            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">En dépassement</Text>
              <Text fw={700} size="xl" c="orange.7">{totals.promotionsOverCapacity}</Text>
              <Text size="xs" c="dimmed">{totals.stagesOverCapacity} stage(s)</Text>
            </Card>
            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">Impossibles à placer</Text>
              <Text fw={700} size="xl" c="red.7">{totals.promotionsUnplaceable}</Text>
              <Text size="xs" c="dimmed">{totals.stagesUnplaceable} stage(s)</Text>
            </Card>
          </SimpleGrid>

          {/* ⚠ The deepest single deficit, named with its stage — never a sum of the deficits, which
              are not paid out of one purse. */}
          {totals.worstShortfall > 0 && (
            <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
              <Text size="sm">
                Le manque le plus profond est de <strong>{totals.worstShortfall} place(s)</strong> par
                colonne, sur <strong>{totals.worstShortfallStage}</strong>. Ce n’est pas un incident de
                placement&nbsp;: c’est de l’arithmétique, et il se reproduira à l’identique à chaque
                re-répartition tant que le catalogue ne change pas.
              </Text>
            </Alert>
          )}

          {panel.notes.map((note) => (
            <Alert key={note} color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="xs">{note}</Text>
            </Alert>
          ))}

          <Accordion variant="separated" radius="md" multiple defaultValue={
            panel.promotions.filter((p) => p.state !== 'Fits').map((p) => String(p.levelId))
          }>
            {panel.promotions.map((promotion) => {
              const state = PROMOTION_STATE[promotion.state];

              return (
                <Accordion.Item key={promotion.levelId} value={String(promotion.levelId)}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="wrap" pr="md">
                      <Group gap="sm">
                        <Text fw={600}>{promotion.levelLabel}</Text>
                        <Badge size="sm" variant="light" color={state.color}>{state.label}</Badge>
                      </Group>
                      <Group gap="lg">
                        <Text size="xs" c="dimmed">
                          {promotion.students} étudiant(s)
                          {promotion.heldStudents > 0 && ` · ${promotion.heldStudents} gelé(s)`}
                        </Text>
                        {promotion.timeline > 0 && (
                          <Text size="xs" c="dimmed">
                            {promotion.timeline} colonne(s) de {promotion.columnDays} j
                          </Text>
                        )}
                        {promotion.shortfall > 0 && (
                          <Text size="xs" fw={600} c="orange.7">
                            −{promotion.shortfall} place(s)
                          </Text>
                        )}
                      </Group>
                    </Group>
                    {promotion.stages.length > 0 && (
                      <Progress.Root size="sm" mt={6}>
                        <Progress.Section
                          value={(promotion.stages.filter((s) => s.state === 'Fits').length
                            / promotion.stages.length) * 100}
                          color="teal"
                        />
                        <Progress.Section
                          value={(promotion.stages.filter((s) => s.state === 'OverCapacity').length
                            / promotion.stages.length) * 100}
                          color="orange"
                        />
                        <Progress.Section
                          value={(promotion.stages.filter((s) => !['Fits', 'OverCapacity'].includes(s.state)).length
                            / promotion.stages.length) * 100}
                          color="red"
                        />
                      </Progress.Root>
                    )}
                  </Accordion.Control>
                  <Accordion.Panel>
                    {promotion.stages.length === 0 ? (
                      <Alert color="gray" variant="light">
                        Aucun stage n’est rattaché à cette promotion&nbsp;: elle n’a pas d’axe, et il
                        n’y a rien à placer tant qu’un stage ne lui est pas donné.
                      </Alert>
                    ) : (
                      <StageTable promotion={promotion} />
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Stack>
      ) : null}
    </Stack>
  );
}
