import {
  Badge,
  Card,
  Container,
  Divider,
  Group,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
  rem,
} from '@mantine/core';
import {
  IconActivityHeartbeat,
  IconCalendar,
  IconCalendarClock,
  IconChevronRight,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetCurrentStudentQuery,
  useGetStudentHistoryQuery,
  useGetStudentParcoursQuery,
} from '../api/studentApi';
import { StatCard } from '../components/StatCard';
import { CurrentStageCard } from '../components/CurrentStageCard';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ParcoursTotalsBar } from '../components/ParcoursTotalsBar';
import type { ParcoursStage, ParcoursYear } from '../types/parcours.types';
import { PATHS } from '../../../routes/paths';

/** Under way first, then what is coming — the order the student cares about today. */
const LIVE_ORDER: Record<string, number> = { Ongoing: 0, Planned: 1 };

function liveStagesOf(year: ParcoursYear | null): ParcoursStage[] {
  if (!year) return [];
  return year.stages
    .filter((s) => s.status === 'Ongoing' || s.status === 'Planned')
    .sort((a, b) => {
      const byStatus = (LIVE_ORDER[a.status] ?? 9) - (LIVE_ORDER[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      return (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999');
    })
    .slice(0, 3);
}

function YearRow({ year, onOpen }: { year: ParcoursYear; onOpen: () => void }) {
  return (
    <UnstyledButton
      onClick={onOpen}
      p="xs"
      style={{
        width: '100%',
        borderRadius: rem(8),
        border: '1px solid var(--mantine-color-gray-2)',
        background: year.isCurrent ? 'var(--mantine-color-navy-0)' : undefined,
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {year.academicYearLabel}
              </Text>
              {year.isCurrent && (
                <Badge size="xs" variant="light" color="sky" radius="sm">En cours</Badge>
              )}
            </Group>
            <Text
              size="xs" fw={700} style={{ flexShrink: 0 }}
              c={year.totals.total === 0 ? 'dimmed' : 'teal.7'}
            >
              {year.totals.total === 0 ? '—' : `${year.totals.validated}/${year.totals.total}`}
            </Text>
          </Group>

          <Text size="xs" c="dimmed" lineClamp={1}>
            {year.levelLabel ?? `Année ${year.levelYear}`}
          </Text>

          <ParcoursTotalsBar totals={year.totals} legend={false} size="sm" />
        </Stack>

        <IconChevronRight
          size={16} stroke={1.5} color="#94A3B8" style={{ flexShrink: 0 }}
        />
      </Group>
    </UnstyledButton>
  );
}

export default function DashboardHomePage() {
  const navigate = useNavigate();

  const { data: student, isLoading: studentLoading } = useGetCurrentStudentQuery();

  const { data: parcours, isLoading: parcoursLoading } = useGetStudentParcoursQuery(
    student?.id ?? '',
    { skip: !student?.id, refetchOnMountOrArgChange: true },
  );

  const { data: history = [], isLoading: historyLoading } = useGetStudentHistoryQuery(
    student?.id ?? '',
    { skip: !student?.id },
  );

  const years = parcours?.years ?? [];
  const currentYear = years.find((y) => y.isCurrent) ?? null;
  const totals = parcours?.totals;
  const loading = studentLoading || parcoursLoading;

  const greeting = student ? `Bonjour, ${student.firstName} 👋` : 'Bonjour 👋';

  // Carry the year through: landing on "Mes Stages" with no year selected would silently drop the
  // student back on the year in progress, which is not the one they just tapped.
  const openYear = (registrationId?: string) =>
    navigate(
      `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}` +
      (registrationId ? `?year=${registrationId}` : ''),
    );

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          {studentLoading ? (
            <Skeleton height={36} width={280} radius="md" />
          ) : (
            <Title order={1} fw={800}>{greeting}</Title>
          )}
          <Text c="dimmed" size="sm">Voici un aperçu de votre parcours de stage.</Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          <StatCard
            icon={IconCalendar}
            iconColor="sky"
            label="Année académique"
            value={student?.currentRegistration?.academicYear ?? '—'}
            sub={currentYear?.levelLabel ?? student?.currentRegistration?.level.label ?? undefined}
            loading={loading}
          />
          <StatCard
            icon={IconCircleCheck}
            iconColor="success"
            label="Stages validés"
            value={totals?.validated ?? '—'}
            sub={
              totals && totals.total > 0
                ? `sur ${totals.total} affecté${totals.total > 1 ? 's' : ''}` +
                  (totals.failed > 0 ? ` · ${totals.failed} non validé${totals.failed > 1 ? 's' : ''}` : '')
                : 'sur tout votre parcours'
            }
            loading={loading}
          />
          <StatCard
            icon={IconActivityHeartbeat}
            iconColor="navy"
            label="En cours"
            value={totals?.ongoing ?? '—'}
            sub={
              totals && totals.awaitingVerdict > 0
                ? `${totals.awaitingVerdict} en attente de note`
                : 'stages en cours'
            }
            loading={loading}
          />
          <StatCard
            icon={IconCalendarClock}
            iconColor="warning"
            label="À venir"
            value={totals?.planned ?? '—'}
            sub="stages planifiés, pas encore commencés"
            loading={loading}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <CurrentStageCard
            registration={student?.currentRegistration ?? null}
            liveStages={liveStagesOf(currentYear)}
            loading={loading}
          />

          <Card padding="lg" radius="lg" withBorder shadow="sm">
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap">
                <Text fw={600} size="sm">Ma progression</Text>
                {years.length > 0 && (
                  <Badge size="xs" variant="light" color="navy" radius="xl">
                    {years.length} année{years.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </Group>

              {loading ? (
                <Stack gap="md">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height={64} radius="md" />
                  ))}
                </Stack>
              ) : years.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Votre progression apparaîtra ici dès votre première inscription.
                </Text>
              ) : (
                <>
                  {totals && <ParcoursTotalsBar totals={totals} headline />}
                  <Divider />

                  {/* Every registration, never a truncated head: the card claims to be the whole
                      progression, and a 6th-year student holds more years than fit unscrolled. */}
                  <ScrollArea.Autosize mah={rem(320)} type="auto" offsetScrollbars>
                    <Stack gap="xs" pr={4}>
                      {years.map((year) => (
                        <YearRow
                          key={year.registrationId}
                          year={year}
                          onOpen={() => openYear(year.registrationId)}
                        />
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                </>
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        <ActivityTimeline
          events={history.slice(0, 4)}
          loading={historyLoading}
          onSeeAll={() => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.HISTORY}`)}
        />
      </Stack>
    </Container>
  );
}
