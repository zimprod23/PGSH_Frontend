import {
  Badge,
  Button,
  Card,
  Group,
  Progress,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  rem,
} from '@mantine/core';
import {
  IconBuildingHospital,
  IconCalendarEvent,
  IconClipboardCheck,
  IconRepeat,
  IconStar,
  IconStethoscope,
} from '@tabler/icons-react';
import type { ParcoursStage } from '../types/parcours.types';
import {
  STAGE_STATE,
  finalNoteOf,
  formatRotationSpan,
  stageStateOf,
  type StageState,
} from '../utils/stageState';
import { StageStateBadge } from './StageStateBadge';

interface Props {
  /** The attempt to render, or null for a stage of the programme with no assignment yet. */
  attempt: ParcoursStage | null;
  /** Used for the unplanned case, where there is no attempt to read them from. */
  fallback?: { name: string; coefficient: number; levelLabel?: string | null };
  onOpen: () => void;
}

export function ParcoursStageCard({ attempt, fallback, onOpen }: Props) {
  const state: StageState = attempt ? stageStateOf(attempt) : 'unplanned';
  const cfg = STAGE_STATE[state];

  const name = attempt?.stageName ?? fallback?.name ?? '';
  const coefficient = attempt?.coefficient ?? fallback?.coefficient ?? 1;
  const levelLabel = attempt?.stageLevelLabel ?? fallback?.levelLabel ?? null;

  const note = attempt ? finalNoteOf(attempt) : null;
  const span = attempt ? formatRotationSpan(attempt.startDate, attempt.endDate) : null;
  const rotations = attempt?.periodsTotal ?? 0;
  const progress = rotations > 0
    ? Math.round(((attempt?.periodsComplete ?? 0) / rotations) * 100)
    : 0;

  // A partial mean before every rotation is marked would read as a final note; say so instead.
  const hasPartialScore =
    attempt !== null && attempt.finalScore !== null && !attempt.allPeriodsEvaluated;

  return (
    <Card
      padding="lg"
      radius="lg"
      withBorder
      shadow="sm"
      style={{ borderLeft: `4px solid var(--mantine-color-${cfg.color}-5)`, height: '100%' }}
    >
      <Stack gap="sm" justify="space-between" style={{ height: '100%' }}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <ThemeIcon
                variant="light" color={cfg.color} size={32} radius="md"
                style={{ flexShrink: 0 }}
              >
                <IconStethoscope size={16} stroke={1.5} />
              </ThemeIcon>
              <Text fw={600} size="sm" lineClamp={2} style={{ minWidth: 0 }}>{name}</Text>
            </Group>
            <StageStateBadge state={state} />
          </Group>

          <Group gap={6}>
            {levelLabel && <Text size="xs" c="dimmed" lineClamp={1}>{levelLabel}</Text>}
            {attempt && attempt.attemptNumber > 1 && (
              <Tooltip
                label="Vous avez déjà suivi ce stage : ceci en est une nouvelle tentative."
                withArrow multiline w={220}
              >
                <Badge
                  size="xs" variant="light" color="grape" radius="sm"
                  leftSection={<IconRepeat size={10} stroke={2} />}
                >
                  Tentative {attempt.attemptNumber}
                </Badge>
              </Tooltip>
            )}
          </Group>

          <Group gap="lg">
            <Group gap={4}>
              <IconStar size={13} stroke={1.5} color="#94A3B8" />
              <Text size="xs" c="dimmed">Coeff. {coefficient}</Text>
            </Group>
            {note !== null ? (
              <Text size="sm" fw={700} c={note >= 10 ? 'teal.7' : 'red.7'}>
                {note.toFixed(2)} / 20
              </Text>
            ) : hasPartialScore ? (
              <Tooltip label="Toutes les rotations ne sont pas encore notées" withArrow>
                <Text size="xs" c="dimmed" fs="italic">Note provisoire</Text>
              </Tooltip>
            ) : null}
          </Group>

          {span && (
            <Group gap="xs" wrap="nowrap">
              <IconCalendarEvent size={13} stroke={1.5} color="#94A3B8" />
              <Text size="xs" c="dimmed" lineClamp={1}>{span}</Text>
            </Group>
          )}

          <Group gap="xs" wrap="nowrap">
            <IconBuildingHospital size={13} stroke={1.5} color="#94A3B8" />
            <Text size="xs" c="dimmed" lineClamp={1}>
              {attempt ? attempt.cohortLabel : 'Affectation à confirmer par la scolarité'}
            </Text>
          </Group>

          {rotations > 0 && (
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Rotations</Text>
                <Text size="xs" c="dimmed">
                  {attempt?.periodsComplete}/{rotations} terminées
                </Text>
              </Group>
              <Progress value={progress} color={cfg.color} size="xs" radius="xl" />
            </Stack>
          )}
        </Stack>

        <Group gap="xs" mt={4}>
          <Button
            variant="outline" color="navy" size="xs" radius="md"
            style={{ flex: 1 }}
            onClick={onOpen}
          >
            Détails
          </Button>
          <Button
            variant={note !== null ? 'filled' : 'light'}
            color={note !== null ? 'navy' : 'gray'}
            size="xs" radius="md"
            style={{ flex: 1 }}
            disabled={note === null}
            leftSection={note !== null ? <IconClipboardCheck size={13} stroke={1.5} /> : undefined}
            onClick={onOpen}
          >
            Évaluation
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export function ParcoursStageCardSkeleton() {
  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <Skeleton height={32} width={32} radius="md" />
          <Skeleton height={20} width={90} radius="xl" />
        </Group>
        <Skeleton height={16} width="80%" />
        <Skeleton height={11} width="45%" />
        <Skeleton height={11} width="60%" />
        <Skeleton height={rem(6)} radius="xl" />
        <Group gap="xs">
          <Skeleton height={30} radius="md" style={{ flex: 1 }} />
          <Skeleton height={30} radius="md" style={{ flex: 1 }} />
        </Group>
      </Stack>
    </Card>
  );
}
