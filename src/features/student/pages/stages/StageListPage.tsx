import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  rem,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconStethoscope,
  IconClock,
  IconStar,
  IconBuildingHospital,
  IconClipboardCheck,
  IconCalendarClock,
  IconActivityHeartbeat,
  IconCircleCheck,
  IconCircleX,
  IconHourglassEmpty,
  type IconProps,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetCurrentStudentQuery,
  useGetStagesQuery,
  useGetMyAssignmentsQuery,
} from '../../api/studentApi';
import type { StageSummaryResponse } from '../../types/stage.types';
import type { InternshipAssignmentSummary } from '../../types/student.types';
import type { InternshipStatus } from '../../../../common/types';
import { PATHS } from '../../../../routes/paths';

// ─── Status config ────────────────────────────────────────────────────────────

type StatusEntry = { label: string; color: string; Icon: ComponentType<IconProps> };

const STATUS_CFG: Record<InternshipStatus, StatusEntry> = {
  Planned:   { label: 'Planifié',  color: 'indigo', Icon: IconCalendarClock     },
  Ongoing:   { label: 'En cours',  color: 'blue',   Icon: IconActivityHeartbeat },
  Completed: { label: 'Terminé',   color: 'teal',   Icon: IconCircleCheck       },
  Evaluated: { label: 'Évalué',    color: 'violet', Icon: IconStar              },
  Validated: { label: 'Validé',    color: 'green',  Icon: IconCircleCheck       },
  Rejected:  { label: 'Rejeté',    color: 'red',    Icon: IconCircleX           },
};

const UNPLANNED_CFG: StatusEntry = { label: 'Non planifié', color: 'gray', Icon: IconHourglassEmpty };

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage, assignment }: {
  stage: StageSummaryResponse;
  assignment: InternshipAssignmentSummary | null;
}) {
  const navigate = useNavigate();
  const weeks = Math.round(stage.durationInDays / 7);

  const status = assignment?.status;
  const cfg    = status ? STATUS_CFG[status] : UNPLANNED_CFG;
  const StatusIcon = cfg.Icon;

  const hasEvaluation =
    assignment !== null &&
    (status === 'Evaluated' || status === 'Validated' || assignment.finalScore !== null);

  const goToDetail = () =>
    navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}/${stage.id}`);

  return (
    <Card
      padding="lg"
      radius="lg"
      withBorder
      shadow="sm"
      style={{ borderLeft: `4px solid var(--mantine-color-${cfg.color}-5)` }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon variant="light" color={cfg.color} size={32} radius="md" style={{ flexShrink: 0 }}>
              <IconStethoscope size={16} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm" lineClamp={2} style={{ minWidth: 0 }}>
              {stage.name}
            </Text>
          </Group>
          <Badge
            variant="light"
            color={cfg.color}
            radius="xl"
            size="sm"
            style={{ flexShrink: 0 }}
            leftSection={<StatusIcon size={12} stroke={2} />}
          >
            {cfg.label}
          </Badge>
        </Group>

        {stage.levelLabel && (
          <Text size="xs" c="dimmed" lineClamp={1}>{stage.levelLabel}</Text>
        )}

        <Group gap="lg">
          <Group gap={4}>
            <IconClock size={13} stroke={1.5} color="#94A3B8" />
            <Text size="xs" c="dimmed">{weeks} sem.</Text>
          </Group>
          <Group gap={4}>
            <IconStar size={13} stroke={1.5} color="#94A3B8" />
            <Text size="xs" c="dimmed">Coeff. {stage.coefficient}</Text>
          </Group>
          {assignment?.finalScore !== null && assignment?.finalScore !== undefined && (
            <Text size="xs" fw={700} c="navy.7">
              {assignment.finalScore.toFixed(2)} / 20
            </Text>
          )}
        </Group>

        <Group gap="xs">
          <IconBuildingHospital size={13} stroke={1.5} color="#94A3B8" />
          <Text size="xs" c="dimmed" lineClamp={1}>
            {assignment
              ? assignment.cohortLabel
              : 'Affectation à confirmer par la scolarité'}
          </Text>
        </Group>

        <Group gap="xs" mt={4}>
          <Button
            variant="outline"
            color="navy"
            size="xs"
            radius="md"
            style={{ flex: 1 }}
            onClick={goToDetail}
          >
            Détails
          </Button>
          <Button
            variant={hasEvaluation ? 'filled' : 'light'}
            color={hasEvaluation ? 'navy' : 'gray'}
            size="xs"
            radius="md"
            style={{ flex: 1 }}
            disabled={!hasEvaluation}
            leftSection={hasEvaluation ? <IconClipboardCheck size={13} stroke={1.5} /> : undefined}
            onClick={goToDetail}
          >
            Évaluation
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function StageCardSkeleton() {
  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <Skeleton height={32} width={32} radius="md" />
          <Skeleton height={20} width={70} radius="xl" />
        </Group>
        <Skeleton height={16} width="80%" />
        <Skeleton height={12} width="50%" />
        <Group gap="lg">
          <Skeleton height={12} width={60} />
          <Skeleton height={12} width={60} />
        </Group>
        <Group gap="xs">
          <Skeleton height={30} radius="md" style={{ flex: 1 }} />
          <Skeleton height={30} radius="md" style={{ flex: 1 }} />
        </Group>
      </Stack>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'unplanned' | 'planned' | 'ongoing' | 'completed';

export default function StageListPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data: student } = useGetCurrentStudentQuery();
  const levelId        = student?.currentRegistration?.level.id;
  const registrationId = student?.currentRegistration?.id;

  const { data: stagesPage, isLoading: stagesLoading } = useGetStagesQuery(
    { levelId, pageSize: 50 },
    { skip: !levelId },
  );
  const stages = stagesPage?.items ?? [];

  const { data: assignmentsPage } = useGetMyAssignmentsQuery(
    { registrationId: registrationId ?? '', pageSize: 100 },
    { skip: !registrationId },
  );

  const assignmentByStageId = useMemo<Map<number, InternshipAssignmentSummary>>(() => {
    const map = new Map<number, InternshipAssignmentSummary>();
    for (const a of assignmentsPage?.items ?? []) {
      map.set(a.stageId, a);
    }
    return map;
  }, [assignmentsPage]);

  const COMPLETED_STATUSES: InternshipStatus[] = ['Completed', 'Evaluated', 'Validated', 'Rejected'];

  const categorize = (stage: StageSummaryResponse): Filter => {
    const a = assignmentByStageId.get(stage.id);
    if (!a) return 'unplanned';
    if (a.status === 'Planned') return 'planned';
    if (a.status === 'Ongoing') return 'ongoing';
    if (COMPLETED_STATUSES.includes(a.status)) return 'completed';
    return 'unplanned';
  };

  const counts: Record<Filter, number> = {
    all:       stages.length,
    unplanned: stages.filter((s) => categorize(s) === 'unplanned').length,
    planned:   stages.filter((s) => categorize(s) === 'planned').length,
    ongoing:   stages.filter((s) => categorize(s) === 'ongoing').length,
    completed: stages.filter((s) => categorize(s) === 'completed').length,
  };

  const displayed =
    filter === 'all'
      ? stages
      : stages.filter((s) => categorize(s) === filter);

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Text fw={700} size="xl">Mes Stages</Text>
          <Text size="sm" c="dimmed">
            Suivez vos stages passés, en cours et à venir.
          </Text>
        </Stack>

        <Tabs
          value={filter}
          onChange={(v) => v && setFilter(v as Filter)}
          variant="pills"
        >
          <Tabs.List>
            <Tabs.Tab value="all">
              <Group gap={6}>
                <span>Tous</span>
                {!stagesLoading && (
                  <Badge size="xs" variant="light" color="navy" radius="xl">{counts.all}</Badge>
                )}
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="ongoing">
              <Group gap={6}>
                <span>En cours</span>
                <Badge size="xs" variant="light" color="blue" radius="xl">{counts.ongoing}</Badge>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="completed">
              <Group gap={6}>
                <span>Terminés</span>
                <Badge size="xs" variant="light" color="teal" radius="xl">{counts.completed}</Badge>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="planned">
              <Group gap={6}>
                <span>Planifiés</span>
                <Badge size="xs" variant="light" color="indigo" radius="xl">{counts.planned}</Badge>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="unplanned">
              <Group gap={6}>
                <span>Non planifiés</span>
                <Badge size="xs" variant="light" color="gray" radius="xl">{counts.unplanned}</Badge>
              </Group>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {stagesLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <StageCardSkeleton key={i} />
            ))}
          </SimpleGrid>
        ) : displayed.length === 0 ? (
          <Center py={80}>
            <Stack align="center" gap="md" maw={360}>
              <ThemeIcon size={64} radius="xl" variant="light" color="navy">
                <IconStethoscope style={{ width: rem(30), height: rem(30) }} stroke={1.5} />
              </ThemeIcon>
              <Stack align="center" gap={4}>
                <Text fw={600} ta="center">
                  {!levelId
                    ? 'Aucune inscription active'
                    : filter === 'ongoing'
                    ? 'Aucun stage en cours'
                    : filter === 'completed'
                    ? 'Aucun stage terminé'
                    : filter === 'planned'
                    ? 'Aucun stage planifié'
                    : filter === 'unplanned'
                    ? 'Aucun stage en attente de planification'
                    : 'Aucun stage disponible'}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  {!levelId
                    ? "Vos stages apparaîtront une fois votre inscription pour l'année en cours confirmée."
                    : filter === 'ongoing' || filter === 'completed'
                    ? "Ces données seront disponibles une fois vos affectations de stage confirmées."
                    : "Les stages de votre programme apparaîtront ici une fois votre niveau configuré."}
                </Text>
              </Stack>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {displayed.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage}
                assignment={assignmentByStageId.get(stage.id) ?? null}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
