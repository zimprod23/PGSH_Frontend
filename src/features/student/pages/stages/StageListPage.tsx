import {
  Alert,
  Badge,
  Card,
  Center,
  Container,
  Group,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  rem,
} from '@mantine/core';
import { IconInfoCircle, IconStethoscope, IconUsersGroup } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useGetCurrentStudentQuery,
  useGetStagesQuery,
  useGetStudentParcoursQuery,
} from '../../api/studentApi';
import { AcademicYearRail } from '../../components/AcademicYearRail';
import { ParcoursStageCard, ParcoursStageCardSkeleton } from '../../components/ParcoursStageCard';
import { ParcoursTotalsBar } from '../../components/ParcoursTotalsBar';
import { RegistrationBadge } from '../../components/RegistrationBadge';
import type { ParcoursStage, ParcoursYear } from '../../types/parcours.types';
import type { StageSummaryResponse } from '../../types/stage.types';
import { STAGE_STATE, stageStateOf, type StageState } from '../../utils/stageState';
import { PATHS } from '../../../../routes/paths';

type Filter = 'all' | StageState;

// Order the tabs follow. "Non planifiés" only ever applies to the year in progress: a past year's
// programme is settled, and offering the filter there would always show an empty list.
const FILTERS: StageState[] = ['ongoing', 'awaiting', 'validated', 'failed', 'planned', 'unplanned'];

const EMPTY_MESSAGE: Record<Filter, string> = {
  all:       'Aucun stage pour cette année.',
  ongoing:   'Aucun stage en cours.',
  awaiting:  'Aucun stage en attente de note.',
  validated: 'Aucun stage validé cette année.',
  failed:    'Aucun stage non validé — tant mieux.',
  planned:   'Aucun stage planifié.',
  unplanned: 'Tous les stages du programme vous ont été affectés.',
};

export default function StageListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  // The selected year lives in the URL, not in component state: the dashboard links straight to one
  // ("?year=<registrationId>"), and a year the student is reading is worth being able to share and
  // to come back to with the browser's Back button.
  const [searchParams, setSearchParams] = useSearchParams();
  const registrationId = searchParams.get('year');

  const selectYear = (id: string) => {
    searchParams.set('year', id);
    setSearchParams(searchParams, { replace: true });
    setFilter('all');
  };

  const { data: student, isLoading: studentLoading } = useGetCurrentStudentQuery();

  // Pause/resume/transfer mutations live in other API slices and cannot invalidate this one, so the
  // parcours is refetched on mount rather than served from a stale snapshot.
  const { data: parcours, isLoading: parcoursLoading } = useGetStudentParcoursQuery(
    student?.id ?? '',
    { skip: !student?.id, refetchOnMountOrArgChange: true },
  );

  const years = useMemo<ParcoursYear[]>(() => parcours?.years ?? [], [parcours]);

  // Derived, not synchronised: with no explicit pick the page lands on the year in progress, and
  // falls back to the most recent registration for a student between two enrolments, whose current
  // year simply has no registration yet.
  const selected =
    years.find((y) => y.registrationId === registrationId) ??
    years.find((y) => y.isCurrent) ??
    years[0] ??
    null;

  // Stages of the programme that carry no assignment yet — meaningful only for the year in
  // progress, and only there is the catalogue worth fetching.
  const { data: catalogPage, isLoading: catalogLoading } = useGetStagesQuery(
    { levelId: selected?.levelId, pageSize: 100 },
    { skip: !selected?.isCurrent || !selected?.levelId },
  );

  const unplanned = useMemo<StageSummaryResponse[]>(() => {
    if (!selected?.isCurrent) return [];
    const assigned = new Set(selected.stages.map((s) => s.stageId));
    return (catalogPage?.items ?? []).filter((s) => !assigned.has(s.id));
  }, [selected, catalogPage]);

  const counts = useMemo<Record<Filter, number>>(() => {
    const stages = selected?.stages ?? [];
    const base = {
      all:       stages.length + unplanned.length,
      planned:   selected?.totals.planned ?? 0,
      ongoing:   selected?.totals.ongoing ?? 0,
      awaiting:  selected?.totals.awaitingVerdict ?? 0,
      validated: selected?.totals.validated ?? 0,
      failed:    selected?.totals.failed ?? 0,
      unplanned: unplanned.length,
    };
    return base;
  }, [selected, unplanned]);

  const visibleFilters = FILTERS.filter(
    (f) => counts[f] > 0 || (f === 'unplanned' && selected?.isCurrent),
  );

  // Switching year can empty the active filter; falling back to "Tous" here rather than resetting
  // the state in an effect keeps the render a pure function of the selected year.
  const activeFilter: Filter = filter !== 'all' && counts[filter] === 0 ? 'all' : filter;

  const attempts: ParcoursStage[] = selected?.stages ?? [];
  const shownAttempts =
    activeFilter === 'unplanned'
      ? []
      : activeFilter === 'all'
        ? attempts
        : attempts.filter((a) => stageStateOf(a) === activeFilter);
  const shownUnplanned = activeFilter === 'all' || activeFilter === 'unplanned' ? unplanned : [];

  const openStage = (stageId: number, assignmentId?: string) =>
    navigate(
      `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}/${stageId}` +
      (assignmentId ? `?attempt=${assignmentId}` : ''),
    );

  const loading = studentLoading || parcoursLoading;
  const isEmpty = shownAttempts.length === 0 && shownUnplanned.length === 0;

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Mes Stages</Title>
          <Text size="sm" c="dimmed">
            Tous vos stages, année par année — validés, en cours et à venir.
          </Text>
        </Stack>

        {loading ? (
          <Stack gap="xl">
            <Skeleton height={92} radius="md" />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {Array.from({ length: 6 }).map((_, i) => <ParcoursStageCardSkeleton key={i} />)}
            </SimpleGrid>
          </Stack>
        ) : years.length === 0 ? (
          <Center py={80}>
            <Stack align="center" gap="md" maw={380}>
              <ThemeIcon size={64} radius="xl" variant="light" color="navy">
                <IconStethoscope style={{ width: rem(30), height: rem(30) }} stroke={1.5} />
              </ThemeIcon>
              <Stack align="center" gap={4}>
                <Text fw={600} ta="center">Aucune inscription</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Vos stages apparaîtront ici dès que votre inscription aura été enregistrée
                  par la scolarité.
                </Text>
              </Stack>
            </Stack>
          </Center>
        ) : (
          <>
            <AcademicYearRail
              years={years}
              value={selected?.registrationId ?? ''}
              onChange={selectYear}
            />

            {selected && (
              <Card padding="lg" radius="lg" withBorder shadow="sm">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                    <Stack gap={2} style={{ minWidth: 0, flex: '1 1 200px' }}>
                      <Group gap="xs" wrap="wrap">
                        <Text fw={700}>{selected.academicYearLabel}</Text>
                        {selected.isCurrent && (
                          <Badge size="xs" variant="light" color="sky" radius="sm">
                            Année en cours
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {selected.levelLabel ?? `Année ${selected.levelYear}`}
                      </Text>
                    </Stack>

                    <Group gap="sm" wrap="wrap">
                      {selected.academicGroupLabel && (
                        <Group gap={6} wrap="nowrap">
                          <IconUsersGroup
                            size={14} stroke={1.5} color="#94A3B8" style={{ flexShrink: 0 }}
                          />
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {selected.academicGroupLabel}
                          </Text>
                        </Group>
                      )}
                      <RegistrationBadge status={selected.registrationStatus} />
                    </Group>
                  </Group>

                  <ParcoursTotalsBar totals={selected.totals} />
                </Stack>
              </Card>
            )}

            {!selected?.isCurrent && (
              <Alert
                variant="light" color="gray" radius="md"
                icon={<IconInfoCircle size={16} stroke={1.5} />}
              >
                Vous consultez une année passée. Les stages et les notes affichés ici sont
                définitifs.
              </Alert>
            )}

            {/* Up to seven pills never fit a phone: they scroll on one line rather than wrapping
                into a three-row block that pushes the stages off the first screen. */}
            {visibleFilters.length > 0 && (
              <ScrollArea type="auto" offsetScrollbars scrollbarSize={6}>
                <Tabs
                  value={activeFilter}
                  onChange={(v) => v && setFilter(v as Filter)}
                  variant="pills"
                >
                  <Tabs.List style={{ flexWrap: 'nowrap' }}>
                    <Tabs.Tab value="all" style={{ whiteSpace: 'nowrap' }}>
                      <Group gap={6} wrap="nowrap">
                        <span>Tous</span>
                        <Badge size="xs" variant="light" color="navy" radius="xl">
                          {counts.all}
                        </Badge>
                      </Group>
                    </Tabs.Tab>
                    {visibleFilters.map((f) => (
                      <Tabs.Tab key={f} value={f} style={{ whiteSpace: 'nowrap' }}>
                        <Group gap={6} wrap="nowrap">
                          <span>{STAGE_STATE[f].shortLabel}</span>
                          <Badge size="xs" variant="light" color={STAGE_STATE[f].color} radius="xl">
                            {counts[f]}
                          </Badge>
                        </Group>
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs>
              </ScrollArea>
            )}

            {catalogLoading && activeFilter === 'unplanned' ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {Array.from({ length: 3 }).map((_, i) => <ParcoursStageCardSkeleton key={i} />)}
              </SimpleGrid>
            ) : isEmpty ? (
              <Center py={64}>
                <Stack align="center" gap="sm" maw={340}>
                  <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                    <IconStethoscope style={{ width: rem(26), height: rem(26) }} stroke={1.5} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed" ta="center">{EMPTY_MESSAGE[activeFilter]}</Text>
                </Stack>
              </Center>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {shownAttempts.map((attempt) => (
                  <ParcoursStageCard
                    key={attempt.assignmentId}
                    attempt={attempt}
                    onOpen={() => openStage(attempt.stageId, attempt.assignmentId)}
                  />
                ))}
                {shownUnplanned.map((stage) => (
                  <ParcoursStageCard
                    key={`catalog-${stage.id}`}
                    attempt={null}
                    fallback={{
                      name: stage.name,
                      coefficient: stage.coefficient,
                      levelLabel: stage.levelLabel,
                    }}
                    onOpen={() => openStage(stage.id)}
                  />
                ))}
              </SimpleGrid>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
